document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        console.warn('Admin token not found. Some features may be disabled.');
        document.body.innerHTML = '<h1>Access Denied. Please <a href="/index.html">log in</a> as an admin.</h1>';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        document.body.innerHTML = '<h1>Access Denied. User data not found. Please <a href="/index.html">log in</a> again.</h1>';
        return;
    }

    // --- DOM Elements ---
    const sidebarLinks = document.querySelectorAll('.sidebar .nav-link');
    const views = document.querySelectorAll('.main-content .view');
    const reviewsTableBody = document.getElementById('reviews-table-body');
    const usersTableContainer = document.getElementById('users-table-container');
    const diningTableBody = document.getElementById('dining-table-body');
    const attractionsTableBody = document.getElementById('attractions-table-body');
    const staysTableBody = document.getElementById('stays-table-body');
    const eventsTableBody = document.getElementById('events-table-body');
    const addDiningFormContainer = document.getElementById('add-dining-form-container');
    const addAttractionFormContainer = document.getElementById('add-attraction-form-container');
    const addStayFormContainer = document.getElementById('add-stay-form-container');
    const addEventFormContainer = document.getElementById('add-event-form-container');
    const reportsView = document.getElementById('reports-view');
    const visitorCountEl = document.getElementById('visitor-count');
    const popularDestinationsList = document.getElementById('popular-destinations-list');
    const recycleBinView = document.getElementById('recycle-bin-view');
    const deletedPlacesTableBody = document.getElementById('deleted-places-table-body');
    const deletedEventsTableBody = document.getElementById('deleted-events-table-body');
    const deletedReviewsTableBody = document.getElementById('deleted-reviews-table-body');

    // --- PERMISSIONS ---
    const ROLES = {
        SUPER_ADMIN: 'superadmin',
        ADMIN: 'admin',
        CONTENT_MANAGER: 'content manager',
        EVENT_COORDINATOR: 'event coordinator'
    };

    const PERMISSIONS = {
        CAN_MANAGE_USERS: [ROLES.SUPER_ADMIN],
        CAN_MANAGE_REVIEWS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
        CAN_MANAGE_REPORTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
        CAN_MANAGE_RECYCLE_BIN: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
        CAN_ADD_CONTENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CONTENT_MANAGER],
        CAN_ADD_EVENTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EVENT_COORDINATOR],
        CAN_DELETE_CONTENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
        CAN_DELETE_EVENTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EVENT_COORDINATOR]
    };

    const hasPermission = (permission) => permission.includes(user.role);

    // Apply role-based UI changes
    const applyRolePermissions = () => {
        // Sidebar
        document.querySelector('[data-target="review-management-view"]').style.display = hasPermission(PERMISSIONS.CAN_MANAGE_REVIEWS) ? '' : 'none';
        document.querySelector('[data-target="user-management-view"]').style.display = hasPermission(PERMISSIONS.CAN_MANAGE_USERS) ? '' : 'none';
        document.querySelector('[data-target="reports-view"]').style.display = hasPermission(PERMISSIONS.CAN_MANAGE_REPORTS) ? '' : 'none';
        document.querySelector('[data-target="recycle-bin-view"]').style.display = hasPermission(PERMISSIONS.CAN_MANAGE_RECYCLE_BIN) ? '' : 'none';

        // Content Management Buttons
        document.querySelector('button[onclick="showAddForm(\'attraction\')"]').style.display = hasPermission(PERMISSIONS.CAN_ADD_CONTENT) ? '' : 'none';
        document.querySelector('button[onclick="showAddForm(\'dining\')"]').style.display = hasPermission(PERMISSIONS.CAN_ADD_CONTENT) ? '' : 'none';
        document.querySelector('button[onclick="showAddForm(\'stay\')"]').style.display = hasPermission(PERMISSIONS.CAN_ADD_CONTENT) ? '' : 'none';
        document.querySelector('button[onclick="showAddForm(\'event\')"]').style.display = hasPermission(PERMISSIONS.CAN_ADD_EVENTS) ? '' : 'none';
        
        // Content Management Tables
        if(document.getElementById('content-management-view').classList.contains('active')) {
            if (!hasPermission(PERMISSIONS.CAN_ADD_CONTENT)) {
                 document.getElementById('attractions-table-container').style.display = 'none';
                 document.getElementById('dining-table-container').style.display = 'none';
                 document.getElementById('stays-table-container').style.display = 'none';
            }
            if (!hasPermission(PERMISSIONS.CAN_ADD_EVENTS)) {
                 document.getElementById('events-table-container').style.display = 'none';
            }
        }
        
        // Default View
        if (!hasPermission(PERMISSIONS.CAN_MANAGE_REVIEWS)) {
            showView('content-management-view');
            loadAllContent();
            document.querySelector('[data-target="content-management-view"]').classList.add('active');
        } else {
            showView('review-management-view');
            loadReviews();
        }
    };

    // --- HELPERS ---
    const showView = (targetId) => {
        views.forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.add('active');
        }
    };

    // --- NAVIGATION ---
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.classList.contains('back-to-site')) {
                return;
            }
            e.preventDefault();
            const targetId = link.dataset.target;
            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            showView(targetId);
            if (targetId === 'review-management-view') loadReviews();
            else if (targetId === 'user-management-view') loadUsers();
            else if (targetId === 'content-management-view') loadAllContent();
            else if (targetId === 'reports-view') loadReports();
            else if (targetId === 'recycle-bin-view') loadRecycleBin();
        });
    });

    // --- DATA LOADERS ---
    const loadAndRenderContent = async (endpoint, tbody, renderer) => {
        tbody.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;
        try {
            const response = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Failed to fetch from ${endpoint}`);
            const data = await response.json();
            renderer(data, tbody);
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="3" class="error">${error.message}</td></tr>`;
        }
    };

    const loadReviews = async () => {
        reviewsTableBody.innerHTML = '<tr><td colspan="7">Loading reviews...</td></tr>';
        try {
            const response = await fetch('/api/admin/reviews', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch reviews.');
            const reviews = await response.json();
            renderReviews(reviews);
        } catch (error) {
            reviewsTableBody.innerHTML = `<tr><td colspan="7" class="error">${error.message}</td></tr>`;
        }
    };

    const loadUsers = async () => {
        usersTableContainer.innerHTML = '<p>Loading users...</p>';
        try {
            const response = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch users.');
            const users = await response.json();
            renderUsers(users);
        } catch (error) {
            usersTableContainer.innerHTML = `<p class="error">${error.message}</p>`;
        }
    };
    
    const loadAllContent = () => {
        loadAndRenderContent('/api/places/attractions', attractionsTableBody, renderPlaces);
        loadAndRenderContent('/api/places/dining', diningTableBody, renderPlaces);
        loadAndRenderContent('/api/places/stays', staysTableBody, renderStays);
        loadAndRenderContent('/api/events', eventsTableBody, renderEvents);
    };
    
    // --- RENDERERS ---
    const renderReviews = (reviews) => {
        reviewsTableBody.innerHTML = '';
        if (reviews.length === 0) {
            reviewsTableBody.innerHTML = '<tr><td colspan="7">No reviews found.</td></tr>';
            return;
        }
        reviews.forEach(review => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${review.places ? review.places.name : 'N/A'}</td>
                <td>${review.users ? review.users.username : 'Anonymous'}</td>
                <td class="rating">${'⭐'.repeat(review.rating)} (${review.rating})</td>
                <td>${review.title}</td>
                <td>${review.comment || ''}</td>
                <td>${new Date(review.visit_date).toLocaleDateString()}</td>
                <td><button class="delete-btn" data-id="${review.id}" data-type="review">Delete</button></td>
            `;
            reviewsTableBody.appendChild(row);
        });
    };

    const renderUsers = (users) => {
        usersTableContainer.innerHTML = '';
        if (users.length === 0) {
            usersTableContainer.innerHTML = '<p>No users found.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'users-table'; // Add a class for styling
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined On</th>
                    ${hasPermission(PERMISSIONS.CAN_MANAGE_USERS) ? '<th>Actions</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr data-user-id="${user.id}">
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>
                            ${hasPermission(PERMISSIONS.CAN_MANAGE_USERS) ? `
                            <select class="role-select" data-initial-role="${user.role}">
                                <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>Super Admin</option>
                                <option value="content manager" ${user.role === 'content manager' ? 'selected' : ''}>Content Manager</option>
                                <option value="event coordinator" ${user.role === 'event coordinator' ? 'selected' : ''}>Event Coordinator</option>
                            </select>
                            ` : user.role}
                        </td>
                        <td>${new Date(user.created_at).toLocaleDateString()}</td>
                        ${hasPermission(PERMISSIONS.CAN_MANAGE_USERS) ? `
                        <td>
                            <button class="save-role-btn" style="display:none;">Save</button>
                        </td>
                        ` : ''}
                    </tr>
                `).join('')}
            </tbody>`;
        
        usersTableContainer.appendChild(table);
    };

    const renderPlaces = (data, tbody) => {
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No items found.</td></tr>';
            return;
        }
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item.name}</td><td>${item.location}</td><td>${hasPermission(PERMISSIONS.CAN_DELETE_CONTENT) ? `<button class="delete-btn delete-place-btn" data-id="${item.id}">Delete</button>` : ''}</td>`;
            tbody.appendChild(row);
        });
    };
    
    const renderStays = (data, tbody) => {
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No items found.</td></tr>';
            return;
        }
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item.name}</td><td>${item.location}</td><td>${hasPermission(PERMISSIONS.CAN_DELETE_CONTENT) ? `<button class="delete-btn delete-place-btn" data-id="${item.id}">Delete</button>` : ''}</td>`;
            tbody.appendChild(row);
        });
    };

    const renderEvents = (data, tbody) => {
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No items found.</td></tr>';
            return;
        }
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item.name}</td><td>${new Date(item.start_date).toLocaleDateString()}</td><td>${hasPermission(PERMISSIONS.CAN_DELETE_EVENTS) ? `<button class="delete-btn delete-event-btn" data-id="${item.id}">Delete</button>` : ''}</td>`;
            tbody.appendChild(row);
        });
    };

    // --- FORM VISIBILITY ---
    window.showAddForm = (type) => {
        [addDiningFormContainer, addAttractionFormContainer, addStayFormContainer, addEventFormContainer].forEach(f => f.style.display = 'none');
        if (type === 'dining') addDiningFormContainer.style.display = 'block';
        else if (type === 'attraction') addAttractionFormContainer.style.display = 'block';
        else if (type === 'stay') addStayFormContainer.style.display = 'block';
        else if (type === 'event') addEventFormContainer.style.display = 'block';
    };
    window.hideAddForm = (type) => {
        if (type === 'dining') addDiningFormContainer.style.display = 'none';
        else if (type === 'attraction') addAttractionFormContainer.style.display = 'none';
        else if (type === 'stay') addStayFormContainer.style.display = 'none';
        else if (type === 'event') addEventFormContainer.style.display = 'none';
    };

    // --- DELETE LOGIC ---
    const handleDelete = async (e) => {
        const target = e.target;
        if (!target.classList.contains('delete-btn')) return;

        const id = target.dataset.id;
        let type = target.dataset.type;
        let endpoint;

        if (target.classList.contains('delete-place-btn')) {
            type = 'place';
            endpoint = `/api/places/${id}`;
        } else if (target.classList.contains('delete-event-btn')) {
            type = 'event';
            endpoint = `/api/events/${id}`;
        } else if (type === 'review') {
            endpoint = `/api/admin/reviews/${id}`;
        } else {
            return;
        }

        if (confirm(`Are you sure you want to move this ${type} to the recycle bin?`)) {
            try {
                const response = await fetch(endpoint, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || `Failed to delete ${type}.`);
                }
                const result = await response.json();
                alert(result.message);
                if (type === 'review') loadReviews();
                else loadAllContent();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    };
    document.querySelector('.main-content').addEventListener('click', handleDelete);
    
    // --- ROLE MANAGEMENT LOGIC ---
    if(hasPermission(PERMISSIONS.CAN_MANAGE_USERS)) {
        usersTableContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('role-select')) {
                const select = e.target;
                const row = select.closest('tr');
                const saveBtn = row.querySelector('.save-role-btn');
                const initialRole = select.dataset.initialRole;
                
                if (select.value !== initialRole) {
                    saveBtn.style.display = 'inline-block';
                } else {
                    saveBtn.style.display = 'none';
                }
            }
        });

        usersTableContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('save-role-btn')) {
                const btn = e.target;
                const row = btn.closest('tr');
                const userId = row.dataset.userId;
                const select = row.querySelector('.role-select');
                const newRole = select.value;
                const token = localStorage.getItem('accessToken');

                btn.disabled = true;
                btn.textContent = 'Saving...';

                try {
                    const response = await fetch(`/api/admin/users/${userId}/role`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ role: newRole })
                    });

                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error || 'Failed to update role.');
                    }

                    const result = await response.json();
                    alert(result.message);

                    // Update the UI to reflect the change
                    select.dataset.initialRole = newRole;
                    btn.style.display = 'none';

                } catch (error) {
                    alert(`Error: ${error.message}`);
                    // Optionally, revert the select to the initial role
                    select.value = select.dataset.initialRole;
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Save';
                }
            }
        });
    }

    // --- FORM SUBMISSION LOGIC ---

    const handleFormSubmit = async (endpoint, data, form, type) => {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `Failed to add ${type}.`);
            }

            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`);
            form.reset();
            hideAddForm(type);
            loadAllContent();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // --- DINING FORM ---
    const addDiningForm = document.getElementById('add-dining-form');
    if (addDiningForm) {
        addDiningForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const latitude = document.getElementById('dining-latitude').value;
            const longitude = document.getElementById('dining-longitude').value;

            if ((latitude && isNaN(parseFloat(latitude))) || (longitude && isNaN(parseFloat(longitude)))) {
                alert('Latitude and Longitude must be valid numbers.');
                return;
            }

            const data = {
                type: 'dining',
                name: document.getElementById('dining-name').value,
                description: document.getElementById('dining-description').value,
                image_url: document.getElementById('dining-image-url').value,
                location: document.getElementById('dining-location').value,
                latitude: latitude,
                longitude: longitude,
                details: {
                    cuisine: document.getElementById('dining-cuisine').value,
                    operating_hours: document.getElementById('dining-hours').value,
                    best_seller: document.getElementById('dining-best-seller').value,
                    phone: document.getElementById('dining-phone').value,
                    facebook_url: document.getElementById('dining-facebook').value,
                    messenger_url: document.getElementById('dining-messenger').value
                }
            };
            handleFormSubmit('/api/places', data, addDiningForm, 'dining');
        });
    }

    // --- ATTRACTION FORM ---
    const addAttractionForm = document.getElementById('add-attraction-form');
    if (addAttractionForm) {
        addAttractionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const latitude = document.getElementById('attraction-latitude').value;
            const longitude = document.getElementById('attraction-longitude').value;

            if ((latitude && isNaN(parseFloat(latitude))) || (longitude && isNaN(parseFloat(longitude)))) {
                alert('Latitude and Longitude must be valid numbers.');
                return;
            }

            const data = {
                type: 'attraction',
                name: document.getElementById('attraction-name').value,
                description: document.getElementById('attraction-description').value,
                image_url: document.getElementById('attraction-image-url').value,
                location: document.getElementById('attraction-location').value,
                latitude: latitude,
                longitude: longitude,
                details: {
                    operating_hours: document.getElementById('attraction-hours').value
                }
            };
            handleFormSubmit('/api/places', data, addAttractionForm, 'attraction');
        });
    }

    // --- STAY FORM ---
    const addStayForm = document.getElementById('add-stay-form');
    if (addStayForm) {
        addStayForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const latitude = document.getElementById('stay-latitude').value;
            const longitude = document.getElementById('stay-longitude').value;

            if ((latitude && isNaN(parseFloat(latitude))) || (longitude && isNaN(parseFloat(longitude)))) {
                alert('Latitude and Longitude must be valid numbers.');
                return;
            }

            const data = {
                type: 'accommodation',
                name: document.getElementById('stay-name').value,
                description: document.getElementById('stay-description').value,
                image_url: document.getElementById('stay-image-url').value,
                location: document.getElementById('stay-location').value,
                latitude: latitude,
                longitude: longitude,
                details: {
                    operating_hours: document.getElementById('stay-hours').value,
                    phone: document.getElementById('stay-phone').value,
                    facebook_url: document.getElementById('stay-facebook').value,
                    messenger_url: document.getElementById('stay-messenger').value
                }
            };
            handleFormSubmit('/api/places', data, addStayForm, 'stay');
        });
    }

    // --- EVENT FORM ---
    const addEventForm = document.getElementById('add-event-form');
    if (addEventForm) {
        addEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const eventData = {
                name: document.getElementById('event-name').value,
                description: document.getElementById('event-description').value,
                start_date: document.getElementById('event-start-date').value,
                image_url: document.getElementById('event-image-url').value,
            };

            try {
                const response = await fetch('/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(eventData)
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Failed to add event.');
                }

                alert('Event added successfully!');
                addEventForm.reset();
                hideAddForm('event');
                loadAllContent(); // Refresh the events list
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    // --- REPORTS ---
    const loadReports = async () => {
        visitorCountEl.textContent = 'Loading...';
        popularDestinationsList.innerHTML = '<li>Loading...</li>';
        try {
            const [vcRes, pdRes] = await Promise.all([
                fetch('/api/admin/reports/visitor-count', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/admin/reports/popular-destinations', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!vcRes.ok) throw new Error('Failed to fetch visitor count.');
            const vcData = await vcRes.json();
            visitorCountEl.textContent = vcData.count;

            if (!pdRes.ok) throw new Error('Failed to fetch popular destinations.');
            const pdData = await pdRes.json();
            popularDestinationsList.innerHTML = pdData.length > 0 ? pdData.map(d => `<li>${d.name} (${d.view_count} views)</li>`).join('') : '<li>No data available.</li>';
        } catch (error) {
            visitorCountEl.textContent = 'Error';
            popularDestinationsList.innerHTML = `<li>Error: ${error.message}</li>`;
        }
    };

    // --- RECYCLE BIN LOGIC ---
    const loadRecycleBin = async () => {
        [deletedPlacesTableBody, deletedEventsTableBody, deletedReviewsTableBody].forEach(tbody => tbody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`);
        try {
            const response = await fetch('/api/admin/deleted-items', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch deleted items.');
            const { places, events, reviews } = await response.json();
            renderDeletedPlaces(places);
            renderDeletedEvents(events);
            renderDeletedReviews(reviews);
        } catch (error) {
            console.error('Error loading recycle bin:', error);
            [deletedPlacesTableBody, deletedEventsTableBody, deletedReviewsTableBody].forEach(tbody => tbody.innerHTML = `<tr><td colspan="5" class="error">${error.message}</td></tr>`);
        }
    };

    const renderDeletedFactory = (tbody, columns, items, type) => {
        tbody.innerHTML = '';
        if (!items || items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columns}">No deleted items found.</td></tr>`;
                return;
        }
        items.forEach(item => {
            const row = document.createElement('tr');
            let cells = '';
            if (type === 'places') {
                cells = `<td>${item.name}</td><td>${item.type}</td>`;
            } else if (type === 'events') {
                cells = `<td>${item.name}</td><td>${new Date(item.start_date).toLocaleDateString()}</td>`;
            } else if (type === 'reviews') {
                cells = `<td>${item.places ? item.places.name : 'N/A'}</td><td>${item.users ? item.users.username : 'Anonymous'}</td><td>${item.title}</td>`;
            }
            row.innerHTML = `
                ${cells}
                <td>${new Date(item.deleted_at).toLocaleString()}</td>
                <td>
                    <button class="restore-btn" data-id="${item.id}" data-type="${type}">Restore</button>
                    <button class="delete-permanently-btn" data-id="${item.id}" data-type="${type}">Delete Permanently</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    };

    const renderDeletedPlaces = (places) => renderDeletedFactory(deletedPlacesTableBody, 4, places, 'places');
    const renderDeletedEvents = (events) => renderDeletedFactory(deletedEventsTableBody, 4, events, 'events');
    const renderDeletedReviews = (reviews) => renderDeletedFactory(deletedReviewsTableBody, 5, reviews, 'reviews');
    
    const handleRestore = async (e) => {
        const target = e.target;
        if (!target.classList.contains('restore-btn')) return;
        const { id, type } = target.dataset;
        if (confirm(`Are you sure you want to restore this item?`)) {
            try {
                const response = await fetch(`/api/admin/restore/${type}/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                if (!response.ok) throw new Error('Failed to restore item.');
                alert('Item restored successfully.');
                loadRecycleBin();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    };
    
    const handlePermanentDelete = async (e) => {
        const target = e.target;
        if (!target.classList.contains('delete-permanently-btn')) return;
        const { id, type } = target.dataset;
        if (confirm(`This action is IRREVERSIBLE. Are you sure you want to permanently delete this item?`)) {
            try {
                const response = await fetch(`/api/admin/permanently-delete/${type}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                if (!response.ok) throw new Error('Failed to permanently delete item.');
                alert('Item permanently deleted.');
                loadRecycleBin();
                } catch (error) {
                    alert(`Error: ${error.message}`);
            }
        }
    };

    recycleBinView.addEventListener('click', (e) => {
        handleRestore(e);
        handlePermanentDelete(e);
    });

    // --- INITIALIZATION ---
    const init = () => {
        applyRolePermissions();
        
        const initialView = document.querySelector('.sidebar .nav-link.active');
        if (initialView && initialView.style.display !== 'none') {
            const targetId = initialView.dataset.target;
            showView(targetId);
            if (targetId === 'review-management-view') loadReviews();
            else if (targetId === 'user-management-view') loadUsers();
            else if (targetId === 'content-management-view') loadAllContent();
            else if (targetId === 'reports-view') loadReports();
            else if (targetId === 'recycle-bin-view') loadRecycleBin();
        } else {
             // Fallback if the default active view is hidden for this role
            const firstVisibleLink = document.querySelector('.sidebar .nav-link:not([style*="display: none"])');
            if (firstVisibleLink) {
                 firstVisibleLink.click();
            }
        }
    };

    init();
}); 