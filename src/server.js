require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const path = require('path');
const cron = require('node-cron');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000; // Use port from environment or default to 3000

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey || !supabaseServiceKey) {
    console.error('Error: SUPABASE_URL, SUPABASE_KEY, and SUPABASE_SERVICE_KEY must be defined in your .env file');
    process.exit(1);
}

// This client uses the public ANON key for user-facing operations like auth
const supabase = createClient(supabaseUrl, supabaseKey);

// This client uses the SERVICE_ROLE key for admin operations that need to bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

const hasPermission = (userRole, requiredRoles) => requiredRoles.includes(userRole);

// --- AUTH & ADMIN MIDDLEWARE ---
const adminMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
        // First, verify the token with Supabase. This uses the public client.
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError) throw userError;

        // Now, use the ADMIN client to bypass RLS and check the role from the users table.
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('id, role')
            .eq('id', user.id)
            .single();

        if (profileError || !userProfile) throw new Error('User profile not found.');

        const allowedRoles = ['admin', 'superadmin', 'content manager', 'event coordinator'];
        if (!allowedRoles.includes(userProfile.role)) {
            return res.status(403).json({ error: 'Admin access required.' });
        }

        req.user = { ...user, role: userProfile.role }; // Attach user and role to request object
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

const superAdminMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
        // First, verify the token with Supabase. This uses the public client.
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError) throw userError;

        // Now, use the ADMIN client to bypass RLS and check the role from the users table.
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !userProfile) throw new Error('User profile not found.');

        // Allow 'superadmin'
        if (userProfile.role !== 'superadmin') {
            return res.status(403).json({ error: 'Super admin access required.' });
        }

        req.user = { ...user, role: userProfile.role }; // Attach user and role to request object
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// --- API ROUTES ---

// Expose public Supabase config
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY
    });
});

