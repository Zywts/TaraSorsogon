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

    const openModal = (place) => {
        const details = place.details || {};
        modalImage.src = place.image_url || 'images/default-attraction.jpg';
        modalImage.alt = place.name;
        modalName.textContent = place.name;
        modalAddress.textContent = `Address: ${place.location || 'Not available'}`;
        modalHours.textContent = `Operating Hours: ${details.hours || 'Not available'}`;
        modalDescription.textContent = place.description || 'No description available.';
        
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    };

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

    loadAttractions();
}); 