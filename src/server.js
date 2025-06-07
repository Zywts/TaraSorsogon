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

// --- ADMIN ROUTES ---

// Get All Feedback (Admin Only)
app.get('/api/admin/feedback', adminMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch feedback.' });
    }
});

// Update Feedback Status (Admin Only)
app.put('/api/admin/feedback/:id', adminMiddleware, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('feedback')
            .update({ status })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ error: 'Feedback not found.' });

        res.status(200).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update feedback.' });
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

// --- CONTENT MANAGEMENT ROUTES (ADMIN ONLY) ---

// Add a new attraction
app.post('/api/attractions', adminMiddleware, async (req, res) => {
    const { name, description, imageUrl, location } = req.body;

    if (!name || !description || !imageUrl || !location) {
        return res.status(400).json({ error: 'Missing required fields for attraction.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('places')
            .insert([{ name, description, image_url: imageUrl, location, type: 'attraction' }]);
        
        if (error) throw error;
        res.status(201).json({ message: 'Attraction added successfully.', data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add attraction.' });
    }
});

// Add a new dining place
app.post('/api/dining', adminMiddleware, async (req, res) => {
    const { name, description, imageUrl, location, details } = req.body;

    if (!name || !description || !imageUrl || !location) {
        return res.status(400).json({ error: 'Missing required fields for dining place.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('places')
            .insert([{ 
                name, 
                description, 
                image_url: imageUrl, 
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
    const { name, description, imageUrl, location, category } = req.body;

    if (!name || !description || !imageUrl || !location || !category) {
        return res.status(400).json({ error: 'Missing required fields for place to stay.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('places')
            .insert([{ name, description, image_url: imageUrl, location, type: 'stay', details: { category } }]);
        
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