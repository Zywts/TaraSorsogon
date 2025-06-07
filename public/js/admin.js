document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
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
    // Activate the dashboard view by default
    document.getElementById('dashboard-view').classList.add('active');
    document.querySelector('.nav-link[data-target="dashboard-view"]').classList.add('active');
    
    // Pre-load reviews in the background so it's ready if the user clicks the tab
    loadReviews();
}); 