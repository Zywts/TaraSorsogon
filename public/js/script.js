// This file has been updated to remove hardcoded event data and calendar logic,
// and instead, fetches event data dynamically from the server.

document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) { // Ensure elements exist
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });
    }

    // Scroll reveal animation
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (revealElements.length > 0) {
        const revealOnScroll = () => {
            const windowHeight = window.innerHeight;
            revealElements.forEach(el => {
                const elementTop = el.getBoundingClientRect().top;
                const elementVisible = windowHeight - elementTop > Math.min(el.offsetHeight, windowHeight * 0.2);
                if (elementVisible) {
                    el.classList.add('visible');
                }
            });
        };
        window.addEventListener('scroll', revealOnScroll);
        revealOnScroll(); // Initial check
    }

    // Dynamic Event Loading for Homepage
    async function loadUpcomingEvents() {
        const eventsListContainer = document.querySelector('.events-list');
        if (!eventsListContainer) {
            console.warn('Events list container not found on this page.');
            return;
        }

        try {
            const response = await fetch('/api/events');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const allEvents = await response.json();

            const now = new Date();
            const upcomingEvents = allEvents.filter(event => {
                const eventDate = new Date(event.end_date || event.start_date);
                return eventDate >= now;
            }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

            const eventsToShow = upcomingEvents.slice(0, 3);

            const existingEvents = eventsListContainer.querySelectorAll('.event-item-card, .no-events-message');
            existingEvents.forEach(el => el.remove());

            if (eventsToShow.length === 0) {
                const noEventsMessage = document.createElement('p');
                noEventsMessage.className = 'no-events-message';
                noEventsMessage.textContent = 'No upcoming events at the moment. Please check back later!';
                eventsListContainer.appendChild(noEventsMessage);
                return;
            }

            eventsToShow.forEach(event => {
                const eventCard = createEventItemCard(event);
                eventsListContainer.appendChild(eventCard);
            });

        } catch (error) {
            console.error('Failed to load upcoming events:', error);
            const errorMessage = document.createElement('p');
            errorMessage.className = 'no-events-message';
            errorMessage.textContent = 'Could not load events.';
            eventsListContainer.appendChild(errorMessage);
        }
    }

    function createEventItemCard(event) {
        const card = document.createElement('div');
        card.className = 'event-item-card';
        const eventDate = formatDateRange(event.start_date, event.end_date);
        card.innerHTML = `
            <div class="event-item-date">
                <span class="month">${new Date(event.start_date).toLocaleString('en-US', { month: 'short' })}</span>
                <span class="day">${new Date(event.start_date).getDate()}</span>
            </div>
            <div class="event-item-details">
                <h4>${event.name}</h4>
                <p><i class="far fa-calendar-alt"></i> ${eventDate}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
            </div>
            <a href="events.html?eventId=${event.id}" class="event-item-link" aria-label="View details for ${event.name}">
                <i class="fas fa-chevron-right"></i>
            </a>
        `;
        return card;
    }

    function formatDateRange(start, end) {
        if (!start) return 'TBD';
        const startDate = new Date(start);
        const options = { month: 'long', day: 'numeric' };
        if (!end || startDate.toDateString() === new Date(end).toDateString()) {
            return startDate.toLocaleDateString('en-US', options);
        }
        const endDate = new Date(end);
        return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
    }

    // Initial call to load events
    loadUpcomingEvents();

    // Modal Functionality
    // Get modal elements
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');

    // Get buttons that open modals
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');

    // Get close buttons for modals
    const closeLoginModalBtn = document.getElementById('close-login-modal');
    const closeSignupModalBtn = document.getElementById('close-signup-modal');

    // Get forms
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const heroSearchForm = document.querySelector('.search-form'); // Assuming this is your hero search form

    // Function to open a modal
    const openModal = (modal) => {
        if (modal) modal.style.display = 'block';
    };

    // Function to close a modal
    const closeModal = (modal) => {
        if (modal) modal.style.display = 'none';
    };

    // Event listeners for opening modals
    if (loginBtn) loginBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default anchor behavior
        openModal(loginModal);
    });
    if (signupBtn) signupBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default anchor behavior
        openModal(signupModal);
    });

    // Event listeners for closing modals with X button
    if (closeLoginModalBtn) closeLoginModalBtn.addEventListener('click', () => closeModal(loginModal));
    if (closeSignupModalBtn) closeSignupModalBtn.addEventListener('click', () => closeModal(signupModal));

    // Event listener for closing modals by clicking outside
    /* window.addEventListener('click', (event) => {
        if (event.target === loginModal) closeModal(loginModal);
        if (event.target === signupModal) closeModal(signupModal);
    }); */

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const messageEl = document.getElementById('login-message');
            messageEl.textContent = 'Logging in...';

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }
                messageEl.textContent = data.message;
                // Store token and user info in localStorage
                localStorage.setItem('accessToken', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Example: Close modal and update UI after successful login
                setTimeout(() => {
                    closeModal(loginModal);
                    updateUIAfterLogin();
                }, 1000);

            } catch (error) {
                messageEl.textContent = error.message;
            }
        });
    }

    // Signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signup-username').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;
            const messageEl = document.getElementById('signup-message');
            messageEl.textContent = ''; // Clear previous messages

            if (password !== confirmPassword) {
                messageEl.textContent = 'Passwords do not match!';
                return;
            }
            
            messageEl.textContent = 'Signing up...';

            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Signup failed');
                }
                messageEl.textContent = data.message;
                // Optionally close modal after a delay
                setTimeout(() => closeModal(signupModal), 2000);
            } catch (error) {
                messageEl.textContent = error.message;
            }
        });
    }

    // Hero Search form submission
    if (heroSearchForm) {
        heroSearchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const searchInput = heroSearchForm.querySelector(".search-input");
            const searchTerm = searchInput ? searchInput.value.trim() : "";
            if (searchTerm) {
                // Redirect to the search results page with the term as a query parameter
                window.location.href = `search.html?term=${encodeURIComponent(searchTerm)}`;
            }
        });
    }

    // Function to update UI after login
    function updateUIAfterLogin() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            const loginBtn = document.getElementById('login-btn');
            const signupBtn = document.getElementById('signup-btn');
            const navLinks = document.querySelector('.nav-links');

            // Hide login/signup buttons
            if(loginBtn) loginBtn.parentElement.style.display = 'none';
            if(signupBtn) signupBtn.parentElement.style.display = 'none';

            // Find the logout button's parent li to insert before it
            const emergencyLi = document.querySelector('a[href$="#emergency"]').parentElement;

            // Add welcome message
            const welcomeLi = document.createElement('li');
            welcomeLi.textContent = `Welcome, ${user.username}!`;
            
            // Add Admin Dashboard link if user is admin
            if (user.role === 'admin') {
                const adminLi = document.createElement('li');
                adminLi.innerHTML = `<a href="admin.html">Admin Dashboard</a>`;
                emergencyLi.parentElement.insertBefore(adminLi, emergencyLi.nextElementSibling);
            }

            // Add logout button
            const logoutLi = document.createElement('li');
            const logoutBtn = document.createElement('a');
            logoutBtn.href = '#';
            logoutBtn.id = 'logout-btn';
            logoutBtn.textContent = 'Logout';
            logoutLi.appendChild(logoutBtn);

            // Insert before the emergency link for proper ordering
            emergencyLi.parentElement.insertBefore(welcomeLi, emergencyLi.nextElementSibling);
            welcomeLi.parentElement.insertBefore(logoutLi, welcomeLi.nextElementSibling);

            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                // Ideally, you should also call a /api/logout endpoint on the backend
                window.location.reload(); // Simple way to reset state
            });
        }
    }

    // Check login status on page load
    updateUIAfterLogin();

    // "Coming Soon" link handler
    document.body.addEventListener('click', (e) => {
        // Find the closest ancestor anchor tag with the 'coming-soon' class
        const comingSoonLink = e.target.closest('a.coming-soon');
        if (comingSoonLink) {
            e.preventDefault(); // Prevent the link from navigating
            alert('This feature is coming soon!');
        }
    });

    // Handle Feedback Form
    const feedbackForm = document.getElementById('feedback-form');
    if(feedbackForm) {
        const stars = feedbackForm.querySelectorAll('.star-rating i');
        const ratingInput = feedbackForm.querySelector('#rating-value');
        let currentRating = 0;

        stars.forEach(star => {
            star.addEventListener('click', () => {
                currentRating = star.dataset.rating;
                ratingInput.value = currentRating;
                updateStars(currentRating);
            });
            star.addEventListener('mouseover', () => updateStars(star.dataset.rating));
        });

        feedbackForm.querySelector('.star-rating').addEventListener('mouseleave', () => updateStars(currentRating));

        function updateStars(rating) {
            stars.forEach(star => {
                star.classList.toggle('fas', star.dataset.rating <= rating);
                star.classList.toggle('far', star.dataset.rating > rating);
            });
        }
        
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('feedback-message');
            const formData = {
                name: feedbackForm.name.value,
                email: feedbackForm.email.value,
                rating: parseInt(ratingInput.value, 10),
                comments: feedbackForm.comments.value
            };
            
            messageEl.textContent = 'Submitting...';
            messageEl.style.color = 'inherit';

            try {
                const response = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to submit feedback.');
                }
                
                messageEl.textContent = data.message;
                messageEl.style.color = 'green';
                feedbackForm.reset();
                currentRating = 0;
                updateStars(0);

            } catch (error) {
                messageEl.textContent = error.message;
                messageEl.style.color = 'red';
            }
        });
    }
});

