document.addEventListener('DOMContentLoaded', () => {
    const resultsGrid = document.getElementById('search-results-grid');
    const resultsHeader = document.getElementById('search-results-header');

    // Get the search term from the URL query parameter
    const queryParams = new URLSearchParams(window.location.search);
    const searchTerm = queryParams.get('term');

    if (!searchTerm) {
        resultsHeader.textContent = 'No search term provided';
        resultsGrid.innerHTML = '<p>Please enter a search term on the homepage.</p>';
        return;
    }

    resultsHeader.textContent = `Search Results for "${searchTerm}"`;
    fetchSearchResults(searchTerm);

    async function fetchSearchResults(term) {
        try {
            const response = await fetch(`/api/search?term=${encodeURIComponent(term)}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Search failed');
            }
            const results = await response.json();
            renderResults(results);
        } catch (error) {
            resultsGrid.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    }

    function renderResults(results) {
        if (!results || results.length === 0) {
            resultsGrid.innerHTML = '<p>No results found. Try a different search term.</p>';
            return;
        }

        resultsGrid.innerHTML = results.map(place => {
            // Use placeholder if image_url is missing
            const imageUrl = place.image_url || 'images/placeholder.jpg';
            // Construct the link to the dining page with a query parameter
            const detailUrl = `dining.html?name=${encodeURIComponent(place.name)}`;

            return `
                <a href="${detailUrl}" class="card-link">
                    <div class="card">
                        <img src="${imageUrl}" alt="${place.name}">
                        <div class="card-content">
                            <h3>${place.name}</h3>
                            <p>${place.description || 'No description available.'}</p>
                            <p><i class="fas fa-tag"></i> ${place.type}</p>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
    }
}); 