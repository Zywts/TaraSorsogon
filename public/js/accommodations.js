/* ------------------------------------------------------------------
   Tara! Sorsogon · Accommodation
   – builds the card grid and Dining-style modal (with "Write a Review")
------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {

  const grid = document.getElementById('cards-wrapper');
  const overlay = document.getElementById('acc-modal');
  const modalContent = overlay.querySelector('.modal-content');
  let accommodations = []; // To store fetched data
  let currentPlace = null;
  let supabase = null;

  // Review Modal Elements
  const reviewModal = document.getElementById('review-modal');
  const closeReviewModalBtn = document.getElementById('close-review-modal');
  const reviewForm = document.getElementById('review-form');
  const ratingStars = reviewModal.querySelectorAll('.star-rating .fa-star');
  const ratingInput = document.getElementById('rating');
  const reviewLoginMessage = document.getElementById('review-login-message');

  /* ─── FETCH AND BUILD PAGE ────────────────────────────────── */
  async function initializeAccommodations() {
    try {
      await initializeSupabase();
      const response = await fetch('/api/accommodations');
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      accommodations = await response.json();
      buildCardGrid(accommodations);
      handleDeepLink();
    } catch (error) {
      console.error('Failed to load accommodations:', error);
      grid.innerHTML = '<p class="error-message">Could not load accommodations. Please try again later.</p>';
    }
  }

  /* ─── BUILD CARD GRID ──────────────────────────────────────── */
  function buildCardGrid(items) {
    grid.innerHTML = ''; // Clear existing
    items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'acc-card';
    card.innerHTML = `
      <div class="card-image">
          <img src="${item.image_url || 'images/default-placeholder.png'}" alt="${item.name}">
      </div>
      <div class="acc-card-body">
          <h3>${item.name}</h3>
          <p>${item.location}</p>
      </div>`;
      card.addEventListener('click', () => openModal(item));
    grid.appendChild(card);
  });
  }

  /* ─── MODAL SET-UP ─────────────────────────────────────────── */
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', closeModal);

  function openModal(data) {
    currentPlace = data; // Store current place
  const markup = `
    <div class="modal-header">
        <img src="${data.image_url || 'images/default-placeholder.png'}" alt="${data.name}">
      <div class="modal-header-text">
        <h3>${data.name}</h3>
          <p>${data.location}</p>
        </div>
      </div>
      <p class="modal-description">${data.description || 'No description available.'}</p>
      <div class="modal-divider"></div>
      <div class="modal-details">
        <p><strong>Opens:</strong> ${data.details.hours || 'N/A'}</p>
    </div>
    <div class="modal-divider"></div>
      <div class="modal-contact">
        ${data.details.phone ? `<a href="tel:${data.details.phone.replace(/\s|-/g, '')}"><i class="fas fa-phone"></i>${data.details.phone}</a>` : ''}
        ${data.details.fb ? `<a href="${data.details.fb}" target="_blank"><i class="fab fa-facebook"></i>Facebook</a>` : ''}
        ${data.details.msg ? `<a href="${data.details.msg}" target="_blank"><i class="fab fa-facebook-messenger"></i>Messenger</a>` : ''}
    </div>
    <div class="modal-divider"></div>

      <!-- Reviews Section -->
      <div class="dining-modal-actions">
        <button id="write-review-btn" class="btn">Write a Review</button>
      </div>
      <div id="reviews-container">
        <h3>Reviews</h3>
        <div id="reviews-list"></div>
    </div>
      `;
      
  modalContent.innerHTML = markup;
  modalContent.appendChild(closeBtn);

    // Add event listener to the new button
    modalContent.querySelector('#write-review-btn').addEventListener('click', openReviewModal);

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

    loadReviews(currentPlace.id);
}

  function closeModal() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal(); });

  /* ─── DEEPLINK FROM INDEX.HTML ────────────────────────────── */
  function handleDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const resortName = urlParams.get('name');
    if (resortName) {
      const resort = accommodations.find(r => r.name === resortName);
      if (resort) {
        openModal(resort);
      }
    }
  }
  
  // Initial call
  initializeAccommodations();
  
  // --- SUPABASE & REVIEWS ---

  async function initializeSupabase() {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    } catch (error) {
      console.error('Error initializing Supabase client:', error);
    }
  }

  const openReviewModal = () => {
    closeModal(); // Close the main modal first
    reviewModal.style.display = 'block';

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        reviewLoginMessage.style.display = 'block';
        reviewForm.querySelector('button[type="submit"]').disabled = true;
    } else {
        reviewLoginMessage.style.display = 'none';
        reviewForm.querySelector('button[type="submit"]').disabled = false;
    }
  };

  const closeReviewModal = () => {
      reviewModal.style.display = 'none';
      reviewForm.reset();
      resetStars();
  };
  
  closeReviewModalBtn.addEventListener('click', closeReviewModal);

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
  async function loadReviews(placeId) {
    const reviewsContainer = modalContent.querySelector('#reviews-list');
    if (!reviewsContainer) return;
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
                <p class="review-body">${review.comment}</p>
            `;
            reviewsContainer.appendChild(reviewEl);
        });

    } catch (error) {
        console.error('Error loading reviews:', error);
        reviewsContainer.innerHTML = '<p style="color: red;">Could not load reviews.</p>';
    }
  }

  // Handle Review Form Submission
  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user || !token) {
        reviewLoginMessage.style.display = 'block';
        return;
    }

    reviewLoginMessage.style.display = 'none';

    const rating = ratingInput.value;
    const visitDate = document.getElementById('visit-date').value;
    const title = document.getElementById('review-title').value;
    const comment = document.getElementById('review-text').value;

    if (rating === "0") {
        alert("Please select a star rating.");
       return;
    }

    const reviewData = {
        place_id: currentPlace.id,
        rating: parseInt(rating, 10),
        visit_date: visitDate,
        title: title,
        comment: comment,
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

        alert('Review submitted successfully!');
        closeReviewModal();
        openModal(currentPlace); // Re-open the main modal to show the new review

    } catch (error) {
        console.error('Error submitting review:', error);
        alert(`Error: ${error.message}`);
    }
  });

});