// Carousel functionality
class Carousel {
    constructor() {
        this.container = document.querySelector('.carousel');
        this.items = document.querySelectorAll('.carousel-item');
        this.prevBtn = document.querySelector('.carousel-btn.prev');
        this.nextBtn = document.querySelector('.carousel-btn.next');
        this.currentIndex = 0;
        this.totalItems = this.items.length;
        
        this.init();
    }

    init() {
        // Add event listeners for buttons
        this.prevBtn.addEventListener('click', () => this.slide('prev'));
        this.nextBtn.addEventListener('click', () => this.slide('next'));

        // Auto slide every 5 seconds
        setInterval(() => this.slide('next'), 5000);

        // Add touch support
        let touchStartX = 0;
        let touchEndX = 0;

        this.container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        this.container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 50) {
                this.slide('next');
            } else if (touchEndX - touchStartX > 50) {
                this.slide('prev');
            }
        });
    }

    slide(direction) {
        if (direction === 'next') {
            this.currentIndex = (this.currentIndex + 1) % this.totalItems;
        } else {
            this.currentIndex = (this.currentIndex - 1 + this.totalItems) % this.totalItems;
        }
        
        this.container.style.transform = `translateX(-${this.currentIndex * 100}%)`;
    }
}

// Initialize carousel if it exists
if (document.querySelector('.carousel')) {
    new Carousel();
}

