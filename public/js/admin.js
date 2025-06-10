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

    const addDiningForm = document.getElementById('add-dining-form');
    if (addDiningForm) {
        addDiningForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = {
                name: form.elements['dining-name'].value,
                description: form.elements['dining-description'].value,
                image_url: form.elements['dining-image-url'].value,
                location: form.elements['dining-location'].value,
                details: {
                    hours: form.elements['dining-hours'].value,
                    best_seller: form.elements['dining-best-seller'].value,
                    phone: form.elements['dining-phone'].value,
                    facebook: form.elements['dining-facebook'].value,
                    messenger: form.elements['dining-messenger'].value
                }
            };
            handleContentFormSubmit('/api/dining', formData, addDiningForm, 'dining');
        });
    }

    const addStayForm = document.getElementById('add-stay-form');
    if (addStayForm) {
        addStayForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                name: document.getElementById('stay-name').value,
                description: document.getElementById('stay-description').value,
                image_url: document.getElementById('stay-image-url').value,
                location: document.getElementById('stay-location').value,
                details: {
                    hours: document.getElementById('stay-hours').value,
                    phone: document.getElementById('stay-phone').value,
                    fb: document.getElementById('stay-facebook').value,
                    msg: document.getElementById('stay-messenger').value
                }
            };
            handleContentFormSubmit('/api/accommodations', formData, addStayForm, 'stay');
        });
    }

    const addEventForm = document.getElementById('add-event-form');
    if (addEventForm) {
        addEventForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = {
                name: form.elements['event-name'].value,
                description: form.elements['event-description'].value,
                start_date: form.elements['event-start-date'].value,
                image_url: form.elements['event-image-url'].value
            };
            handleContentFormSubmit('/api/events', formData, form, 'event');
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