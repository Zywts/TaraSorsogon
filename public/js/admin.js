document.addEventListener('DOMContentLoaded', () => {
    // Supabase client setup
    const SUPABASE_URL = 'https://drzakkxfdfxateyevspp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRya2FreHhmZGZ4YXRleWV2c3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMyNzQ3MDAsImV4cCI6MjAyODg1MDcwMH0.VFRa2Mh9b-J1O0w_1yJtV2p2W-mMyBf5x4_0zJ22GgU';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const adminWrapper = document.querySelector('.admin-wrapper');

    // Hide everything by default until user is verified
    adminWrapper.style.display = 'none';

    // Navigation links
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    const tabLinks = document.querySelectorAll('.content-tabs .tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const addEventForm = document.getElementById('add-event-form');
    const logoutBtn = document.getElementById('logout-btn');
    const attractionsTableBody = document.getElementById('attractions-table-body');


    // Check user auth state and role
    const checkUser = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error("Error getting session:", error);
            window.location.href = '/';
            return;
        }

        if (!session) {
            window.location.href = '/'; // Redirect to home if not logged in
            return;
        }

        // Check for admin role
        const isAdmin = await checkAdminRole(session.user);
        if (!isAdmin) {
            alert("Access Denied: You are not an administrator.");
            window.location.href = '/';
        } else {
             // Show admin content if authorized
            adminWrapper.style.display = 'flex';
            document.body.classList.add('admin-body');
            populatePlacesDropdown();
        }
    };
    
    async function checkAdminRole(user) {
        // Check the user's role from the metadata populated at signup/login.
        // The server-side adminMiddleware provides the definitive server-side check.
        // This client-side check is for UI purposes.
        return user && user.user_metadata && user.user_metadata.role === 'admin';
    }

    // Sidebar navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if(link.id === 'logout-btn') return;

            const targetId = link.getAttribute('data-target');
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                }
            });
        });
    });

    // Content management tabs
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-tab');

            tabLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetId) {
                    content.classList.add('active');
                }
            });

            // Load content when tab is clicked
            if (targetId === 'attractions') {
                loadAttractions();
            }
        });
    });

    // Load attractions into the table
    async function loadAttractions() {
        attractionsTableBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
        
        try {
            const response = await fetch('/api/places/attractions');
            if (!response.ok) throw new Error('Failed to fetch attractions.');
            
            const attractions = await response.json();

            if (attractions.length === 0) {
                attractionsTableBody.innerHTML = '<tr><td colspan="3">No attractions found.</td></tr>';
                return;
            }

            attractionsTableBody.innerHTML = ''; // Clear loading message
            attractions.forEach(attraction => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${attraction.name}</td>
                    <td>${attraction.location}</td>
                    <td>
                        <button class="btn-delete" data-id="${attraction.id}" data-name="${attraction.name}">Delete</button>
                    </td>
                `;
                attractionsTableBody.appendChild(row);
            });

        } catch (error) {
            attractionsTableBody.innerHTML = `<tr><td colspan="3" class="error">${error.message}</td></tr>`;
        }
    }

    // Handle delete button clicks using event delegation
    document.querySelector('.main-content').addEventListener('click', async (e) => {
        if (e.target.matches('.btn-delete')) {
            const placeId = e.target.dataset.id;
            const placeName = e.target.dataset.name;

            if (confirm(`Are you sure you want to delete "${placeName}"?`)) {
                const { data: { session } } = await supabase.auth.getSession();
                 if (!session) {
                    alert('Authentication error. Please log in again.');
                    return;
                }

                try {
                    const response = await fetch(`/api/places/${placeId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${session.accessToken}`
                        }
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.error || 'Failed to delete place.');
                    }

                    alert(`"${placeName}" was deleted successfully.`);
                    loadAttractions(); // Refresh the table

                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        }
    });

    // Populate Places Dropdown
    async function populatePlacesDropdown() {
        const { data: places, error } = await supabase.from('places').select('id, name');
        if (error) {
            console.error('Error fetching places:', error);
            return;
        }
        const select = document.getElementById('event-place');
        places.forEach(place => {
            const option = document.createElement('option');
            option.value = place.id;
            option.textContent = place.name;
            select.appendChild(option);
        });
    }

    // Handle Add Event form submission
    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formMsg = document.getElementById('add-event-message');

        const eventData = {
            name: document.getElementById('event-name').value.trim(),
            description: document.getElementById('event-description').value.trim(),
            start_date: document.getElementById('event-start-date').value,
            end_date: document.getElementById('event-end-date').value || null,
            location: document.getElementById('event-location').value.trim(),
            place_id: document.getElementById('event-place').value || null,
            image_url: document.getElementById('event-image-url').value.trim() || null,
        };

        if (!eventData.name || !eventData.description || !eventData.start_date || !eventData.location) {
             formMsg.textContent = 'Please fill out all required fields.';
             formMsg.className = 'form-message error';
             return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            formMsg.textContent = 'Authentication error. Please log in again.';
            formMsg.className = 'form-message error';
            return;
        }

        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`
                },
                body: JSON.stringify(eventData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'An unknown error occurred.');
            }

            formMsg.textContent = 'Event added successfully!';
            formMsg.className = 'form-message success';
            addEventForm.reset();
            // Optionally, refresh an events list or navigate away
        } catch (error) {
            formMsg.textContent = `Error: ${error.message}`;
            formMsg.className = 'form-message error';
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Error signing out:", error);
            alert("Failed to sign out.");
        } else {
            window.location.href = '/';
        }
    });

    // Initial check to secure the page
    checkUser();
}); 