// Signup Route
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    try {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                username: username,
                role: 'user' // Default role
            }
        });

        if (error) throw error;

        // The trigger we created in SQL will handle inserting into the public.users table.
        res.status(201).json({ message: 'Signup successful!', user: data.user });

    } catch (error) {
        // Handle specific errors, e.g., user already exists
        if (error.message.includes('unique constraint')) {
            return res.status(409).json({ error: 'User with this email or username already exists.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // The user is authenticated. Now, get their profile from the `users` table.
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('username, role')
            .eq('id', data.user.id)
            .single();
        
        if (profileError) throw profileError;

        // Log the successful login for reporting
        await supabaseAdmin.from('logins').insert({ user_id: data.user.id });

        res.status(200).json({ 
            message: 'Login successful!',
            access_token: data.session.access_token,
            user: {
                id: data.user.id,
                email: data.user.email,
                username: userProfile.username,
                role: userProfile.role
            }
        });

    } catch (error) {
        res.status(401).json({ error: 'Invalid login credentials.' });
    }
});

// Search Route
app.get('/api/search', async (req, res) => {
    const { term } = req.query;

    if (!term) {
        return res.status(400).json({ error: 'Search term is required.' });
    }

    try {
        // Use 'ilike' for case-insensitive search
        const { data, error } = await supabase
            .from('places')
            .select('*')
            .is('deleted_at', null)
            .or(`name.ilike.%${term}%,description.ilike.%${term}%,type.ilike.%${term}%`);
        
        if (error) throw error;

        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search Suggestions Route (for dropdown)
app.get('/api/places/suggestions', async (req, res) => {
    const { term } = req.query;

    if (!term) {
        return res.status(400).json({ error: 'Search term is required.' });
    }

    try {
        const { data, error } = await supabase
            .from('places')
            .select('name, type')
            .is('deleted_at', null)
            .ilike('name', `%${term}%`)
            .limit(5); // Limit to 5 suggestions
        
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit Feedback Route
app.post('/api/feedback', async (req, res) => {
    const { name, email, rating, comments } = req.body;

    if (!name || !email || !comments) {
        return res.status(400).json({ error: 'Name, email, and comments are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('feedback')
            .insert([{ name, email, rating, comments, status: 'pending' }]);

        if (error) throw error;
        res.status(201).json({ message: 'Thank you for your feedback!' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit feedback.' });
    }
});

// Get all events
app.get('/api/events', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .is('deleted_at', null)
            .order('start_date', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch events.' });
    }
});

// Get all places for admin forms
app.get('/api/places', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to view places.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('places')
            .select('id, name')
            .is('deleted_at', null)
            .order('name', { ascending: true });
        
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch places.' });
    }
});

// Add a new event
app.post('/api/events', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin', 'event coordinator'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to add events.' });
    }

    const { name, description, start_date, image_url } = req.body;
    const user_id = req.user.id; 

    if (!name || !description || !start_date || !image_url) {
        return res.status(400).json({ error: 'Name, description, start date, and image URL are required.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('events')
            .insert([{ name, description, start_date, user_id, image_url }]);

        if (error) {
            console.error('Error inserting event:', error);
            throw error;
        }
        
        res.status(201).json({ message: 'Event added successfully!', event: data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add event.' });
    }
});

// --- ADMIN ROUTES ---

// Get all reviews for admin
app.get('/api/admin/reviews', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to view reviews.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select(`
                id,
                title,
                comment: review_text,
                rating,
                created_at,
                visit_date,
                places (name),
                users (username)
            `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reviews for admin:', error);
            throw error;
        }
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reviews.' });
    }
});

// Delete a review (Admin Only) - Soft delete
app.delete('/api/admin/reviews/:id', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to delete reviews.' });
    }

    const { id } = req.params;
    try {
        const { error } = await supabaseAdmin
            .from('reviews')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ message: 'Review moved to recycle bin.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete review.' });
    }
});

// Get All Users (Admin Only)
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin']; // Only superadmin and admin can view all users
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to view users.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('id, username, email, role, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// Update a user's role (Super Admin Only)
app.put('/api/admin/users/:userId/role', superAdminMiddleware, async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    const allowedRoles = ['user', 'admin', 'superadmin', 'content manager', 'event coordinator'];
    if (!role || !allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid or missing role specified.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .update({ role: role })
            .eq('id', userId)
            .select('id, username, email, role, created_at')
            .single();

        if (error) throw error;
        
        res.status(200).json({ message: 'User role updated successfully.', user: data });
    } catch (error) {
        if (error.code === 'PGRST204') { // PostgREST code for no rows found
            return res.status(404).json({ error: 'User not found.' });
        }
        res.status(500).json({ error: `Failed to update user role: ${error.message}` });
    }
});

// --- PUBLIC CONTENT ROUTES ---

// Get all dining places
app.get('/api/places/dining', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin', 'content manager'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to view dining places.' });
    }

    try {
        const { data, error } = await supabase
            .from('places')
            .select('*')
            .is('deleted_at', null)
            .eq('type', 'dining');

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dining places.' });
    }
});

// Get all attraction places
app.get('/api/places/attractions', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin', 'content manager'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to view attraction places.' });
    }

    try {
        const { data, error } = await supabase
            .from('places')
            .select('*')
            .is('deleted_at', null)
            .eq('type', 'attraction');

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch attraction places.' });
    }
});

// Get all stay places
app.get('/api/places/stays', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin', 'content manager'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to view stay places.' });
    }

    try {
        const { data, error } = await supabase
            .from('places')
            .select('*')
            .is('deleted_at', null)
            .eq('type', 'accommodation');

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch places to stay.' });
    }
});

// --- REVIEW ROUTES ---

// Get reviews for a specific place
app.get('/api/reviews/:place_id', async (req, res) => {
    const { place_id } = req.params;

    if (!place_id) {
        return res.status(400).json({ error: 'A place_id is required.' });
    }

    try {
        // Use the admin client to bypass RLS and join with the users table.
        // This is secure because this endpoint only reads and returns non-sensitive data.
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select(`
                *,
                comment: review_text,
                user:users(username)
            `)
            .eq('place_id', place_id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reviews with admin client:', error);
            throw error;
        }
        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: `Failed to fetch reviews: ${error.message}` });
    }
});

// Middleware to verify JWT token for authenticated routes
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication token required.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Authentication error.' });
    }
};

