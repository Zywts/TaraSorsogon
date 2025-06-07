document.addEventListener('DOMContentLoaded', () => {
    const modalOverlay = document.getElementById('attraction-modal');
    const modalClose = document.getElementById('attraction-modal-close');
    const writeReviewBtn = document.getElementById('write-review-btn');
    const reviewForm = document.getElementById('review-form');
    const reviewLoginLink = document.getElementById('review-login-link');
    const stars = document.querySelectorAll('.star-rating .star');
    const attractionsContainer = document.getElementById('attractions-container');
    window.allPlaces = [];

    // --- EVENT LISTENERS (Setup Once) ---

    modalClose.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
        document.body.style.overflow = '';
    });

    window.addEventListener('click', (event) => {
        if (event.target == modalOverlay) {
            modalOverlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    reviewLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/index.html#login-section';
    });

    writeReviewBtn.addEventListener('click', () => {
        writeReviewBtn.style.display = 'none';
        reviewForm.style.display = 'block';
    });

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = star.getAttribute('data-value');
            document.getElementById('review-rating').value = value;
            stars.forEach(s => {
                s.dataset.rated = s.getAttribute('data-value') <= value;
            });
        });
    });

    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('supabase.auth.token');
        if (!token) {
            alert('You must be logged in to submit a review.');
            return;
        }

        const placeId = reviewForm.dataset.placeId;
        const rating = document.getElementById('review-rating').value;
        const visit_date = document.getElementById('review-visit-date').value;
        const title = document.getElementById('review-title').value;
        const review_text = document.getElementById('review-text').value;
        const photos = document.getElementById('review-photos').value;

        const resetStars = () => {
            document.getElementById('review-rating').value = '0';
            stars.forEach(s => s.dataset.rated = false);
        };

        const photo_urls = photos.split(',').map(url => url.trim()).filter(url => url);

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    place_id: placeId, rating, visit_date, title, review_text, photo_urls
                })
            });

            if (response.ok) {
                alert('Thank you! Your review has been submitted.');
                reviewForm.reset();
                resetStars();
                reviewForm.style.display = 'none';
                writeReviewBtn.style.display = 'block';
                loadReviews(placeId); // Reload reviews to show the new one
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Failed to submit review:', error);
            alert('An error occurred while submitting your review.');
        }
    });

    // --- FUNCTIONS ---

    async function loadReviews(placeId) {
        const reviewsContainer = document.getElementById('reviews-container');
        reviewsContainer.innerHTML = '<p>Loading reviews...</p>';
    
        try {
            const response = await fetch(`/api/reviews/place/${placeId}`);
            if (!response.ok) throw new Error('Failed to load reviews.');
    
            const reviews = await response.json();
    
            if (reviews.length === 0) {
                reviewsContainer.innerHTML = '<p>Be the first to write a review!</p>';
                return;
            }
    
            reviewsContainer.innerHTML = ''; // Clear container
            reviews.forEach(review => {
                const reviewCard = document.createElement('div');
                reviewCard.className = 'review-card';
    
                const visitDate = new Date(review.visit_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                const reviewDate = new Date(review.created_at).toLocaleDateString();
    
                let starsHTML = '';
                for (let i = 0; i < 5; i++) {
                    starsHTML += `<span class="star">${i < review.rating ? '&#9733;' : '&#9734;'}</span>`;
                }
                
                let photosHTML = '';
                if(review.photo_urls && review.photo_urls.length > 0){
                    photosHTML += '<div class="review-photos">';
                    review.photo_urls.forEach(url => {
                        if(url) photosHTML += `<img src="${url}" alt="Review photo">`;
                    })
                    photosHTML += '</div>';
                }
    
                reviewCard.innerHTML = `
                    <div class="review-header">
                        <span class="username">${review.username}</span>
                        <div class="review-stars">${starsHTML}</div>
                        <span class="review-date">Reviewed on ${reviewDate}</span>
                    </div>
                    <div class="review-body">
                        <h5>${review.title}</h5>
                        <p><strong>Date of visit:</strong> ${visitDate}</p>
                        <p>${review.review_text || ''}</p>
                        ${photosHTML}
                    </div>
                `;
                reviewsContainer.appendChild(reviewCard);
            });
    
        } catch (error) {
            console.error('Error fetching reviews:', error);
            reviewsContainer.innerHTML = '<p style="color: red;">Could not load reviews.</p>';
        }
    }

    function showModal(place) {
        document.getElementById('attraction-modal-name').textContent = place.name;
        document.getElementById('attraction-modal-address').textContent = `Address: ${place.location || 'Not available'}`;
        document.getElementById('attraction-modal-description').textContent = place.description || 'No description available.';
        
        const details = place.details || {};
        document.getElementById('attraction-modal-hours').textContent = `Operating Hours: ${details.hours || 'Not available'}`;

        const photoElement = document.getElementById('attraction-modal-image');
        photoElement.src = place.image_url || 'img/placeholder.jpg';
        photoElement.alt = place.name;

        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        const token = localStorage.getItem('supabase.auth.token');
        const reviewLoginPrompt = document.querySelector('.review-login-prompt');

        if (token) {
            reviewLoginPrompt.style.display = 'none';
            writeReviewBtn.style.display = 'block';
            reviewForm.style.display = 'none';
        } else {
            reviewLoginPrompt.style.display = 'block';
            writeReviewBtn.style.display = 'none';
            reviewForm.style.display = 'none';
        }

        reviewForm.dataset.placeId = place.id;
        reviewForm.reset();
        document.getElementById('review-rating').value = '0';
        stars.forEach(s => s.dataset.rated = false);

        loadReviews(place.id);
    }

    function createAttractionCard(place) {
        const card = document.createElement('div');
        card.className = 'attraction';
        card.dataset.name = place.name; // For URL lookup
        card.innerHTML = `
            <div class="image-wrapper">
                <img src="${place.image_url || 'img/placeholder.jpg'}" alt="${place.name}">
            </div>
            <div class="attraction-text">
                 <h3>${place.name}</h3>
                 <p>${place.location || 'Location not available'}</p>
                 <button class="details-btn">See Details</button>
            </div>
        `;
        const detailsButton = card.querySelector('.details-btn');
        detailsButton.addEventListener('click', () => showModal(place));
        return card;
    }

    async function loadAttractions() {
        try {
            const response = await fetch('/api/places/attractions');
            const places = await response.json();
            window.allPlaces = places;
            attractionsContainer.innerHTML = '';

            const attractionsByMunicipality = places.reduce((acc, place) => {
                const municipality = (place.location && place.location.split(',').length > 1)
                    ? place.location.split(',')[1].trim()
                    : 'Uncategorized';
                if (!acc[municipality]) {
                    acc[municipality] = [];
                }
                acc[municipality].push(place);
                return acc;
            }, {});

            for (const municipality in attractionsByMunicipality) {
                const section = document.createElement('div');
                section.className = 'municipality-section';
                section.innerHTML = `<div class="municipality-header"><h2>${municipality}</h2></div>`;
                const grid = document.createElement('div');
                grid.className = 'attractions-grid';
                attractionsByMunicipality[municipality].forEach(place => {
                    const card = createAttractionCard(place);
                    grid.appendChild(card);
                });
                section.appendChild(grid);
                attractionsContainer.appendChild(section);
            }
            const contentRendered = new CustomEvent('contentRendered');
            document.dispatchEvent(contentRendered);
        } catch (error) {
            console.error('Failed to load attractions:', error);
        }
    }

    document.addEventListener('contentRendered', () => {
        const params = new URLSearchParams(window.location.search);
        const placeName = params.get('name');
        if (placeName) {
            const place = window.allPlaces.find(p => p.name === placeName);
            if (place) {
                showModal(place);
            }
        }
    });

    // --- INITIALIZATION ---
    loadAttractions();
}); 