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

  function showModal(data) {
    modalImage.src = data.image_url || 'images/default-dining.jpg';
    modalImage.alt = data.name;
    modalName.textContent = data.name;
    modalAddress.textContent = data.location || 'Address not available';
    modalDescription.textContent = data.description;

    const details = data.details ? (typeof data.details === 'string' ? JSON.parse(data.details) : data.details) : {};
    
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

    const facebookUrl = details.facebook || '';
    if (facebookUrl) {
        modalFacebook.href = facebookUrl;
        modalFacebook.style.display = 'inline-block';
    } else {
        modalFacebook.style.display = 'none';
    }

    const messengerUrl = details.messenger || '';
    if (messengerUrl) {
        modalMessenger.href = messengerUrl;
        modalMessenger.style.display = 'inline-block';
    } else {
        modalMessenger.style.display = 'none';
    }

    modalOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function createDiningCard(place) {
    const card = document.createElement('div');
    card.className = 'dining-card';

    Object.keys(place).forEach(key => {
        card.dataset[key] = typeof place[key] === 'object' ? JSON.stringify(place[key]) : place[key];
    });

    card.innerHTML = `
        <div class="card-image">
            <img src="${place.image_url || 'images/default-dining.jpg'}" alt="${place.name}" />
        </div>
        <div class="card-content">
            <h3>${place.name}</h3>
            <p>${place.location || 'Sorsogon, Philippines'}</p>
        </div>
    `;

    card.addEventListener('click', () => showModal(card.dataset));
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

    } catch (error) {
        console.error('Error loading dining places:', error);
        diningCardsContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
  }

  modalCloseBtn.addEventListener("click", () => {
    modalOverlay.classList.remove("active");
    document.body.style.overflow = "";
  });

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay.classList.contains("active")) {
      modalOverlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  });

  loadDiningPlaces();
}); 