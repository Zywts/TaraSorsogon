/* ================================================================
   Tara! Sorsogon — Accommodation Module
   ▸ Builds the resort card gallery
   ▸ Controls the information modal
   ▸ (Supabase-backed)
   =============================================================== */
document.addEventListener('DOMContentLoaded', () => {

  /* === Static Data Source ===================================== */
  const IMG = 'images/';

  /** Array of accommodation objects. Add, edit, or remove items to
   *  update the page — no additional HTML changes required. */
  const resorts = [
    /* … existing objects … */
    /* (content omitted for brevity — unchanged from the current file) */
  ];

  /* === Render Card Grid ======================================= */
  const grid = document.getElementById('cards-wrapper');

  resorts.forEach(resort => {
    const card = document.createElement('div');
    card.className = 'acc-card';

    card.innerHTML = `
      <div class="card-image">
        <img src="${resort.img}" alt="${resort.name}">
      </div>
      <div class="acc-card-body">
        <h3>${resort.name}</h3>
        <p>${resort.address}</p>
      </div>`;

    card.addEventListener('click', () => openModal(resort));
    grid.appendChild(card);
  });

  /* === Modal Helpers ========================================== */
  const overlay      = document.getElementById('acc-modal');
  const modalContent = overlay.querySelector('.modal-content');

  // Re-usable close button (single listener, injected each open)
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', closeModal);

  /** Builds and displays the modal for a chosen resort. */
  function openModal(data) {
    modalContent.innerHTML = `
      <div class="modal-header">
        <img src="${data.img}" alt="${data.name}">
        <div class="modal-header-text">
          <h3>${data.name}</h3>
          <p>${data.address}</p>
        </div>
      </div>

      <p class="modal-description">${data.desc}</p>
      <div class="modal-divider"></div>

      <div class="modal-details">
        <p><strong>Opens:</strong> ${data.hours}</p>
      </div>
      <div class="modal-divider"></div>

      <div class="modal-contact">
        <a href="tel:${data.phone.replace(/\s|-/g,'')}">
          <i class="fas fa-phone"></i>${data.phone}</a>
        ${data.fb  ? `<a href="${data.fb}" target="_blank">
                        <i class="fab fa-facebook"></i>Facebook</a>` : ''}
        ${data.msg ? `<a href="${data.msg}" target="_blank">
                        <i class="fab fa-facebook-messenger"></i>Messenger</a>` : ''}
      </div>

      <div style="text-align:center;margin:20px 0">
        <button class="review-btn">Write a Review</button>
      </div>`;

    modalContent.appendChild(closeBtn);
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /** Hides the modal overlay. */
  function closeModal() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Close on backdrop click or ESC key
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
  });

  /* =============================================================
     REVIEW UTILITIES (Supabase)
     ============================================================= */
  const sb = supabase;  // existing client instance

  async function loadReviews(itemId) {
    const { data, error } = await sb
      .from('accommodation_reviews')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { descending: true });

    if (error) { console.error(error); return; }

    const list = document.createElement('div');
    list.className = 'reviews-list';

    data.forEach(r => {
      list.insertAdjacentHTML('beforeend', `
        <div class="review-card">
          <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
          <p class="review-meta">
            By <strong>${r.username}</strong> on ${dayjs(r.visit_date).format('MMMM YYYY')}
          </p>
          <h4>${r.title}</h4>
          <p>${r.body}</p>
        </div>`);
    });

    return list;
  }

  /** Opens the standalone review modal and handles submission. */
  function openReviewModal(itemId) {
    const overlay = document.getElementById('reviewModal');
    const form    = overlay.querySelector('form');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset previous state
    form.reset();
    overlay.querySelector('.rating-output').textContent = '0/5';

    // Star rating UI
    form.querySelectorAll('.star').forEach(star => {
      star.onclick = () => overlay.querySelector('.rating-output').textContent =
        `${star.dataset.val}/5`;
    });

    // Form submission
    form.onsubmit = async e => {
      e.preventDefault();
      if (!supabase.auth.user()) {
        alert('Please log in to leave a review.');
        return;
      }

      const { value: stars } = form.rating;
      const { value: visit } = form.visit_date;
      const { value: title } = form.title;
      const { value: body  } = form.body;

      const { error } = await sb.from('accommodation_reviews').insert({
        item_id    : itemId,
        rating     : +stars,
        visit_date : visit,
        title,
        body,
        username   : supabase.auth.user().user_metadata.full_name
      });

      if (error) { alert(error.message); return; }

      overlay.classList.remove('active');
      document.body.style.overflow = '';

      // Refresh review list inside the accommodation modal
      const reviewsWrapper = document.getElementById('reviews-wrapper');
      reviewsWrapper.replaceWith(await loadReviews(itemId));
    };

    // Close handlers
    overlay.querySelector('.modal-close').onclick =
    overlay.onclick = ev => { if (ev.target === overlay) closeReview(); };

    function closeReview() {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
});
