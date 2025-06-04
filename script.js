// Navigation
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

    // Calendar functionality
    const calendarElement = document.getElementById('calendar');
    let calendarInstance = null; // To store the flatpickr instance

    if (calendarElement) {
        const eventDates = events.map(event => event.date);

        calendarInstance = flatpickr(calendarElement, {
            inline: true,
            mode: 'single',
            dateFormat: 'Y-m-d',
            onDayCreate: function(dObj, dStr, fp, dayElem){
                const dateString = fp.formatDate(dayElem.dateObj, "Y-m-d");
                if (events.some(event => event.date === dateString)) {
                    dayElem.classList.add("event-day");
                }
                events.forEach(event => {
                    if (event.endDate && dayElem.dateObj >= fp.parseDate(event.date, "Y-m-d") && dayElem.dateObj <= fp.parseDate(event.endDate, "Y-m-d")) {
                        dayElem.classList.add("event-in-range");
                    }
                });
            },
            onChange: function(selectedDates, dateStr, instance) {
                updateEventsList(selectedDates[0], instance);
            }
        });

        if (calendarInstance) {
             updateEventsList(null, calendarInstance);
        }
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

// Updated Events Data
const events = [
    {
        date: '2025-06-08',
        endDate: '2025-06-08',
        title: 'Grand Santacruzan 2025',
        description: 'A traditional religious-historical parade marking the culmination of Flores de Mayo, featuring beautifully adorned participants in a grand procession.',
        displayDate: 'June 8, 2025'
    },
    {
        date: '2025-06-19',
        endDate: '2025-06-29',
        title: 'Pili Festival',
        description: 'Sorsogon City\'s major festival honoring the Pili tree and its significance to the region. The celebration includes street dancing, cooking competitions, fireworks displays, and various cultural activities',
        displayDate: 'June 19-29, 2025'
    },
    {
        date: '2024-05-01',
        endDate: '2024-05-05',
        title: 'Parau Festival',
        description: 'Traditional boat racing festival in Donsol showcasing local maritime culture and seafaring traditions.',
        displayDate: 'May 1-5, 2024'
    },
    {
        date: '2024-07-10',
        endDate: '2024-07-12',
        title: 'Coastal Art Workshop',
        description: 'Join us for a 3-day art workshop focusing on Sorsogon\'s beautiful coastal landscapes. Materials provided.',
        displayDate: 'July 10-12, 2024'
    }
];

function updateEventsList(selectedDate, fpInstance) {
    const eventsList = document.querySelector('.events-list');
    if (!eventsList || !fpInstance) return;

    let buttonHtml = ''; // Initialize button HTML as empty
    if (selectedDate) {
        // Only create button HTML if a specific date is selected
        buttonHtml = '<button id="all-events-btn" class="all-events-button">Reset to All Events</button>';
    }

    let listTitle = '<h3>Upcoming Events</h3>';
    let html = '';
    let filteredEvents = [];
    const today = fpInstance.formatDate(new Date(), "Y-m-d");

    if (selectedDate) {
        const formattedSelectedDate = fpInstance.formatDate(selectedDate, "Y-m-d");
        listTitle = `<h3>Events on ${fpInstance.formatDate(selectedDate, "F j, Y")}</h3>`;
        filteredEvents = events.filter(event => {
            const eventStart = event.date;
            const eventEnd = event.endDate || event.date;
            return formattedSelectedDate >= eventStart && formattedSelectedDate <= eventEnd;
        });
    } else {
        listTitle = '<h3>Upcoming Events</h3>'; // Ensure title is correct for all upcoming
        filteredEvents = events.filter(event => (event.endDate || event.date) >= today)
                               .sort((a,b) => new Date(a.date) - new Date(b.date));
    }

    if (filteredEvents.length > 0) {
        filteredEvents.forEach(event => {
            html += `
                <div class="event-item">
                    <h4>${event.title}</h4>
                    <p><strong>Date:</strong> ${event.displayDate}</p>
                    <p>${event.description}</p>
                </div>
            `;
        });
    } else {
        if (selectedDate) {
            html = '<p>No events scheduled for this date.</p>';
        } else {
            html = '<p>No upcoming events found. Please select a date on the calendar to see details.</p>';
        }
    }
    // Prepend buttonHtml (it will be empty if no date selected)
    eventsList.innerHTML = buttonHtml + listTitle + html;

    // If the button was added (i.e., a date was selected), attach its event listener
    if (selectedDate) {
        const newAllEventsBtn = document.getElementById('all-events-btn');
        if (newAllEventsBtn) {
            newAllEventsBtn.addEventListener('click', () => {
                fpInstance.clear(); // Clear selected date in Flatpickr
                updateEventsList(null, fpInstance); // Refresh list (button will not be created this time)
            });
        }
    }
}

// Feedback form
const feedbackForm = document.getElementById('feedback-form');
if (feedbackForm) {
    const stars = document.querySelectorAll('.star-rating i');
    let rating = 0;

    // Star rating functionality
    stars.forEach(star => {
        star.addEventListener('mouseover', function() {
            const rating = this.dataset.rating;
            updateStars(rating);
        });

        star.addEventListener('click', function() {
            rating = this.dataset.rating;
            updateStars(rating);
        });
    });

    document.querySelector('.star-rating').addEventListener('mouseleave', () => {
        updateStars(rating);
    });

    function updateStars(value) {
        stars.forEach(star => {
            const starRating = star.dataset.rating;
            star.classList.toggle('fas', starRating <= value);
            star.classList.toggle('far', starRating > value);
        });
    }

    // Form submission
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: feedbackForm.name.value,
            email: feedbackForm.email.value,
            rating: rating,
            comments: feedbackForm.comments.value
        };

        // Here you would typically send the data to your backend
        console.log('Feedback submitted:', formData);
        
        // Clear form
        feedbackForm.reset();
        rating = 0;
        updateStars(0);
        
        alert('Thank you for your feedback!');
    });
}

