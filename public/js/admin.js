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
            }
        });
    });

    // --- Review Management ---
    const loadReviews = async () => {
        reviewsTableBody.innerHTML = '<tr><td colspan="6">Loading reviews...</td></tr>';
        try {
            const response = await fetch('/api/admin/reviews', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch reviews.');

            const reviews = await response.json();
            renderReviews(reviews);
        } catch (error) {
            reviewsTableBody.innerHTML = `<tr><td colspan="6" class="error">${error.message}</td></tr>`;
        }
    };

    const renderReviews = (reviews) => {
        reviewsTableBody.innerHTML = '';
        if (reviews.length === 0) {
            reviewsTableBody.innerHTML = '<tr><td colspan="6">No reviews found.</td></tr>';
            return;
        }

        reviews.forEach(review => {
            const row = document.createElement('tr');
            const ratingStars = '⭐'.repeat(review.rating);
            row.innerHTML = `
                <td>${review.place ? review.place.name : 'N/A'}</td>
                <td>${review.user ? review.user.username : 'Anonymous'}</td>
                <td class="rating">${ratingStars} (${review.rating})</td>
                <td>${review.title}</td>
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
    const addDiningFormContainer = document.getElementById('add-dining-form-container');
    const addAttractionFormContainer = document.getElementById('add-attraction-form-container');
    const addStayFormContainer = document.getElementById('add-stay-form-container');
    const addEventFormContainer = document.getElementById('add-event-form-container');

    const loadPlaces = async () => {
        const selectElement = document.getElementById('event-place');
        selectElement.innerHTML = '<option value="">Loading places...</option>';
        try {
            const response = await fetch('/api/places', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch places.');

            const places = await response.json();
            
            selectElement.innerHTML = '<option value="">Select a place</option>';
            if (places.length > 0) {
                places.forEach(place => {
                    const option = document.createElement('option');
                    option.value = place.id;
                    option.textContent = place.name;
                    selectElement.appendChild(option);
                });
            } else {
                 selectElement.innerHTML = '<option value="">No places found. Add one first!</option>';
            }
        } catch (error) {
            console.error('Error loading places:', error);
            selectElement.innerHTML = `<option value="">Error loading places</option>`;
        }
    };

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
            loadPlaces(); // Load places when the event form is shown
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

    document.getElementById('add-dining-form').addEventListener('submit', (e) => {
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
        handleContentFormSubmit('/api/dining', formData, form, 'dining');
    });

    document.getElementById('add-attraction-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = {
            name: form.elements['attraction-name'].value,
            description: form.elements['attraction-description'].value,
            image_url: form.elements['attraction-image-url'].value,
            location: form.elements['attraction-location'].value,
            details: {
                hours: form.elements['attraction-hours'].value
            }
        };
        handleContentFormSubmit('/api/attractions', formData, form, 'attraction');
    });

    document.getElementById('add-stay-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = {
            name: form.elements['stay-name'].value,
            description: form.elements['stay-description'].value,
            image_url: form.elements['stay-image-url'].value,
            location: form.elements['stay-location'].value,
            category: form.elements['stay-category'].value
        };
        handleContentFormSubmit('/api/stays', formData, form, 'stay');
    });

    document.getElementById('add-event-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = {
            name: form.elements['event-name'].value,
            description: form.elements['event-description'].value,
            start_date: form.elements['event-start-date'].value,
            image_url: form.elements['event-image-url'].value,
            place_id: form.elements['event-place'].value
        };
        handleContentFormSubmit('/api/events', formData, form, 'event');
    });

    // Event delegation for delete buttons
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
}); 