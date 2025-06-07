document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('dining-modal');
    const modalClose = document.querySelector('#modal-close');
    const writeReviewBtn = document.getElementById('write-review-btn');
    const reviewForm = document.getElementById('review-form');
    const reviewLoginLink = document.getElementById('review-login-link');
    const stars = document.querySelectorAll('.star-rating .star');
    const diningContainer = document.getElementById('dining-cards-container');
    window.allPlaces = []; // To store all places for URL lookup

    // --- EVENT LISTENERS (Setup Once) ---

    modalClose.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
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
        document.getElementById('modal-title').textContent = place.name;
        document.getElementById('modal-description').textContent = place.details.description || 'No description available.';
        document.getElementById('modal-location').textContent = place.location || 'Location not specified.';

        const gmapsLink = document.getElementById('modal-gmaps');
        if (place.details.google_maps_link) {
            gmapsLink.href = place.details.google_maps_link;
            gmapsLink.style.display = 'inline-block';
        } else {
            gmapsLink.style.display = 'none';
        }

        document.getElementById('modal-phone').href = `tel:${place.details.phone}`;
        document.getElementById('modal-phone').style.display = place.details.phone ? 'inline-block' : 'none';

        const messengerLink = document.getElementById('modal-messenger');
        if (place.details.messenger) {
            messengerLink.href = place.details.messenger;
            messengerLink.style.display = 'inline-block';
        } else {
            messengerLink.style.display = 'none';
        }

        modal.style.display = 'block';
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
        
        // Load reviews for this place
        loadReviews(place.id);
    }

    function createCard(place) {
        const card = document.createElement('div');
        card.className = 'dining-card';
        card.innerHTML = `
            <div class="card-image">
                <img src="${place.image_url || 'img/placeholder.jpg'}" alt="${place.name}">
            </div>
            <div class="card-content">
                <h3>${place.name}</h3>
                <p>${place.location || 'Sorsogon, Philippines'}</p>
                <button class="details-btn">See Details</button>
            </div>
        `;
        const detailsButton = card.querySelector('.details-btn');
        detailsButton.addEventListener('click', () => showModal(place));
        return card;
    }

    async function loadDiningPlaces() {
        try {
            const response = await fetch('/api/places/dining');
            const places = await response.json();
            window.allPlaces = places; // Store for later
            diningContainer.innerHTML = '';
            places.forEach(place => {
                const card = createCard(place);
                diningContainer.appendChild(card);
            });
            const contentRendered = new CustomEvent('contentRendered');
            document.dispatchEvent(contentRendered);
        } catch (error) {
            console.error('Failed to load dining places:', error);
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
    loadDiningPlaces();
}); 