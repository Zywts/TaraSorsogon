document.addEventListener('DOMContentLoaded', () => {
    const attractionsContainer = document.getElementById('attractions-container');
    const modalOverlay = document.getElementById('attraction-modal');
    const modalCloseBtn = document.getElementById('attraction-modal-close');

    if (!modalOverlay || !modalCloseBtn) {
        console.error('Modal elements not found!');
        return;
    }

    const modalImage = document.getElementById('attraction-modal-image');
    const modalName = document.getElementById('attraction-modal-name');
    const modalAddress = document.getElementById('attraction-modal-address');
    const modalHours = document.getElementById('attraction-modal-hours');
    const modalDescription = document.getElementById('attraction-modal-description');
    
    // Review Modal Elements
    const reviewModal = document.getElementById('review-modal');
    const closeReviewModalBtn = document.getElementById('close-review-modal');
    const writeReviewBtn = document.getElementById('write-review-btn');
    const reviewForm = document.getElementById('review-form');
    const ratingStars = document.querySelectorAll('.star-rating .fa-star');
    const ratingInput = document.getElementById('rating');
    const reviewsContainer = document.getElementById('reviews-list');
    const reviewLoginMessage = document.getElementById('review-login-message');

    let currentPlace = null;
    let supabase = null;

    // Initialize Supabase Client
    const initializeSupabase = async () => {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
        } catch (error) {
            console.error('Error initializing Supabase client:', error);
        }
    };

    const openModal = async (place) => {
        currentPlace = place; // Store the current place
        const details = place.details || {};
        modalImage.src = place.image_url || 'images/default-attraction.jpg';
        modalImage.alt = place.name;
        modalName.textContent = place.name;
        modalAddress.textContent = `Address: ${place.location || 'Not available'}`;
        modalHours.textContent = `Operating Hours: ${details.hours || 'Not available'}`;
        modalDescription.textContent = place.description || 'No description available.';
        
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        await loadReviews(place.id, 'attraction_id');
    };

    const hideModal = () => {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    const closeModal = () => {
        hideModal();
        currentPlace = null;
    };

    const openReviewModal = () => {
        hideModal(); // Close the main modal first

        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            reviewLoginMessage.style.display = 'block';
            reviewForm.querySelector('button[type="submit"]').disabled = true;
        } else {
            reviewLoginMessage.style.display = 'none';
            reviewForm.querySelector('button[type="submit"]').disabled = false;
        }
        reviewModal.style.display = 'block';
    };

    const closeReviewModal = () => {
        reviewModal.style.display = 'none';
        reviewForm.reset();
        resetStars();
    };

    // Star Rating Logic
    const resetStars = () => {
        ratingStars.forEach(star => star.classList.remove('filled'));
        ratingInput.value = '0';
    };

    ratingStars.forEach(star => {
        star.addEventListener('click', () => {
            const value = star.dataset.value;
            ratingInput.value = value;
            ratingStars.forEach(s => {
                s.classList.toggle('filled', s.dataset.value <= value);
            });
        });
    });

    // Load and Display Reviews
    const loadReviews = async (placeId, type) => {
        reviewsContainer.innerHTML = '<p>Loading reviews...</p>';
        try {
            const response = await fetch(`/api/reviews?${type}=${placeId}`);
            if (!response.ok) throw new Error('Failed to fetch reviews.');
            
            const reviews = await response.json();

            if (reviews.length === 0) {
                reviewsContainer.innerHTML = '<p>No reviews yet. Be the first to write one!</p>';
                return;
            }

            reviewsContainer.innerHTML = '';
            reviews.forEach(review => {
                const reviewEl = document.createElement('div');
                reviewEl.className = 'review-card';
                
                const visitDate = new Date(review.visit_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                
                let stars = '';
                for(let i = 1; i <= 5; i++) {
                    stars += `<i class="fa-star ${i <= review.rating ? 'fas' : 'far'}"></i>`;
                }

                reviewEl.innerHTML = `
                    <div class="review-header">
                        <span class="review-title">${review.title}</span>
                        <span class="review-date">Visited: ${visitDate}</span>
                    </div>
                    <div class="review-rating">${stars}</div>
                    <p class="review-text">${review.review}</p>
                    ${review.photos && review.photos.length > 0 ? `
                        <div class="review-photos">
                            ${review.photos.map(photoUrl => `<img src="${photoUrl}" alt="Review photo">`).join('')}
                        </div>
                    ` : ''}
                `;
                reviewsContainer.appendChild(reviewEl);
            });

        } catch (error) {
            console.error('Error loading reviews:', error);
            reviewsContainer.innerHTML = '<p style="color: red;">Could not load reviews.</p>';
        }
    };
    
    // Handle Review Form Submission
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!supabase) {
            alert('Supabase client is not initialized.');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            alert('You must be logged in to submit a review.');
            return;
        }

        const submitButton = reviewForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';

        try {
            // 1. Upload photos to Supabase Storage
            const photoFiles = document.getElementById('review-photos').files;
            const photoUrls = [];
            if (photoFiles.length > 0) {
                for (const file of photoFiles) {
                    const fileName = `${user.id}/${Date.now()}-${file.name}`;
                    const { data, error } = await supabase.storage
                        .from('review_photos')
                        .upload(fileName, file);

                    if (error) throw new Error(`Photo upload failed: ${error.message}`);
                    
                    // Get public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('review_photos')
                        .getPublicUrl(fileName);
                    photoUrls.push(publicUrl);
                }
            }
            
            // 2. Submit review to your backend
            const reviewData = {
                user_id: user.id,
                attraction_id: currentPlace.id,
                rating: parseInt(ratingInput.value, 10),
                visit_date: document.getElementById('visit-date').value,
                title: document.getElementById('review-title').value,
                review: document.getElementById('review-text').value,
                photos: photoUrls
            };
            
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify(reviewData)
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to submit review.');
            }
            
            alert('Review submitted successfully!');
            closeReviewModal();
            await openModal(currentPlace); // Re-open the main modal to show the new review

        } catch (error) {
            console.error('Error submitting review:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Review';
        }
    });

    const createAttractionElement = (place) => {
        const attractionEl = document.createElement('div');
        attractionEl.className = 'attraction';
        attractionEl.dataset.place = JSON.stringify(place);
        attractionEl.dataset.name = place.name;
        
        const details = place.details || {};

        attractionEl.innerHTML = `
            <div class="image-wrapper">
                <img src="${place.image_url || 'images/default-attraction.jpg'}" alt="${place.name}">
            </div>
            <div class="attraction-text">
                <h3>${place.name}</h3>
                <p><strong>Address:</strong> ${place.location || 'Not available'}</p>
                <p><strong>Operating Hours:</strong> ${details.hours || 'Not available'}</p>
                <p>${place.description || 'No description available.'}</p>
            </div>
        `;
        
        attractionEl.addEventListener('click', () => openModal(place));
        return attractionEl;
    };

    const groupAttractionsByMunicipality = (places) => {
        return places.reduce((acc, place) => {
            let municipality = 'Uncategorized';

            if (place.location && typeof place.location === 'string' && place.location.trim() !== '') {
                const parts = place.location.split(',').map(p => p.trim());
                municipality = parts.length > 1 ? parts[parts.length - 2] : parts[0];
            }
            
            if (!acc[municipality]) {
                acc[municipality] = [];
            }
            acc[municipality].push(place);
            return acc;
        }, {});
    };

    const loadAttractions = async () => {
        try {
            const response = await fetch('/api/places/attractions');
            if (!response.ok) {
                throw new Error('Failed to fetch attractions.');
            }
            const places = await response.json();
            
            attractionsContainer.innerHTML = '';
            if (places.length === 0) {
                attractionsContainer.innerHTML = '<p>No attractions found.</p>';
                return;
            }

            const grouped = groupAttractionsByMunicipality(places);

            for (const municipality in grouped) {
                const municipalityEl = document.createElement('div');
                municipalityEl.className = 'municipality';
                municipalityEl.innerHTML = `<div class="municipality-header"><h2>${municipality}</h2></div>`;
                
                grouped[municipality].forEach(place => {
                    const attractionEl = createAttractionElement(place);
                    municipalityEl.appendChild(attractionEl);
                });
                
                attractionsContainer.appendChild(municipalityEl);
            }

            // After rendering, check for a query parameter to auto-trigger a modal
            const queryParams = new URLSearchParams(window.location.search);
            const attractionName = queryParams.get('name');
            if (attractionName) {
                // Find the newly created element by its name in the dataset
                const attractionToOpen = document.querySelector(`.attraction[data-name="${attractionName}"]`);
                if (attractionToOpen) {
                    // We need to get the original 'place' object back to pass to openModal
                    const placeData = JSON.parse(attractionToOpen.dataset.place);
                    setTimeout(() => {
                        openModal(placeData);
                    }, 100); // Small delay to ensure smooth rendering
                }
            }

        } catch (error) {
            console.error('Error loading attractions:', error);
            attractionsContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    };

    // Close modal events
    modalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
    });

    // Review Modal events
    if (writeReviewBtn) writeReviewBtn.addEventListener('click', openReviewModal);
    if (closeReviewModalBtn) closeReviewModalBtn.addEventListener('click', closeReviewModal);
    window.addEventListener('click', (event) => {
        if (event.target === reviewModal) closeReviewModal();
    });

    // Initial Load
    initializeSupabase();
    loadAttractions();
}); 