// Map functionality
const locations = {
    attractions: [
        {
            name: 'Bulusan Lake',
            position: { lat: 12.7527, lng: 124.1208 },
            type: 'attractions',
            description: 'A serene crater lake surrounded by lush forests'
        },
        {
            name: 'Rizal Beach',
            position: { lat: 12.9747, lng: 124.0070 },
            type: 'attractions',
            description: 'Beautiful beach with crystal clear waters'
        },
        {
            name: 'Barcelona Church',
            position: { lat: 12.8736, lng: 124.1444 },
            type: 'attractions',
            description: 'Historic church with Spanish colonial architecture'
        }
    ],
    dining: [
        {
            name: 'First Colonial Grill',
            position: { lat: 12.9697, lng: 124.0109 },
            type: 'dining',
            description: 'Famous for Bicolano cuisine and unique ice cream flavors'
        },
        {
            name: 'Balay Cena Una',
            position: { lat: 12.9723, lng: 124.0134 },
            type: 'dining',
            description: 'Traditional Bicolano restaurant in a heritage house'
        }
    ],
    accommodation: [
        {
            name: 'Siama Hotel',
            position: { lat: 12.9738, lng: 124.0147 },
            type: 'accommodation',
            description: 'Modern native-inspired luxury hotel'
        },
        {
            name: 'Bulusan Lake Resort',
            position: { lat: 12.7529, lng: 124.1210 },
            type: 'accommodation',
            description: 'Peaceful lakeside accommodation'
        }
    ]
};

let map;
let markers = [];

function initMap() {
    const sorsogonCenter = [12.8700, 124.0000];
    
    // Check if the map container exists
    const mapContainer = document.getElementById('interactive-map');
    if (!mapContainer) {
        console.error('Map container #interactive-map not found.');
        return;
    }
    // Ensure container is not already initialized by Leaflet
    if (mapContainer._leaflet_id) {
        return;
    }

    const initialZoomLevel = 11;
    const minZoomLevel = 11;
    const maxZoomLevel = 15;

    map = L.map('interactive-map', {
        center: sorsogonCenter,
        zoom: initialZoomLevel, // Initial zoom
        minZoom: minZoomLevel,  // Minimum allowed zoom
        maxZoom: maxZoomLevel,  // Maximum allowed zoom
        zoomControl: true,      // Re-enable the +/- buttons
        scrollWheelZoom: true,  // Re-enable zoom on mouse scroll
        doubleClickZoom: true,  // Re-enable zoom on double click
        touchZoom: true,        // Re-enable pinch zoom on touch devices
        dragging: true          // Keep dragging enabled
    });

    // Define the coordinates for maxBounds
    // User's NE: 13°32'26.9"N 122°10'56.9"E -> Lat: 13.540806, Lon: 122.182472
    // User's SW: 12°23'35.0"N 124°33'56.7"E -> Lat: 12.393056, Lon: 124.565750

    const southWestBoundLat = 12.530960; // Derived from user's SW Lat
    const southWestBoundLng = 122.783565; // Derived from user's SW Lon (it's the easternmost)
    const northEastBoundLat = 13.106850; // Derived from user's NE Lat
    const northEastBoundLng = 124.952358; // Derived from user's NE Lon (it's the westernmost)

    const corner1 = L.latLng(southWestBoundLat, southWestBoundLng);
    const corner2 = L.latLng(northEastBoundLat, northEastBoundLng);
    const bounds = L.latLngBounds(corner1, corner2);

    map.setMaxBounds(bounds);
    map.on('drag', function() {
        map.panInsideBounds(bounds, { animate: false });
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initial call to add all markers
    addMarkers('all');

    // Add event listeners to filter buttons
    const filterButtons = document.querySelectorAll('.map-filter');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterMarkers(this.dataset.type);
        });
    });
}