// Add a new review (requires authentication)
app.post('/api/reviews', authMiddleware, async (req, res) => {
    const { place_id, rating, visit_date, title, comment } = req.body;
    const user_id = req.user.id;

    if (!place_id || !rating || !visit_date || !title || !comment) {
        return res.status(400).json({ error: 'Missing required fields for review.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .insert([{
                user_id,
                place_id,
                rating,
                visit_date,
                title,
                review_text: comment,
                photo_urls: [] // Set empty array as photos are removed
            }])
            .select();
        
        if (error) {
            console.error('Error inserting review with admin client:', error);
            throw error;
        }
        res.status(201).json({ message: 'Review added successfully.', data: data[0] });
    } catch (error) {
        res.status(500).json({ error: `Failed to add review: ${error.message}` });
    }
});

// Delete a place (Admin Only) - Soft delete
app.delete('/api/places/:id', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to delete this content.' });
    }

    const { id } = req.params;
    try {
        const { error } = await supabaseAdmin
            .from('places')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ message: 'Place moved to recycle bin.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete place.' });
    }
});

// Delete an event (Admin Only) - Soft delete
app.delete('/api/events/:id', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin', 'event coordinator'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to delete this event.' });
    }

    const { id } = req.params;
    try {
        const { error } = await supabaseAdmin
            .from('events')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ message: 'Event moved to recycle bin.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete event.' });
    }
});

// --- CONTENT MANAGEMENT ROUTES (ADMIN ONLY) ---

// Add a new attraction
app.post('/api/attractions', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin', 'content manager'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to add attractions.' });
    }

    const { name, description, image_url, location, details, position } = req.body;
    if (!name || !description || !location) {
        return res.status(400).json({ error: 'Name, description, and location are required.' });
    }
    try {
        const { data, error } = await supabaseAdmin.from('places').insert([{ 
            name, 
            description, 
            image_url, 
            location, 
            type: 'attraction',
            details,
            position: `POINT(${position.longitude} ${position.latitude})`
        }]);
        if (error) throw error;
        res.status(201).json({ message: 'Attraction added successfully.', data: data[0] });
    } catch (error) {
        res.status(500).json({ error: `Failed to add attraction: ${error.message}` });
    }
});

// Add a new dining place
app.post('/api/dining', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin', 'content manager'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to add dining places.' });
    }

    const { name, description, image_url, location, details, position } = req.body;
    if (!name || !description || !location) {
        return res.status(400).json({ error: 'Name, description, and location are required.' });
    }
    try {
        const { data, error } = await supabaseAdmin.from('places').insert([{ 
            name, 
            description, 
            image_url, 
            location, 
            type: 'dining',
            details,
            position: `POINT(${position.longitude} ${position.latitude})`
        }]);
        if (error) throw error;
        res.status(201).json({ message: 'Dining place added successfully.', data: data[0] });
    } catch (error) {
        res.status(500).json({ error: `Failed to add dining place: ${error.message}` });
    }
});

// Add a new place to stay (replaces the old '/api/stays')
app.post('/api/accommodations', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin', 'content manager'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to add accommodations.' });
    }

    const { name, description, image_url, location, details, position } = req.body;
    if (!name || !description || !location) {
        return res.status(400).json({ error: 'Name, description, and location are required.' });
    }
    try {
        const { data, error } = await supabaseAdmin.from('places').insert([{ 
            name, 
            description, 
            image_url, 
            location, 
            type: 'accommodation',
            details,
            position: `POINT(${position.longitude} ${position.latitude})`
        }]);
        if (error) throw error;
        res.status(201).json({ message: 'Accommodation added successfully.', data: data[0] });
    } catch (error) {
        res.status(500).json({ error: `Failed to add accommodation: ${error.message}` });
    }
});

// Based on the JS, these endpoints seem to be missing. I'll add them.
const placeApiEndpoint = (type) => async (req, res) => {
    const requiredRoles = ['superadmin', 'admin', 'content manager'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to add this content.' });
    }

    const { name, description, image_url, location, details, category } = req.body;

    if (!name || !description || !image_url || !location) {
        return res.status(400).json({ error: 'Name, description, image_url, and location are required.' });
    }

    try {
        const insertData = { name, description, image_url, location, type };
        if (details) insertData.details = details;
        if (category) insertData.category = category;

        const { data, error } = await supabaseAdmin
            .from('places')
            .insert([insertData])
            .select();

        if (error) throw error;
        res.status(201).json({ message: `${type} added successfully!`, place: data });
    } catch (error) {
        res.status(500).json({ error: `Failed to add ${type}. Details: ${error.message}` });
    }
};

