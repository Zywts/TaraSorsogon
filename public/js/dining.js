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

  // 1) Show Modal with data from clicked card
  document.querySelectorAll(".dining-card").forEach((card) => {
    card.addEventListener("click", () => {
      // Read data-* attributes from the clicked card
      const name = card.getAttribute("data-name");
      const imageUrl = card.getAttribute("data-image");
      const address = card.getAttribute("data-address");
      const description = card.getAttribute("data-description");
      const hours = card.getAttribute("data-hours");
      const best = card.getAttribute("data-best");
      const phone = card.getAttribute("data-phone");
      const facebook = card.getAttribute("data-facebook");
      const messenger = card.getAttribute("data-messenger");

      // Populate modal fields
      modalImage.src = imageUrl;
      modalImage.alt = name;
      modalName.textContent = name;
      modalAddress.textContent = address;
      modalDescription.textContent = description;
      modalHours.textContent = hours;
      modalBest.textContent = best;

      // Update phone link
      modalPhone.href = `tel:${phone.replace(/\s+/g, "")}`;
      modalPhoneText.textContent = phone;

      // Update Facebook link
      modalFacebook.href = facebook;
      // Update Messenger link
      modalMessenger.href = messenger;

      // Show the modal
      modalOverlay.classList.add("active");
      // Prevent background scrolling
      document.body.style.overflow = "hidden";
    });
  });

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