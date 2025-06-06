document.addEventListener("DOMContentLoaded", () => {
  const modalOverlay = document.getElementById("dining-modal");
  const modalCloseBtn = document.getElementById("modal-close");

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

  function showModal(data) {
    // Populate modal fields from the dataset
    modalImage.src = data.image;
    modalImage.alt = data.name;
    modalName.textContent = data.name;
    modalAddress.textContent = data.address;
    modalDescription.textContent = data.description;
    modalHours.textContent = data.hours;
    modalBest.textContent = data.best;

    // Update phone link
    modalPhone.href = `tel:${data.phone.replace(/\s+/g, "")}`;
    modalPhoneText.textContent = data.phone;

    // Update Facebook and Messenger links
    modalFacebook.href = data.facebook;
    modalMessenger.href = data.messenger;

    // Show the modal
    modalOverlay.classList.add("active");
    // Prevent background scrolling
    document.body.style.overflow = "hidden";
  }

  // 1) Show Modal with data from clicked card
  document.querySelectorAll(".dining-card").forEach((card) => {
    card.addEventListener("click", () => {
      showModal(card.dataset);
    });
  });

  // Check for a query parameter on page load to auto-trigger a modal
  const queryParams = new URLSearchParams(window.location.search);
  const placeName = queryParams.get('name');

  if (placeName) {
    // Find the card that matches the name and trigger its modal
    const cardToOpen = document.querySelector(`.dining-card[data-name="${placeName}"]`);
    if (cardToOpen) {
      // Use a small timeout to ensure all assets are loaded before showing modal
      setTimeout(() => {
        showModal(cardToOpen.dataset);
      }, 100);
    }
  }

  // 2) Hide Modal when Close button is clicked
  modalCloseBtn.addEventListener("click", () => {
    modalOverlay.classList.remove("active");
    document.body.style.overflow = ""; // restore scrolling
  });

  // 3) Hide Modal when clicking outside .modal-content
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  });

  // (Optional) Close with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay.classList.contains("active")) {
      modalOverlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  });
}); 