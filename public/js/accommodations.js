/* ------------------------------------------------------------------
   Tara! Sorsogon · Accommodation
   – builds the card grid and Dining-style modal (with "Write a Review")
------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {

  const grid = document.getElementById('cards-wrapper');
  const overlay = document.getElementById('acc-modal');
  const modalContent = overlay.querySelector('.modal-content');
  let accommodations = []; // To store fetched data

  /* ─── FETCH AND BUILD PAGE ────────────────────────────────── */
  async function initializeAccommodations() {
    try {
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
          <img src="${item.img || 'images/default-placeholder.png'}" alt="${item.name}">
        </div>
        <div class="acc-card-body">
          <h3>${item.name}</h3>
          <p>${item.address}</p>
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
    const markup = `
      <div class="modal-header">
        <img src="${data.img || 'images/default-placeholder.png'}" alt="${data.name}">
        <div class="modal-header-text">
          <h3>${data.name}</h3>
          <p>${data.address}</p>
        </div>
      </div>
      <p class="modal-description">${data.desc || 'No description available.'}</p>
      <div class="modal-divider"></div>
      <div class="modal-details">
        <p><strong>Opens:</strong> ${data.hours || 'N/A'}</p>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-contact">
        ${data.phone ? `<a href="tel:${data.phone.replace(/\s|-/g, '')}"><i class="fas fa-phone"></i>${data.phone}</a>` : ''}
        ${data.fb ? `<a href="${data.fb}" target="_blank"><i class="fab fa-facebook"></i>Facebook</a>` : ''}
        ${data.msg ? `<a href="${data.msg}" target="_blank"><i class="fab fa-facebook-messenger"></i>Messenger</a>` : ''}
      </div>
      <div style="text-align:center;margin:20px 0">
        <button class="review-btn">Write a Review</button>
      </div>`;
      
    modalContent.innerHTML = markup;
    modalContent.appendChild(closeBtn);
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
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
  
  /********************************************************************
*  Review helpers (copied from Dining, table name changed)          *
********************************************************************/

const sb = supabase;                       // use your existing Supabase client

async function loadReviews(itemId){
  const { data, error } = await sb
        .from('accommodation_reviews')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { descending:true });

  if(error){ console.error(error); return; }

  const list = document.createElement('div');
  list.className = 'reviews-list';

  data.forEach(r =>{
    list.insertAdjacentHTML('beforeend', `
      <div class="review-card">
        <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
        <p class="review-meta">By <strong>${r.username}</strong> on ${dayjs(r.visit_date).format('MMMM YYYY')}</p>
        <h4>${r.title}</h4>
        <p>${r.body}</p>
      </div>`);
  });

  return list;           // caller will append it
}

function openReviewModal(itemId){
  const overlay = document.getElementById('reviewModal');
  const form    = overlay.querySelector('form');
  overlay.classList.add('active');
  document.body.style.overflow='hidden';

  /* reset */
  form.reset(); overlay.querySelector('.rating-output').textContent='0/5';

  /* star input visual */
  form.querySelectorAll('.star').forEach(star =>{
      star.onclick = ()=> overlay.querySelector('.rating-output').textContent =
                      star.dataset.val + '/5';
  });

  /* submit */
  form.onsubmit = async e =>{
    e.preventDefault();
    if(!supabase.auth.user()){            // <— use your auth check
       alert('Please log in to leave a review.');
       return;
    }

    const { value: stars } = form.rating;
    const { value: visit } = form.visit_date;
    const { value: title } = form.title;
    const { value: body  } = form.body;

    const { error } = await sb.from('accommodation_reviews')
        .insert({
          item_id    : itemId,
          rating     : +stars,
          visit_date : visit,
          title,
          body,
          username   : supabase.auth.user().user_metadata.full_name
        });

    if(error){ alert(error.message); return; }

    overlay.classList.remove('active');
    document.body.style.overflow='';

    // refresh list inside the accommodation modal
    const reviewsWrapper = document.getElementById('reviews-wrapper');
    reviewsWrapper.replaceWith(await loadReviews(itemId));
  };

  /* close handlers */
  overlay.querySelector('.modal-close').onclick =
  overlay.onclick = (ev)=>{ if(ev.target===overlay) closeReview() };

  function closeReview(){
    overlay.classList.remove('active');
    document.body.style.overflow='';
  }
}

});