// Map functionality
const SUPABASE_URL = 'https://fyzktgorhtbyxpwkrgoi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5emt0Z29yaHRieXhwd2tyZ29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMDE4OTcsImV4cCI6MjA2NDc3Nzg5N30.gSPpJPpL36mN-vbN-OXJoJElOGCje-Fo3Nq6oQLvp3U'; // Replace with your Supabase public anon key

// Initialize Supabase client
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let map;
let allMarkers = []; // To store all markers for filtering
const sorsogonBounds = [
    [12.53, 123.5], // Southwest coordinates
    [13.2, 124.25]  // Northeast coordinates
];

async function initMap() {
    if (document.getElementById('interactive-map')) {
        map = L.map('interactive-map').setView([12.85, 124.0], 10); // Center of Sorsogon

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            minZoom: 10,
        }).addTo(map);

        map.setMaxBounds(sorsogonBounds);
        map.on('drag', function() {
            map.panInsideBounds(sorsogonBounds, { animate: false });
        });

        // Fetch places from Supabase, create markers, and store them.
        await fetchAndCreateAllMarkers();

        // Setup filter buttons
        const filters = document.querySelectorAll('.map-filter');
        filters.forEach(filter => {
            filter.addEventListener('click', function() {
                filters.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                const type = this.getAttribute('data-type');
                filterMarkers(type);
            });
        });
    }
}

