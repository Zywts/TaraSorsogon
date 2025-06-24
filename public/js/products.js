document.addEventListener("DOMContentLoaded", () => {
    const modalOverlay = document.getElementById("product-modal");
    const modalCloseBtn = document.getElementById("modal-close");
    const productsContainer = document.getElementById("cards-wrapper");

    // Modal fields
    const modalImage = document.getElementById("modal-image");
    const modalName = document.getElementById("modal-name");
    const modalShop = document.getElementById("modal-shop");
    const modalDescription = document.getElementById("modal-description");
    const modalLocation = document.getElementById("modal-location");

    let supabase = null;

    // Initialize Supabase Client
    const initializeSupabase = async () => {
        try {
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error('Failed to fetch Supabase config');
            }
            const config = await response.json();
            supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
            loadProducts(); // Load products after Supabase is initialized
        } catch (error) {
            console.error('Error initializing Supabase client:', error);
            productsContainer.innerHTML = `<p style="color: red;">Error: Could not connect to the database. Please check the console for details.</p>`;
        }
    };

    function showModal(data) {
        modalImage.src = data.image_url || 'images/default-product.jpg';
        modalImage.alt = data.name;
        modalName.textContent = data.name;
        modalShop.textContent = data.shop_name || 'Shop not available';
        modalDescription.textContent = data.description;
        modalLocation.textContent = data.location || 'Not available';
        modalOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function hideModal() {
        modalOverlay.classList.remove("active");
        document.body.style.overflow = "";
        // Clear the URL query parameter when the modal is closed
        if (window.history.pushState) {
            const newURL = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.pushState({path: newURL}, '', newURL);
        }
    }

    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay || event.target === modalCloseBtn) {
            hideModal();
        }
    });

    modalCloseBtn.addEventListener('click', hideModal);

    function createProductCard(product) {
        const card = document.createElement("div");
        card.className = "product-item";
        card.innerHTML = `
            <div class="card-image">
                <img src="${product.image_url || 'images/default-product.jpg'}" alt="${product.name}">
            </div>
            <div class="card-content">
                <h3>${product.name}</h3>
                <p>${product.shop_name || ''}</p>
            </div>
        `;
        card.addEventListener('click', () => showModal(product));
        return card;
    }

    async function loadProducts() {
        if (!supabase) {
            console.error("Supabase client is not initialized.");
            return;
        }

        try {
            const { data, error } = await supabase.from('products').select('*');
            if (error) throw error;

            if (data.length === 0) {
                productsContainer.innerHTML = "<p>No products found at this time.</p>";
                return;
            }

            productsContainer.innerHTML = ""; // Clear loader/placeholder
            data.forEach(product => {
                const card = createProductCard(product);
                productsContainer.appendChild(card);
            });
        } catch (error) {
            console.error("Error loading products:", error);
            productsContainer.innerHTML = `<p style="color: red;">Could not load products. ${error.message}</p>`;
        }
    }

    // Check for a product ID in the URL and show the modal automatically
    const loadAndShowProductFromURL = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (productId && supabase) {
            try {
                const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();
                
                if (error) throw error;
                
                if (data) {
                    showModal(data);
                }
            } catch (error) {
                console.error('Error fetching product by ID:', error);
            }
        }
    };

    // Initialize the page
    initializeSupabase().then(() => {
        // This runs after supabase is initialized
        loadAndShowProductFromURL();
    });
}); 