app.post('/api/dining', adminMiddleware, placeApiEndpoint('dining'));
app.post('/api/attractions', adminMiddleware, placeApiEndpoint('attraction'));
app.post('/api/stays', adminMiddleware, placeApiEndpoint('accommodation'));

// --- PUBLIC GET ROUTES ---

// Generic endpoint to fetch places by type
const getPlacesByType = (type) => async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('places')
            .select('*')
            .eq('type', type)
            .is('deleted_at', null);

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch ${type}: ${error.message}` });
    }
};

// Route to get all attractions
app.get('/api/attractions', getPlacesByType('attraction'));

// Route to get all dining places
app.get('/api/dining', getPlacesByType('dining'));

// Route to get all accommodations (stays)
app.get('/api/accommodations', getPlacesByType('accommodation'));

// Get all events
app.get('/api/events', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .is('deleted_at', null)
            .order('start_date', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch events: ${error.message}` });
    }
});

// --- RECYCLE BIN ROUTES (ADMIN ONLY) ---

// Get all soft-deleted items
app.get('/api/admin/deleted-items', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to view the recycle bin.' });
    }

    try {
        const [places, events, reviews] = await Promise.all([
            supabaseAdmin.from('places').select('*').not('deleted_at', 'is', null),
            supabaseAdmin.from('events').select('*').not('deleted_at', 'is', null),
            supabaseAdmin.from('reviews').select('*, places(name), users(username)').not('deleted_at', 'is', null)
        ]);

        if (places.error || events.error || reviews.error) {
            console.error(places.error || events.error || reviews.error);
            throw new Error('Failed to fetch some deleted items.');
        }

        res.status(200).json({
            places: places.data,
            events: events.data,
            reviews: reviews.data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Restore a soft-deleted item
app.post('/api/admin/restore/:item_type/:id', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to restore items.' });
    }

    const { item_type, id } = req.params;
    const valid_types = ['places', 'events', 'reviews'];

    if (!valid_types.includes(item_type)) {
        return res.status(400).json({ error: 'Invalid item type.' });
    }

    try {
        const { error } = await supabaseAdmin
            .from(item_type)
            .update({ deleted_at: null })
            .eq('id', id);
        
        if (error) throw error;
        res.status(200).json({ message: 'Item restored successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to restore item.' });
    }
});

// Permanently delete an item
app.delete('/api/admin/permanently-delete/:item_type/:id', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to permanently delete items.' });
    }

    const { item_type, id } = req.params;
    const valid_types = ['places', 'events', 'reviews'];

    if (!valid_types.includes(item_type)) {
        return res.status(400).json({ error: 'Invalid item type.' });
    }

    try {
        const { error } = await supabaseAdmin
            .from(item_type)
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ message: 'Item permanently deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to permanently delete item.' });
    }
});

// --- AUTOMATED TASKS ---

// Function to soft-delete events that have already passed
const deletePastEvents = async () => {
    console.log('Running scheduled task: Soft-deleting past events...');
    const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD

    try {
        // Fetches events where the start_date is before today and not already soft-deleted
        const { data: pastEvents, error: fetchError } = await supabaseAdmin
            .from('events')
            .select('id, name, start_date')
            .is('deleted_at', null)
            .lt('start_date', today);

        if (fetchError) {
            console.error('Error fetching past events:', fetchError.message);
            return;
        }

        if (pastEvents.length === 0) {
            console.log('No past events to delete.');
            return;
        }

        // Extracts the IDs of the past events
        const eventIdsToDelete = pastEvents.map(event => event.id);

        // Soft-deletes the past events from the database
        const { error: deleteError } = await supabaseAdmin
            .from('events')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', eventIdsToDelete);

        if (deleteError) {
            console.error('Error soft-deleting past events:', deleteError.message);
            return;
        }

        console.log(`Successfully soft-deleted ${pastEvents.length} past event(s).`);
    } catch (err) {
        console.error('An unexpected error occurred while soft-deleting past events:', err.message);
    }
};