async function fetchAndCreateAllMarkers() {
    if (!supabase) {
        console.error("Supabase client is not initialized.");
        return;
    }

    try {
        let { data: places, error } = await supabase.from('places').select('*');

        if (error) {
            console.error('Error fetching places:', error);
            return;
        }

        if (places) {
             allMarkers = places.map(place => {
                // The position from the DB can be a stringified JSON, so we need to parse it.
                if (typeof place.position === 'string') {
                    try {
                        place.position = JSON.parse(place.position);
                    } catch (e) {
                        console.warn(`Could not parse position for place: ${place.name}`);
                        place.position = null;
                    }
                }
                return createMarker(place);
            }).filter(marker => marker !== null); // Filter out markers that couldn't be created
        }
        filterMarkers('all'); // Initial display of all markers
    } catch (err) {
        console.error("An error occurred while fetching and adding markers:", err);
    }
}

function filterMarkers(type) {
    allMarkers.forEach(marker => {
        // First, remove the marker from the map if it exists
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
        // Then, add it back to the map if it matches the filter type
        if (type === 'all' || marker.options.type === type) {
            marker.addTo(map);
        }
    });
}

function createMarker(location) {
    if (!location.position || typeof location.position.lat !== 'number' || typeof location.position.lon !== 'number') {
        console.warn('Invalid location data:', location);
        return null;
    }

    const marker = L.marker([location.position.lat, location.position.lon], { icon: getMarkerIcon(location.type) });

    // Create popup content
    let popupContent = `
        <div class="map-popup">
            ${location.image_url ? `<img src="${location.image_url}" alt="${location.name}" style="width:100%;height:auto;border-radius:5px;">` : ''}
            <h4>${location.name}</h4>
            <p>${location.description}</p>
        </div>
    `;

    marker.bindPopup(popupContent);
    marker.options.type = location.type; // Store type for filtering
    return marker;
}

function getMarkerIcon(type) {
    let innerIconClass = '';
    let color = '#3498db'; // Default blue for 'all' or others

    if (type === 'attraction') {
        innerIconClass = 'fas fa-hiking';
        color = '#3498db'; // Blue for attractions
    } else if (type === 'dining') {
        innerIconClass = 'fas fa-utensils';
        color = '#e74c3c'; // Red for dining
    } else if (type === 'accommodation') {
        innerIconClass = 'fas fa-hotel';
        color = '#2ecc71'; // Green for accommodation
    }

    let markerHtml;
    if (innerIconClass) {
        markerHtml = `<span class="fa-stack">
                        <i class="fas fa-map-marker fa-stack-2x" style="color: ${color};"></i>
                        <i class="${innerIconClass} fa-stack-1x fa-inverse"></i>
                      </span>`;
    } else {
        // Default marker for 'all' or other types
        markerHtml = `<i class="fas fa-map-marker fa-2x" style="color: ${color};"></i>`;
    }

    return L.divIcon({
        html: markerHtml,
        className: 'map-marker-icon',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -35]
    });
}

// Call initMap when the DOM is ready
// Ensure this runs after Leaflet library is loaded
if (document.getElementById('interactive-map')) {
    // Delay initMap slightly to ensure Leaflet is fully available,
    // especially since the script tag in HTML might not guarantee order with external lib loading
    if (typeof L !== 'undefined') {
        initMap();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
             // Fallback if Leaflet is loaded after DOMContentLoaded but before this script runs fully
            if (typeof L !== 'undefined') {
                initMap();
            } else {
                // If Leaflet is still not loaded, wait for window.onload
                window.onload = initMap;
            }
        });
    }
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
        }
        
        const href = this.getAttribute('href');
        if (href === '#' || href.length < 2) return; 

        try {
            const target = document.querySelector(href);
            if (target) {
                const navbar = document.querySelector('.navbar');
                const navbarHeight = navbar ? navbar.offsetHeight : 0;
                const offsetPadding = 20; // 20px of extra space
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight - offsetPadding;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        } catch (error) {
            // This can happen if the href is not a valid selector
            console.error("Error finding target for smooth scroll:", error);
        }
    });
});

// Function to reveal elements on scroll
const revealOnScroll = () => {
    const sections = document.querySelectorAll('.reveal-on-scroll');
    const windowHeight = window.innerHeight;

    sections.forEach(section => {
        const sectionTop = section.getBoundingClientRect().top;
        if (sectionTop < windowHeight - 100) { // Adjust 100 to control when the animation triggers
            section.classList.add('revealed');
        }
    });
};

window.addEventListener('scroll', revealOnScroll);
document.addEventListener('DOMContentLoaded', revealOnScroll); // Trigger on initial load for visible elements