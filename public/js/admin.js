document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link[data-target]');
    const views = document.querySelectorAll('.view');
    const reviewsTableBody = document.getElementById('reviews-table-body');
    const usersTableContainer = document.getElementById('users-table-container');
    const token = localStorage.getItem('accessToken');

    if (!token) {
        window.location.href = '/'; // Redirect to home if not logged in
        alert('You must be an admin to view this page.');
        return;
    }

    // Navigation logic
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');

            views.forEach(view => {
                view.classList.toggle('active', view.id === target);
            });

            navLinks.forEach(navLink => {
                navLink.classList.toggle('active', navLink === link);
            });

            if (target === 'review-management-view') {
                loadReviews();
            } else if (target === 'user-management-view') {
                loadUsers();
            } else if (target === 'content-management-view') {
                loadAllContent();
            } else if (target === 'reports-view') {
                loadReports();
            }
        });
    });

    // --- Review Management ---
    const loadReviews = async () => {
        reviewsTableBody.innerHTML = '<tr><td colspan="7">Loading reviews...</td></tr>';
        try {
            const response = await fetch('/api/admin/reviews', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch reviews.');

            const reviews = await response.json();
            renderReviews(reviews);
        } catch (error) {
            reviewsTableBody.innerHTML = `<tr><td colspan="7" class="error">${error.message}</td></tr>`;
        }
    };

    const renderReviews = (reviews) => {
        reviewsTableBody.innerHTML = '';
        if (reviews.length === 0) {
            reviewsTableBody.innerHTML = '<tr><td colspan="7">No reviews found.</td></tr>';
            return;
        }

        reviews.forEach(review => {
            const row = document.createElement('tr');
            const ratingStars = '⭐'.repeat(review.rating);
            row.innerHTML = `
                <td>${review.places ? review.places.name : 'N/A'}</td>
                <td>${review.users ? review.users.username : 'Anonymous'}</td>
                <td class="rating">${ratingStars} (${review.rating})</td>
                <td>${review.title}</td>
                <td>${review.comment || ''}</td>
                <td>${new Date(review.created_at).toLocaleDateString()}</td>
                <td><button class="delete-btn" data-id="${review.id}">Delete</button></td>
            `;
            reviewsTableBody.appendChild(row);
        });
    };

    // --- User Management ---
    const loadUsers = async () => {
        usersTableContainer.innerHTML = '<p>Loading users...</p>';
        try {
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch users.');
            const users = await response.json();
            renderUsers(users);
        } catch (error) {
            usersTableContainer.innerHTML = `<p class="error">${error.message}</p>`;
        }
    };

    const renderUsers = (users) => {
        usersTableContainer.innerHTML = '';
        if (users.length === 0) {
            usersTableContainer.innerHTML = '<p>No users found.</p>';
            return;
        }
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined On</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                        <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        usersTableContainer.appendChild(table);
    };

    // --- Content Management ---

    // Get table body elements
    const attractionsTableBody = document.getElementById('attractions-table-body');
    const diningTableBody = document.getElementById('dining-table-body');
    const staysTableBody = document.getElementById('stays-table-body');
    const eventsTableBody = document.getElementById('events-table-body');

    // Generic function to load and render content
    const loadAndRenderContent = async (endpoint, tbody, renderer) => {
        tbody.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;
        try {
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Failed to fetch from ${endpoint}`);
            const data = await response.json();
            renderer(data, tbody);
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="3" class="error">${error.message}</td></tr>`;
        }
    };

    // Renderer for places (Attractions, Dining)
    const renderPlaces = (data, tbody) => {
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No items found.</td></tr>';
            return;
        }
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.location}</td>
                <td><button class="delete-btn delete-place-btn" data-id="${item.id}">Delete</button></td>
            `;
            tbody.appendChild(row);
        });
    };
    
    // Renderer for stays
    const renderStays = (data, tbody) => {
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No items found.</td></tr>';
            return;
        }
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.location}</td>
                <td><button class="delete-btn delete-place-btn" data-id="${item.id}">Delete</button></td>
            `;
            tbody.appendChild(row);
        });
    };

    // Renderer for events
    const renderEvents = (data, tbody) => {
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No items found.</td></tr>';
            return;
        }
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${new Date(item.start_date).toLocaleDateString()}</td>
                <td><button class="delete-btn delete-event-btn" data-id="${item.id}">Delete</button></td>
            `;
            tbody.appendChild(row);
        });
    };

    const loadAllContent = () => {
        loadAndRenderContent('/api/places/attractions', attractionsTableBody, renderPlaces);
        loadAndRenderContent('/api/places/dining', diningTableBody, renderPlaces);
        loadAndRenderContent('/api/places/stays', staysTableBody, renderStays);
        loadAndRenderContent('/api/events', eventsTableBody, renderEvents);
    };

    const addDiningFormContainer = document.getElementById('add-dining-form-container');
    const addAttractionFormContainer = document.getElementById('add-attraction-form-container');
    const addStayFormContainer = document.getElementById('add-stay-form-container');
    const addEventFormContainer = document.getElementById('add-event-form-container');

    // Initialize Flatpickr for the event start date
    const eventStartDateInput = document.getElementById('event-start-date');
    if (eventStartDateInput) {
        flatpickr(eventStartDateInput, {
            altInput: true,
            altFormat: "F j, Y",
            dateFormat: "Y-m-d",
            minDate: "today" // Disables past dates
        });
    }

    window.showAddForm = (type) => {
        // Hide all forms first
        addDiningFormContainer.style.display = 'none';
        addAttractionFormContainer.style.display = 'none';
        addStayFormContainer.style.display = 'none';
        addEventFormContainer.style.display = 'none';
        
        if (type === 'dining') {
            addDiningFormContainer.style.display = 'block';
        } else if (type === 'attraction') {
            addAttractionFormContainer.style.display = 'block';
        } else if (type === 'stay') {
            addStayFormContainer.style.display = 'block';
        } else if (type === 'event') {
            addEventFormContainer.style.display = 'block';
        }
    };

    window.hideAddForm = (type) => {
        if (type === 'dining') {
            addDiningFormContainer.style.display = 'none';
        } else if (type === 'attraction') {
            addAttractionFormContainer.style.display = 'none';
        } else if (type === 'stay') {
            addStayFormContainer.style.display = 'none';
        } else if (type === 'event') {
            addEventFormContainer.style.display = 'none';
        }
    };
    
    // --- Form Submission Handlers ---
    const handleContentFormSubmit = async (endpoint, formData, formElement, formType) => {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || `Failed to add ${formType}.`);
            }
            alert(`${formType.charAt(0).toUpperCase() + formType.slice(1)} added successfully!`);
            formElement.reset();
            window.hideAddForm(formType);
        } catch (error) {
            console.error(`Error adding ${formType}:`, error);
            alert(`Error: ${error.message}`);
        }
    };

    // --- Form Submission Event Listeners ---
    if (document.getElementById('add-dining-form')) {
        document.getElementById('add-dining-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                name: document.getElementById('dining-name').value,
                description: document.getElementById('dining-description').value,
                image_url: document.getElementById('dining-image-url').value,
                location: document.getElementById('dining-location').value,
                type: 'dining',
                details: {
                    cuisine: document.getElementById('dining-cuisine').value,
                    hours: document.getElementById('dining-hours').value,
                    best_seller: document.getElementById('dining-best-seller').value,
                    phone: document.getElementById('dining-phone').value,
                    facebook: document.getElementById('dining-facebook').value,
                    messenger: document.getElementById('dining-messenger').value
                },
                position: {
                    latitude: parseFloat(document.getElementById('dining-latitude').value) || null,
                    longitude: parseFloat(document.getElementById('dining-longitude').value) || null
                }
            };
            handleContentFormSubmit('/api/dining', formData, document.getElementById('add-dining-form'), 'dining');
        });
    }

    if (document.getElementById('add-attraction-form')) {
        document.getElementById('add-attraction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                name: document.getElementById('attraction-name').value,
                description: document.getElementById('attraction-description').value,
                image_url: document.getElementById('attraction-image-url').value,
                location: document.getElementById('attraction-location').value,
                type: 'attraction',
                details: {
                    hours: document.getElementById('attraction-hours').value
                },
                position: {
                    latitude: parseFloat(document.getElementById('attraction-latitude').value) || null,
                    longitude: parseFloat(document.getElementById('attraction-longitude').value) || null
                }
            };
            handleContentFormSubmit('/api/attractions', formData, document.getElementById('add-attraction-form'), 'attraction');
        });
    }

    if (document.getElementById('add-stay-form')) {
        document.getElementById('add-stay-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                name: document.getElementById('stay-name').value,
                description: document.getElementById('stay-description').value,
                image_url: document.getElementById('stay-image-url').value,
                location: document.getElementById('stay-location').value,
                type: 'accommodation',
                details: {
                    hours: document.getElementById('stay-hours').value,
                    phone: document.getElementById('stay-phone').value,
                    facebook: document.getElementById('stay-facebook').value,
                    messenger: document.getElementById('stay-messenger').value
                },
                position: {
                    latitude: parseFloat(document.getElementById('stay-latitude').value) || null,
                    longitude: parseFloat(document.getElementById('stay-longitude').value) || null
                }
            };
            handleContentFormSubmit('/api/accommodations', formData, document.getElementById('add-stay-form'), 'stay');
        });
    }

    const addEventForm = document.getElementById('add-event-form');
    if (addEventForm) {
        addEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('event-name').value;
            const description = document.getElementById('event-description').value;
            const startDate = document.getElementById('event-start-date').value;
            const imageUrl = document.getElementById('event-image-url').value;

            // --- Date Validation ---
            const selectedDate = new Date(startDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of today for comparison

            if (selectedDate < today) {
                alert("You cannot select a past date for an event.");
                return;
            }
            // --- End of Date Validation ---

            const eventData = { name, description, start_date: startDate, image_url: imageUrl };

            await handleContentFormSubmit('/api/events', eventData, addEventForm, 'event');
        });
    }

    // --- Delete Logic ---
    const handleDelete = async (e) => {
        const isPlaceDelete = e.target.classList.contains('delete-place-btn');
        const isEventDelete = e.target.classList.contains('delete-event-btn');

        if (!isPlaceDelete && !isEventDelete) return;

        const id = e.target.dataset.id;
        const type = isPlaceDelete ? 'place' : 'event';
        const endpoint = isPlaceDelete ? `/api/places/${id}` : `/api/events/${id}`;

        if (confirm(`Are you sure you want to delete this ${type}?`)) {
            try {
                const response = await fetch(endpoint, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error(`Failed to delete ${type}.`);

                alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`);
                loadAllContent(); // Refresh all content lists
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    };
    
    // Event delegation for all delete buttons
    document.querySelector('.main-content').addEventListener('click', handleDelete);
    reviewsTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const reviewId = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this review?')) {
                try {
                    const response = await fetch(`/api/admin/reviews/${reviewId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Failed to delete review.');

                    alert('Review deleted successfully.');
                    loadReviews(); // Refresh the list
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        }
    });

    // --- Reports ---
    const loadReports = () => {
        loadVisitorCount();
        loadPopularDestinations();
    };

    const loadVisitorCount = async () => {
        const countEl = document.querySelector('#visitor-count');
        countEl.textContent = 'Loading...';
        try {
            const response = await fetch('/api/admin/reports/visitor-count', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch count.');
            const data = await response.json();
            countEl.textContent = data.count;
        } catch (error) {
            countEl.textContent = 'Error';
        }
    };

    const loadPopularDestinations = async () => {
        const popularEl = document.querySelector('#popular-destinations');
        popularEl.textContent = 'Loading...';
        try {
            const response = await fetch('/api/admin/reports/popular-destinations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch destinations.');
            const data = await response.json();
            if (data.length === 0) {
                popularEl.textContent = 'No data yet.';
                return;
            }
            popularEl.textContent = data.map(item => `${item.name} (${item.view_count} views)`).join(', ');
        } catch (error) {
            popularEl.textContent = 'Error';
        }
    };

    // Initial View Logic
    // Activate the Review Management view by default as it's the first tab
    loadReviews();
    // Pre-load users in the background so the tab is ready when clicked
    loadUsers();
    // Load content if the content tab is active on page load
    if (document.querySelector('.nav-link[data-target="content-management-view"]').classList.contains('active')) {
        loadAllContent();
    }
}); 