document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user || user.role !== 'admin') {
        window.location.href = 'index.html';
        alert('Access Denied. You must be an admin to view this page.');
        return;
    }

    // --- DOM Elements ---
    const feedbackContainer = document.getElementById('feedback-table-container');
    const usersContainer = document.getElementById('users-table-container');
    const addDiningForm = document.getElementById('add-dining-form');
    const addDiningFormContainer = document.getElementById('add-dining-form-container');

    // --- Centralized API Request Handler ---
    const fetchWithAuth = async (url, options = {}) => {
        const currentToken = localStorage.getItem('accessToken');
        if (!currentToken) {
            handleAuthError();
            return { ok: false, status: 401 };
        }
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
            ...options.headers,
        };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            handleAuthError();
        }
        return response;
    };

    const handleAuthError = () => {
        alert('Your session has expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    };

    // --- Data Loading Functions ---
    const loadFeedback = async () => {
        try {
            const response = await fetchWithAuth('/api/admin/feedback');
            if (!response.ok) throw new Error('Failed to fetch feedback.');
            const feedbackItems = await response.json();
            renderFeedbackTable(feedbackItems);
        } catch (error) {
            feedbackContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    };

    const loadUsers = async () => {
        try {
            const response = await fetchWithAuth('/api/admin/users');
            if (!response.ok) throw new Error('Failed to fetch users.');
            const users = await response.json();
            renderUsersTable(users);
        } catch (error) {
            usersContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    };

    // --- Rendering Functions ---
    const renderFeedbackTable = (items) => {
        if (!items || items.length === 0) {
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

    const renderUsersTable = (users) => {
        if (!users || users.length === 0) {
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
    
    // --- Global Functions (for onclick attributes) ---
    window.updateFeedbackStatus = async (id, status) => {
        try {
            const response = await fetchWithAuth(`/api/admin/feedback/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update status.');
            }
            loadFeedback();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    window.showAddForm = (type) => {
        if (type === 'dining') {
            addDiningFormContainer.style.display = 'block';
        }
    };

    window.hideAddForm = (type) => {
        if (type === 'dining') {
            addDiningFormContainer.style.display = 'none';
        }
    };

    // --- Event Listeners ---
    addDiningForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = document.getElementById('dining-name').value;
        const description = document.getElementById('dining-description').value;
        const imageUrl = document.getElementById('dining-image-url').value;
        const location = document.getElementById('dining-location').value;
        const details = {
            cuisine: document.getElementById('dining-cuisine').value,
            hours: document.getElementById('dining-hours').value,
            best_seller: document.getElementById('dining-best-seller').value,
            phone: document.getElementById('dining-phone').value,
            facebook: document.getElementById('dining-facebook').value,
            messenger: document.getElementById('dining-messenger').value,
        };

        try {
            const response = await fetchWithAuth('/api/dining', {
                method: 'POST',
                body: JSON.stringify({ name, description, imageUrl, location, details })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to add dining place.');
            }

            alert('Dining place added successfully!');
            addDiningForm.reset();
            hideAddForm('dining');
        } catch (error) {
            console.error('Error adding dining place:', error);
            alert(`Error: ${error.message}`);
        }
    });

    // --- Initial Load ---
    loadFeedback();
    loadUsers();
}); 