function createMarker(location) {
    const marker = L.marker([location.position.lat, location.position.lng], {
        icon: getMarkerIcon(location.type)
    });
    
    marker.bindPopup(`<b>${location.name}</b><br>${location.description}`);
    markers.push(marker);
    return marker;
}

function getMarkerIcon(type) {
    let iconUrl = 'images/marker-icon-blue.png'; // Default icon
    const iconSize = [25, 41]; // Standard Leaflet pin size [width, height]
    const iconAnchor = [12, 41]; // Point of the icon that corresponds to marker\'s location
    const popupAnchor = [1, -34]; // Point from which the popup should open relative to the iconAnchor

    if (type === 'attractions') {
        iconUrl = 'images/marker-icon-blue.png'; // Or your preferred color for attractions
    } else if (type === 'dining') {
        iconUrl = 'images/marker-icon-red.png';
    } else if (type === 'accommodation') {
        iconUrl = 'images/marker-icon-green.png';
    }
    // Add more else if blocks for other types if needed

    return L.icon({
        iconUrl: iconUrl,
        iconSize: iconSize,
        iconAnchor: iconAnchor,
        popupAnchor: popupAnchor
    });
}

function addMarkers(type) {
    clearMarkers();

    let locationsToShow = [];
    if (type === 'all') {
        locationsToShow = [
            ...locations.attractions,
            ...locations.dining,
            ...locations.accommodation
        ];
    } else if (locations[type]) {
        locationsToShow = locations[type];
    }

    locationsToShow.forEach(location => {
        const marker = createMarker(location);
        marker.addTo(map);
    });
}

function clearMarkers() {
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
}

function filterMarkers(type) {
    addMarkers(type);
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
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            // Close mobile menu if open
            document.querySelector('.nav-links').classList.remove('active');
        }
    });
});

/*
// Login Overlay Logic
const loginBtn = document.getElementById('login-btn');
const loginOverlay = document.getElementById('login-overlay');
const closeLoginBtn = document.getElementById('close-login');
const loginForm = document.getElementById('login-form');
const createAccountLink = document.querySelector('.create-account-link a'); // Link in login overlay

// Signup Overlay Elements
const signupOverlay = document.getElementById('signup-overlay');
const closeSignupBtn = document.getElementById('close-signup');
const signupForm = document.getElementById('signup-form');
const showLoginLink = document.getElementById('show-login-link'); // Link in signup overlay

if (loginBtn && loginOverlay && closeLoginBtn && loginForm) {
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default anchor behavior
        loginOverlay.style.display = 'flex';
        // Ensure signup is hidden if it was somehow left open
        if (signupOverlay) signupOverlay.style.display = 'none'; 
    });

    closeLoginBtn.addEventListener('click', () => {
        loginOverlay.style.display = 'none';
    });

    loginOverlay.addEventListener('click', (e) => {
        if (e.target === loginOverlay) {
            loginOverlay.style.display = 'none';
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Login form submitted');
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value; // Corrected from email to password
        console.log('Username:', username, 'Password:', password);
        alert('Login functionality is not yet implemented. Check console for form data.');
        loginOverlay.style.display = 'none';
        loginForm.reset();
    });
}

// Signup Overlay Logic
if (signupOverlay && closeSignupBtn && signupForm && showLoginLink) {
    closeSignupBtn.addEventListener('click', () => {
        signupOverlay.style.display = 'none';
    });

    signupOverlay.addEventListener('click', (e) => {
        if (e.target === signupOverlay) {
            signupOverlay.style.display = 'none';
        }
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Signup form submitted');
        const signupUsername = document.getElementById('signup-username').value;
        const signupEmail = document.getElementById('signup-email').value;
        const signupPassword = document.getElementById('signup-password').value;
        // Add more validation/logic as needed (e.g., confirm password)
        console.log('Signup Data:', { username: signupUsername, email: signupEmail, password: signupPassword });
        alert('Signup functionality is not yet implemented. Check console for form data.');
        signupOverlay.style.display = 'none';
        signupForm.reset();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupOverlay.style.display = 'none';
        if (loginOverlay) loginOverlay.style.display = 'flex'; // Show login overlay
    });
}

// Link from Login to Signup Overlay
if (createAccountLink && loginOverlay && signupOverlay) {
    createAccountLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginOverlay.style.display = 'none';
        signupOverlay.style.display = 'flex';
    });
}
*/

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