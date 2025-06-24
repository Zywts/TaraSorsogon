document.addEventListener('DOMContentLoaded', () => {
    const municipalities = {
        "Sorsogon City": { lat: 12.97, lon: 123.99 },
        "Barcelona": { lat: 12.87, lon: 124.14 },
        "Bulan": { lat: 12.67, lon: 123.87 },
        "Bulusan": { lat: 12.75, lon: 124.13 },
        "Casiguran": { lat: 12.87, lon: 124.01 },
        "Castilla": { lat: 12.96, lon: 123.88 },
        "Donsol": { lat: 12.90, lon: 123.60 },
        "Gubat": { lat: 12.92, lon: 124.12 },
        "Irosin": { lat: 12.70, lon: 124.03 },
        "Juban": { lat: 12.85, lon: 123.98 },
        "Magallanes": { lat: 12.83, lon: 123.84 },
        "Matnog": { lat: 12.59, lon: 124.08 },
        "Pilar": { lat: 12.92, lon: 123.67 },
        "Prieto Diaz": { lat: 13.03, lon: 124.20 },
        "Santa Magdalena": { lat: 12.65, lon: 124.11 }
    };

    const carouselContainer = document.querySelector('.weather-carousel-container');
    const carouselTrack = document.getElementById('weather-carousel-track');
    const weatherInfo = document.getElementById('weather-info');
    const prevBtn = document.getElementById('prev-weather-btn');
    const nextBtn = document.getElementById('next-weather-btn');

    const itemWidth = 130 + 20; // item min-width + margin from CSS
    let autoScrollInterval;
    const municipalityKeys = Object.keys(municipalities);
    // Create a long, repeated list for seamless looping
    const repeatedKeys = [...municipalityKeys, ...municipalityKeys, ...municipalityKeys];
    let currentIndex = municipalityKeys.length; // Start in the middle block

    function populateCarousel() {
        carouselTrack.innerHTML = '';
        repeatedKeys.forEach(name => {
            const item = document.createElement('div');
            item.classList.add('weather-carousel-item');
            const data = municipalities[name];
            item.dataset.lat = data.lat;
            item.dataset.lon = data.lon;
            item.dataset.name = name;
            const nameEl = document.createElement('div');
            nameEl.classList.add('name');
            nameEl.textContent = name;
            item.appendChild(nameEl);
            carouselTrack.appendChild(item);
        });

        addCarouselEventListeners();
        moveCarousel(true, true); // Initial move with no transition
        startAutoScroll();
    }

    function moveCarousel(manual = false, initial = false) {
        carouselTrack.style.transition = initial ? 'none' : (manual ? 'transform 0.3s ease-in-out' : 'transform 0.5s ease-in-out');
        // The offset centers the current item within a 5-item view
        const offset = -currentIndex * itemWidth + (2 * itemWidth); // 2 is Math.floor(5 / 2)
        carouselTrack.style.transform = `translateX(${offset}px)`;

        const currentMunicipalityName = repeatedKeys[currentIndex];
        selectCarouselItem(currentMunicipalityName);

        const onTransitionEnd = () => {
            carouselTrack.removeEventListener('transitionend', onTransitionEnd);
            // Jump to the equivalent item in the middle block to maintain the loop
            if (currentIndex >= municipalityKeys.length * 2) {
                currentIndex = municipalityKeys.length;
                carouselTrack.style.transition = 'none';
                const resetOffset = -currentIndex * itemWidth + (2 * itemWidth);
                carouselTrack.style.transform = `translateX(${resetOffset}px)`;
            }
            if (currentIndex < municipalityKeys.length) {
                currentIndex = currentIndex + municipalityKeys.length;
                carouselTrack.style.transition = 'none';
                const resetOffset = -currentIndex * itemWidth + (2 * itemWidth);
                carouselTrack.style.transform = `translateX(${resetOffset}px)`;
            }
        };

        if (!initial) {
            carouselTrack.addEventListener('transitionend', onTransitionEnd);
        }
    }

    function addCarouselEventListeners() {
        nextBtn.addEventListener('click', () => handleManualNav('next'));
        prevBtn.addEventListener('click', () => handleManualNav('prev'));
        carouselContainer.addEventListener('mouseenter', stopAutoScroll);
        carouselContainer.addEventListener('mouseleave', startAutoScroll);
    }

    function handleManualNav(direction) {
        stopAutoScroll();
        direction === 'next' ? currentIndex++ : currentIndex--;
        moveCarousel(true);
    }

    function selectCarouselItem(name) {
        if (!name) return;
        const allItems = document.querySelectorAll('.weather-carousel-item');
        allItems.forEach(el => el.classList.remove('active'));

        const centeredItem = allItems[currentIndex];
        if (centeredItem) {
            centeredItem.classList.add('active');
        }

        const { lat, lon } = municipalities[name];
        fetchWeather(lat, lon, name);
    }

    function fetchWeather(lat, lon, name) {
        weatherInfo.innerHTML = '<p>Loading weather data...</p>';
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day,weather_code`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                const temp = data.current.temperature_2m;
                const weatherCode = data.current.weather_code;
                const isDay = data.current.is_day;
                const weatherIconClass = getWeatherIcon(weatherCode, isDay);
                const weatherDescription = getWeatherDescription(weatherCode);

                weatherInfo.innerHTML = `
                    <h3>${name}</h3>
                    <div class="weather-details">
                        <i class="fas ${weatherIconClass} weather-main-icon"></i>
                        <div class="weather-text">
                            <p><strong>Temperature:</strong> ${temp}°C</p>
                            <p><strong>Weather:</strong> ${weatherDescription}</p>
                        </div>
                    </div>
                `;
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
                weatherInfo.innerHTML = `<p>Could not load weather data for ${name}.</p>`;
            });
    }

    function getWeatherIcon(code, isDay = 1) {
        switch (code) {
            case 0: return isDay ? 'fa-sun' : 'fa-moon';
            case 1: case 2: return isDay ? 'fa-cloud-sun' : 'fa-cloud-moon';
            case 3: return 'fa-cloud';
            case 45: case 48: return 'fa-smog';
            case 51: case 53: case 55: case 56: case 57: return 'fa-cloud-rain';
            case 61: case 63: case 65: case 66: case 67: return 'fa-cloud-showers-heavy';
            case 71: case 73: case 75: case 77: return 'fa-snowflake';
            case 80: case 81: case 82: return 'fa-cloud-showers-heavy';
            case 85: case 86: return 'fa-snowflake';
            case 95: case 96: case 99: return 'fa-cloud-bolt';
            default: return 'fa-question-circle';
        }
    }

    function getWeatherDescription(code) {
        const descriptions = {
            0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Depositing rime fog',
            51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
            56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
            61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
            66: 'Light freezing rain', 67: 'Heavy freezing rain',
            71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall',
            77: 'Snow grains',
            80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
            85: 'Slight snow showers', 86: 'Heavy snow showers',
            95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
        };
        return descriptions[code] || 'Unknown weather';
    }

    function startAutoScroll() {
        stopAutoScroll();
        autoScrollInterval = setInterval(() => {
            currentIndex++;
            moveCarousel();
        }, 2000);
    }

    function stopAutoScroll() {
        clearInterval(autoScrollInterval);
    }

    populateCarousel();
}); 