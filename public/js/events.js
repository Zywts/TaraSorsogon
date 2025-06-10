// This file will contain the JavaScript code for the events page.
document.addEventListener("DOMContentLoaded", () => {
  const modalOverlay = document.getElementById("event-modal");
  const modalCloseBtn = document.getElementById("modal-close");
  const eventCardsContainer = document.getElementById("events-cards-container");
  const calendarEl = document.getElementById('calendar');
  const resetViewBtn = document.getElementById('reset-view-btn');
  const toggleCalendarBtn = document.getElementById('toggle-calendar-size-btn');
  const eventsBodyContainer = document.querySelector('.events-body-container');

  // Modal fields
  const modalImage = document.getElementById("modal-image");
  const modalName = document.getElementById("modal-name");
  const modalAddress = document.getElementById("modal-address");
  const modalDescription = document.getElementById("modal-description");
  const modalDate = document.getElementById("modal-date");
  const modalTime = document.getElementById("modal-time");
  const modalPhone = document.getElementById("modal-phone");
  const modalPhoneText = document.getElementById("modal-phone-text");
  const modalFacebook = document.getElementById("modal-facebook");
  const modalMessenger = document.getElementById("modal-messenger");

  let currentPlace = null;
  let supabase = null;
  let calendar = null;

  // This function formats the date range for display in the modal.
  function formatEventDate(start, end) {
      if (!start) return 'Date not available';

      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const startDate = new Date(start);

      if (!end) {
          return startDate.toLocaleDateString('en-US', options);
      }

      const endDate = new Date(end);
      
      // If the event is on the same day, just show one date.
      if (startDate.toDateString() === endDate.toDateString()) {
          return startDate.toLocaleDateString('en-US', options);
      }
      
      // If the event spans different months, show both.
      if (startDate.getMonth() !== endDate.getMonth()) {
          return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
      }
      
      // If in the same month, format as "Month Day1–Day2, Year".
      const startDay = startDate.getDate();
      const endDay = endDate.getDate();
      const month = startDate.toLocaleDateString('en-US', { month: 'long' });
      const year = startDate.getFullYear();
      
      return `${month} ${startDay}–${endDay}, ${year}`;
  }

  // Initialize Supabase Client
  const initializeSupabase = async () => {
      try {
          const response = await fetch('/api/config');
          const config = await response.json();
          supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
      } catch (error) {
          console.error('Error initializing Supabase client:', error);
      }
  };

  async function showModal(data) {
    currentPlace = data; // Store current place
    modalImage.src = data.image_url || 'images/default-event.jpg';
    modalImage.alt = data.name;
    modalName.textContent = data.name;
    modalAddress.textContent = data.location || 'Address not available';
    modalDescription.textContent = data.description;
    
    // Use the new date formatting function
    modalDate.textContent = formatEventDate(data.start_date, data.end_date);
    modalTime.textContent = 'Not specified'; // Time is not in the DB yet

    const details = data.details || {};

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

  function hideModal() {
    modalOverlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  function closeModal() {
      hideModal();
      currentPlace = null;
  }

  function createEventCard(place) {
    const card = document.createElement('div');
    card.className = 'event-card';

    // Store all place data in the dataset for the modal
    card.dataset.place = JSON.stringify(place);
    card.dataset.name = place.name; // For the query selector

    card.innerHTML = `
        <div class="card-image">
            <img src="${place.image_url || 'images/default-event.jpg'}" alt="${place.name}" />
        </div>
        <div class="card-content">
            <h3>${place.name}</h3>
            <p>${place.location || 'Sorsogon, Philippines'}</p>
        </div>
    `;

    card.addEventListener('click', () => showModal(place));
    return card;
  }

  function loadEvents(eventsToShow) {
    if (eventCardsContainer) {
        eventCardsContainer.innerHTML = ''; // Clear existing cards
        if (!eventsToShow || eventsToShow.length === 0) {
            eventCardsContainer.innerHTML = '<p>No events found.</p>';
            return;
        }
        eventsToShow.forEach(event => {
            const card = createEventCard(event);
            eventCardsContainer.appendChild(card);
        });
    }
  }

  // --- FullCalendar Implementation ---

  // 1. Initialize FullCalendar with events from the database
  function initializeCalendar(events) {
    if (!calendarEl) return;

    // Transform event data for FullCalendar
    const calendarEvents = events.map(event => {
      // By using string manipulation, we avoid timezone conversions by the browser's Date object.
      // We treat the dates as "floating" dates, which is what we want for all-day events.
      const startDateString = event.start_date.slice(0, 10); // "YYYY-MM-DD"

      let endDateString = null;
      if (event.end_date) {
        // FullCalendar's end date is exclusive. If an event ends on the 13th,
        // we need to provide the 14th as the end date. We create a UTC date to do math,
        // which prevents the user's local timezone from affecting the calculation.
        const endDate = new Date(event.end_date.slice(0, 10) + 'T12:00:00Z');
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        endDateString = endDate.toISOString().slice(0, 10);
      }

    return {
      title: event.name,
        start: startDateString,
        end: endDateString,
        allDay: true,
      extendedProps: {
        eventId: event.id
      }
    };
  });

    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listWeek'
      },
      events: calendarEvents,
      dateClick: function(info) {
        // When a date is clicked, filter the cards shown on the right
        filterEventsByDate(info.date, events);
        calendar.gotoDate(info.date); // Center the calendar on the clicked date
      },
      eventClick: function(info) {
        // When an event on the calendar is clicked, find its data and show the modal
        const eventId = info.event.extendedProps.eventId;
        const eventData = events.find(e => e.id === eventId);
        if (eventData) {
          showModal(eventData);
        }
      }
    });

    calendar.render();

    // Add event listener for the reset button
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', () => {
            loadEvents(events); // Pass the original full list of events
            if (calendar) {
                calendar.today(); // Reset calendar to today's date
            }
        });
    }
  }
  
  // Filter event cards based on the date clicked on the calendar
  function filterEventsByDate(selectedDate, events) {
    if (!events) {
        console.error("Event list not provided to filter function.");
        return;
    }
     // Helper to get a YYYY-MM-DD string from a Date object in its local timezone
     const toLocalISOString = (date) => {
         const year = date.getFullYear();
         const month = (date.getMonth() + 1).toString().padStart(2, '0');
         const day = date.getDate().toString().padStart(2, '0');
         return `${year}-${month}-${day}`;
     };
     
     const selectedDateString = toLocalISOString(selectedDate);

     const filteredEvents = events.filter(event => {
         const eventStartDateString = event.start_date.slice(0, 10);
         
         if (event.end_date) {
             const eventEndDateString = event.end_date.slice(0, 10);
             // Compare strings directly. e.g. "2025-06-05" is >= "2025-06-01"
             return selectedDateString >= eventStartDateString && selectedDateString <= eventEndDateString;
        } else {
             return selectedDateString === eventStartDateString;
        }
    });
    loadEvents(filteredEvents);
  }

  // --- Calendar Size Toggle ---
  if (toggleCalendarBtn && eventsBodyContainer) {
    toggleCalendarBtn.addEventListener('click', () => {
      eventsBodyContainer.classList.toggle('calendar-expanded');
      
      if (eventsBodyContainer.classList.contains('calendar-expanded')) {
        toggleCalendarBtn.textContent = 'Collapse Calendar';
      } else {
        toggleCalendarBtn.textContent = 'Expand Calendar';
      }

      // This is crucial to make FullCalendar redraw itself correctly
      // after its container's size has changed.
      if (calendar) {
        setTimeout(() => {
          calendar.updateSize();
        }, 200); // A small delay allows CSS transitions to start
      }
    });
  }

  // Main function to fetch events and render everything
  async function fetchAndRenderEvents() {
    try {
        const response = await fetch('/api/events');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const events = await response.json();

        // 1. Load the event cards on the right side
        loadEvents(events);
        
        // 2. Initialize the calendar with the same event data
        initializeCalendar(events);
        
        // 3. Re-implement the filter function to use the fetched events
        window.filterEventsByDate = (selectedDate) => {
             filterEventsByDate(selectedDate, events);
        };
        
        // 4. Check for eventId in URL and open modal automatically
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get('eventId');
        if (eventId) {
            const eventToOpen = events.find(e => e.id === parseInt(eventId, 10));
            if (eventToOpen) {
                // Use a small timeout to ensure the page is fully rendered before opening the modal
                setTimeout(() => showModal(eventToOpen), 100);
            }
        }
        
    } catch (error) {
        console.error("Failed to fetch and render events:", error);
        if (eventCardsContainer) {
            eventCardsContainer.innerHTML = '<p class="error-message">Could not load events. Please try again later.</p>';
        }
    }
  }

  // --- Event Listeners ---
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeModal);
  }
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }

  // Start the process
  initializeSupabase();
  fetchAndRenderEvents();
}); 