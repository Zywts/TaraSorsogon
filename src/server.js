require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const path = require('path');

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
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !userProfile) throw new Error('User profile not found.');

        if (userProfile.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required.' });
        }

        req.user = user; // Attach user to request object
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
            .order('start_date', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch events.' });
    }
});

// Add a new event (Admin only)
app.post('/api/events', adminMiddleware, async (req, res) => {
    // The adminMiddleware has already verified the user is an admin
    // and attached the user object to the request.
    const adminUserId = req.user.id; 

    const { 
        name, 
        description, 
        start_date, 
        end_date, 
        location, 
        place_id, 
        image_url 
    } = req.body;

    // Basic validation
    if (!name || !description || !start_date || !location) {
        return res.status(400).json({ error: 'Missing required event fields.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('events')
            .insert([{ 
                name, 
                description, 
                start_date, 
                end_date: end_date || null, 
                location, 
                place_id: place_id || null, 
                image_url: image_url || null,
                user_id: adminUserId // Log which admin created the event
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: 'Event created successfully!', event: data });

    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event.' });
    }
});

// --- ADMIN ROUTES ---

// Get all reviews for admin
app.get('/api/admin/reviews', adminMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select(`
                id,
                rating,
                title,
                created_at,
                place:places (name),
                user:users (username)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reviews.' });
    }
});

// Delete a review (Admin Only)
app.delete('/api/admin/reviews/:id', adminMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabaseAdmin
            .from('reviews')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ message: 'Review deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete review.' });
    }
});

// Get All Users (Admin Only)
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
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

// Delete a place (Admin only)
app.delete('/api/places/:id', adminMiddleware, async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: 'Place ID is required.' });
    }

    try {
        const { error } = await supabaseAdmin
            .from('places')
            .delete()
            .eq('id', id);

        if (error) {
            // Handle cases where the place might have dependent records,
            // e.g., reviews or events that reference it.
            if (error.code === '23503') { // foreign key violation
                return res.status(409).json({ error: 'Cannot delete this place because it is referenced by other records (e.g., events or reviews).' });
            }
            throw error;
        }

        res.status(200).json({ message: 'Place deleted successfully.' });

    } catch (error) {
        console.error('Error deleting place:', error);
        res.status(500).json({ error: 'Failed to delete place.' });
    }
});

// --- PUBLIC CONTENT ROUTES ---

// Get all dining places
app.get('/api/places/dining', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('places')
            .select('*')
            .eq('type', 'dining');

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dining places.' });
    }
});

// Get all attraction places
app.get('/api/places/attractions', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('places')
            .select('*')
            .eq('type', 'attraction');

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch attraction places.' });
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
                user:users(username)
            `)
            .eq('place_id', place_id)
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
    const { place_id, rating, visit_date, title, review_text } = req.body;
    const user_id = req.user.id;

    if (!place_id || !rating || !visit_date || !title || !review_text) {
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
                review_text,
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

// --- CONTENT MANAGEMENT ROUTES (ADMIN ONLY) ---

// Add a new attraction
app.post('/api/attractions', adminMiddleware, async (req, res) => {
    const { name, description, image_url, location, details } = req.body;

    if (!name || !description || !image_url || !location) {
        return res.status(400).json({ error: 'Missing required fields for attraction.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('places')
            .insert([{ 
                name, 
                description, 
                image_url, 
                location, 
                type: 'attraction',
                details
            }]);
        
        if (error) throw error;
        res.status(201).json({ message: 'Attraction added successfully.', data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add attraction.' });
    }
});

// Add a new dining place
app.post('/api/dining', adminMiddleware, async (req, res) => {
    const { name, description, image_url, location, details } = req.body;

    if (!name || !description || !image_url || !location) {
        return res.status(400).json({ error: 'Missing required fields for dining place.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('places')
            .insert([{ 
                name, 
                description, 
                image_url, 
                location, 
                type: 'dining', 
                details 
            }]);
        
        if (error) throw error;
        res.status(201).json({ message: 'Dining place added successfully.', data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add dining place.' });
    }
});

// Add a new place to stay
app.post('/api/stays', adminMiddleware, async (req, res) => {
    const { name, description, image_url, location, category } = req.body;

    if (!name || !description || !image_url || !location || !category) {
        return res.status(400).json({ error: 'Missing required fields for place to stay.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('places')
            .insert([{ name, description, image_url, location, type: 'stay', details: { category } }]);
        
        if (error) throw error;
        res.status(201).json({ message: 'Place to stay added successfully.', data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add place to stay.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});