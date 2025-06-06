document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user'));

    // Check if user is an admin
    if (!token || !user || user.role !== 'admin') {
        // Redirect non-admins to the homepage
        window.location.href = 'index.html';
        alert('Access Denied. You must be an admin to view this page.');
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const feedbackContainer = document.getElementById('feedback-table-container');
    const usersContainer = document.getElementById('users-table-container');

    // Fetch and display feedback
    const loadFeedback = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/admin/feedback', { headers });
            if (!response.ok) throw new Error('Failed to fetch feedback.');
            
            const feedbackItems = await response.json();
            renderFeedbackTable(feedbackItems);
        } catch (error) {
            feedbackContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    };

    // Fetch and display users
    const loadUsers = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/admin/users', { headers });
            if (!response.ok) throw new Error('Failed to fetch users.');

            const users = await response.json();
            renderUsersTable(users);
        } catch (error) {
            usersContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    };

    // Render the feedback table HTML
    const renderFeedbackTable = (items) => {
        if (items.length === 0) {
            feedbackContainer.innerHTML = '<p>No feedback submissions yet.</p>';
            return;
        }

        const table = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Rating</th>
                        <th>Comments</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr data-id="${item.id}">
                            <td>${item.name}</td>
                            <td>${item.email}</td>
                            <td>${item.rating || 'N/A'}</td>
                            <td>${item.comments}</td>
                            <td><span class="status-${item.status}">${item.status}</span></td>
                            <td class="actions">
                                ${item.status === 'pending' ? `
                                    <button class="btn-approve" onclick="updateFeedbackStatus(${item.id}, 'approved')">Approve</button>
                                    <button class="btn-reject" onclick="updateFeedbackStatus(${item.id}, 'rejected')">Reject</button>
                                ` : 'Processed'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        feedbackContainer.innerHTML = table;
    };

    // Render the users table HTML
    const renderUsersTable = (users) => {
        if (users.length === 0) {
            usersContainer.innerHTML = '<p>No users found.</p>';
            return;
        }
        const table = `
            <table>
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
            </table>
        `;
        usersContainer.innerHTML = table;
    };
    
    // Make function global to be accessible by onclick attributes
    window.updateFeedbackStatus = async (id, status) => {
        try {
            const response = await fetch(`http://localhost:3000/api/admin/feedback/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update status.');
            }
            
            // Refresh the feedback list to show the change
            loadFeedback();

        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // Initial data load
    loadFeedback();
    loadUsers();
}); 