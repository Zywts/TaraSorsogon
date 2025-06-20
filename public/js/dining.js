document.addEventListener("DOMContentLoaded", () => {
  const modalOverlay = document.getElementById("dining-modal");
  const modalCloseBtn = document.getElementById("modal-close");
  const diningCardsContainer = document.getElementById("dining-cards-container");

  // Modal fields
  const modalImage = document.getElementById("modal-image");
  const modalName = document.getElementById("modal-name");
  const modalAddress = document.getElementById("modal-address");
  const modalDescription = document.getElementById("modal-description");
  const modalHours = document.getElementById("modal-hours");
  const modalBest = document.getElementById("modal-best");
  const modalPhone = document.getElementById("modal-phone");
  const modalPhoneText = document.getElementById("modal-phone-text");
  const modalFacebook = document.getElementById("modal-facebook");
  const modalMessenger = document.getElementById("modal-messenger");

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

  // Function to show toast messages
  function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = 'toast-message';
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Animate out and remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 500); // Wait for transition to finish
    }, 3000);
  }

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

  async function showModal(data) {
    currentPlace = data; // Store current place
    modalImage.src = data.image_url || 'images/default-dining.jpg';
    modalImage.alt = data.name;
    modalName.textContent = data.name;
    modalAddress.textContent = data.location || 'Address not available';
    modalDescription.textContent = data.description;

    const details = data.details || {};
    
    modalHours.textContent = details.hours || 'Not available';
    modalBest.textContent = details.best_seller || 'Not available';

    const phone = details.phone || '';
    if (phone) {
        modalPhone.href = `tel:${phone.replace(/\s+/g, "")}`;
        modalPhoneText.textContent = phone;
        modalPhone.parentElement.style.display = 'inline-block';
    } else {
        modalPhone.parentElement.style.display = 'none';
    }

    const facebookUrl = details.fb || details.facebook || '';
    if (facebookUrl) {
        modalFacebook.href = facebookUrl;
        modalFacebook.style.display = 'inline-block';
    } else {
        modalFacebook.style.display = 'none';
    }

    const messengerUrl = details.msg || details.messenger || '';
    if (messengerUrl) {
        modalMessenger.href = messengerUrl;
        modalMessenger.style.display = 'inline-block';
    } else {
        modalMessenger.style.display = 'none';
    }

    modalOverlay.classList.add("active");
    document.body.style.overflow = "hidden";

    await loadReviews(data.id);

    // Once we have the specific place, log the view
    if (data && data.id) {
        logPlaceView(data.id);
    }
  }

  function hideModal() {
    modalOverlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  function closeModal() {
      hideModal();
      currentPlace = null;
  }

  modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
        closeModal();
    }
  });

  modalFacebook.addEventListener('click', (event) => {
      event.preventDefault();
      window.open(modalFacebook.href, '_blank');
  });

  modalMessenger.addEventListener('click', (event) => {
        event.preventDefault();
        window.open(modalMessenger.href, '_blank');
  });

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
  const loadReviews = async (placeId) => {
    reviewsContainer.innerHTML = '<p>Loading reviews...</p>';
    try {
        const response = await fetch(`/api/reviews/${placeId}`);
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
                    <div class="review-rating">${stars}</div>
                    <h4 class="review-title">${review.title}</h4>
                </div>
                <p class="review-author">By <strong>${review.user ? review.user.username : 'Anonymous'}</strong> on ${visitDate}</p>
                <p class="review-body">${review.review_text}</p>
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
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user || !token) {
        document.getElementById('review-login-message').style.display = 'block';
        return;
    }

    document.getElementById('review-login-message').style.display = 'none';

    const rating = document.getElementById('rating').value;
    const visitDate = document.getElementById('visit-date').value;
    const title = document.getElementById('review-title').value;
    const reviewText = document.getElementById('review-text').value;

    if (rating === "0") {
        alert("Please select a star rating.");
        return;
    }

    const reviewData = {
        user_id: user.id,
        place_id: currentPlace.id,
        rating: parseInt(rating, 10),
        visit_date: visitDate,
        title: title,
        comment: reviewText,
    };

    try {
        const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reviewData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to submit review.');
        }

        showToast('Review submitted successfully!');
        closeReviewModal(); // Close and reset the review form
        showModal(currentPlace); // Re-open the main modal to show the new review

    } catch (error) {
        console.error('Error submitting review:', error);
        alert(`Error: ${error.message}`);
    }
  });

  function createDiningCard(place) {
    const card = document.createElement('div');
    card.className = 'dining-card';

    // Store all place data in the dataset for the modal
    card.dataset.place = JSON.stringify(place);
    card.dataset.name = place.name; // For the query selector

    card.innerHTML = `
        <div class="card-image">
            <img src="${place.image_url || 'images/default-dining.jpg'}" alt="${place.name}" />
        </div>
        <div class="card-content">
            <h3>${place.name}</h3>
            <p>${place.location || 'Sorsogon, Philippines'}</p>
        </div>
    `;

    card.addEventListener('click', () => showModal(place));
    return card;
  }

  async function loadDiningPlaces() {
    try {
        const response = await fetch('/api/places/dining');
        if (!response.ok) throw new Error('Failed to fetch dining places.');
        
        const places = await response.json();
        
        diningCardsContainer.innerHTML = '';
        if (places.length === 0) {
            diningCardsContainer.innerHTML = '<p>No dining places found.</p>';
            return;
        }

        places.forEach(place => {
            const card = createDiningCard(place);
            diningCardsContainer.appendChild(card);
        });

        // After rendering, check for a query parameter to auto-trigger a modal
        const queryParams = new URLSearchParams(window.location.search);
        const placeName = queryParams.get('name');
        if (placeName) {
            const cardToOpen = document.querySelector(`.dining-card[data-name="${placeName}"]`);
            if (cardToOpen) {
                const cardData = JSON.parse(cardToOpen.dataset.place);
                setTimeout(() => {
                    showModal(cardData);
                }, 100);
            }
        }

    } catch (error) {
      console.error('Error loading dining places:', error);
      diningCardsContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
  }

  modalCloseBtn.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay.classList.contains("active")) {
      closeModal();
    }
  });

  // Review Modal events
  if (writeReviewBtn) writeReviewBtn.addEventListener('click', openReviewModal);
  if (closeReviewModalBtn) closeReviewModalBtn.addEventListener('click', closeReviewModal);
  window.addEventListener('click', (event) => {
      if (event.target === reviewModal) closeReviewModal();
  });

  initializeSupabase();
  loadDiningPlaces();
});

async function logPlaceView(placeId) {
    const token = localStorage.getItem('accessToken');
    if (!token) return; // Don't log views for non-logged-in users

    try {
        await fetch('/api/places/view', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ place_id: placeId })
        });
    } catch (error) {
        console.error('Could not log place view:', error);
    }
} 