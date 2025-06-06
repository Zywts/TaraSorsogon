document.addEventListener('DOMContentLoaded', () => {
  const modalOverlay = document.getElementById('attraction-modal');
  const modalCloseBtn = document.getElementById('attraction-modal-close');

  if (!modalOverlay || !modalCloseBtn) {
    return;
  }

  // Get modal fields
  const modalImage = document.getElementById('attraction-modal-image');
  const modalName = document.getElementById('attraction-modal-name');
  const modalAddress = document.getElementById('attraction-modal-address');
  const modalHours = document.getElementById('attraction-modal-hours');
  const modalDescription = document.getElementById('attraction-modal-description');

  const openModal = (card) => {
    const name = card.getAttribute('data-name');
    const imageUrl = card.getAttribute('data-image');
    const address = card.getAttribute('data-address');
    const hours = card.getAttribute('data-hours');
    const description = card.getAttribute('data-description');

    // Populate modal
    modalImage.src = imageUrl;
    modalImage.alt = name;
    modalName.textContent = name;
    modalAddress.textContent = `Address: ${address}`;
    modalHours.textContent = `Operating Hours: ${hours}`;
    modalDescription.textContent = description;

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  // Add click listener to all attraction cards
  document.querySelectorAll('.attraction').forEach((card) => {
    card.addEventListener('click', () => openModal(card));
  });

  // Close modal events
  modalCloseBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
      closeModal();
    }
  });
}); 