// Schedule the task to run once every day at midnight
cron.schedule('0 0 * * *', deletePastEvents, {
    scheduled: true,
    timezone: "Asia/Manila"
});

// Immediately run the task once when the server starts
deletePastEvents();

// --- REPORTS API ---
app.get('/api/admin/reports/visitor-count', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to view reports.' });
    }

    try {
        const { count, error } = await supabaseAdmin
            .from('logins')
            .select('id', { count: 'exact', head: true });

        if (error) throw error;
        res.status(200).json({ count: count || 0 });
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch visitor count: ${error.message}` });
    }
});

app.get('/api/admin/reports/popular-destinations', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to view reports.' });
    }

    try {
        // This query counts views for each place, joins with the places table to get the name,
        // orders by the count descending, and limits to the top 5.
        const { data, error } = await supabaseAdmin
            .rpc('get_popular_places', { limit_count: 5 });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch popular destinations: ${error.message}` });
    }
});

app.post('/api/places/view', authMiddleware, async (req, res) => {
    const { place_id } = req.body;
    const user_id = req.user.id;

    if (!place_id) {
        return res.status(400).json({ error: 'place_id is required.' });
    }

    try {
        await supabaseAdmin
            .from('place_views')
            .insert({ place_id: place_id, user_id: user_id });
        res.status(201).json({ message: 'View logged successfully.' });
    } catch (error) {
        res.status(500).json({ error: `Failed to log view: ${error.message}` });
    }
});

// Create a new place (attraction, dining, stay) - ADMIN ONLY
app.post('/api/places', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin', 'content manager'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to add this content.' });
    }

    const { type, name, description, image_url, location, latitude, longitude, details } = req.body;

    if (!type || !name || !description || !location) {
        return res.status(400).json({ error: 'Missing required fields: type, name, description, location.' });
    }

    if (!['attraction', 'dining', 'accommodation'].includes(type)) {
        return res.status(400).json({ error: 'Invalid place type.' });
    }

    try {
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        const { data, error } = await supabaseAdmin
            .from('places')
            .insert([{
                type,
                name,
                description,
                image_url,
                location,
                position: {
                    lat: isNaN(lat) ? null : lat,
                    lon: isNaN(lon) ? null : lon
                },
                details: details || {}
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating place:', error);
        res.status(500).json({ error: 'Failed to create place.' });
    }
});

// --- REPORTING & ANALYTICS ---
app.get('/api/admin/reports/summary', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to view reports.' });
    }

    try {
        const { data: report, error } = await supabaseAdmin.rpc('get_admin_summary');
        if (error) throw error;
        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch report: ${error.message}` });
    }
});

// --- RECYCLE BIN ---
app.get('/api/admin/recycle-bin/:type', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to access the recycle bin.' });
    }

    const { type } = req.params;
    const allowedTypes = ['places', 'events', 'reviews'];

    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid recycle bin type.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from(type)
            .select('*')
            .not('deleted_at', 'is', null);

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch ${type}: ${error.message}` });
    }
});

app.post('/api/admin/recycle-bin/restore/:type/:id', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to restore items.' });
    }

    const { type, id } = req.params;
    const allowedTypes = ['places', 'events', 'reviews'];

    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid recycle bin type.' });
    }

    try {
        const { error } = await supabaseAdmin
            .from(type)
            .update({ deleted_at: null })
            .eq('id', id);
        
        if (error) throw error;
        res.status(200).json({ message: 'Item restored successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to restore item.' });
    }
});

app.delete('/api/admin/recycle-bin/delete/:type/:id', adminMiddleware, async (req, res) => {
    const requiredRoles = ['superadmin', 'admin'];
    if (!hasPermission(req.user.role, requiredRoles)) {
        return res.status(403).json({ error: 'You are not authorized to permanently delete items.' });
    }

    const { type, id } = req.params;
    const allowedTypes = ['places', 'events', 'reviews'];

    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid recycle bin type.' });
    }

    try {
        const { error } = await supabaseAdmin
            .from(type)
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ message: 'Item permanently deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to permanently delete item.' });
    }
});

// Fallback route for single-page application (SPA) behavior if needed
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
}); 