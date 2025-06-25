// js/resources.js

document.addEventListener('DOMContentLoaded', () => {
  // 1) Data lists with town metadata
  const accommodations = [
    { name: 'Lacsa Hilton Beach Resort', town: 'Gubat' },
    { name: 'Rizal Beach Resort',            town: 'Gubat' },
    { name: 'Suki Beach Resort',             town: 'Santa Magdalena' },
    { name: '401K Resort',                   town: 'Irosin' },
    { name: 'Ozi Camp Resort',               town: 'Prieto Diaz' },
    { name: 'Woods Camp Resort',             town: 'Bulusan' },
    { name: 'Sotto Resort',                  town: 'Castilla' },
    { name: 'Siama Hotel',                   town: 'Sorsogon City' },
    { name: 'Rosewall Garden Resort',        town: 'Donsol' },
    { name: 'Residencia Del Hamor',          town: 'Casiguran' }
  ];

  const attractions = [
    { name: 'Bulusan Volcano Natural Park',  town: 'Bulusan' },
    { name: 'Bayugin Falls',                 town: 'Bulusan' },
    { name: 'Lola Sayong Eco-Surf Camp',     town: 'Gubat' },
    { name: 'Juag Lagoon Marine Sanctuary',  town: 'Matnog' },
    { name: 'Subic Beach (Pink Sand Beach)', town: 'Matnog' },
    { name: 'Whale Shark Interaction Center',town: 'Donsol' },
    { name: 'San Benon Hot Springs',         town: 'Irosin' },
    { name: 'Mangrove Eco-Park',             town: 'Prieto Diaz' },
    { name: 'Balading Beach',                town: 'Santa Magdalena' },
    { name: 'Talaonga Beach',                town: 'Santa Magdalena' },
    { name: 'Parola Beach and Lighthouse Station', town: 'Magallanes' },
    { name: 'Juban Heritage Houses',         town: 'Juban' },
    { name: 'Sorsogon Cathedral (Saints Peter and Paul Parish Cathedral)', town: 'Sorsogon City' },
    { name: 'Botong Twin Falls',             town: 'Sorsogon City' },
    { name: 'Barcelona Church (St. Joseph Parish Church)', town: 'Barcelona' }
  ];

  const restaurants = [
    { name: "Balay Cena Una",                town: "Sorsogon City" },
    { name: "Victoria's Grille",             town: "Sorsogon City" },
    { name: "Casa Dominga",                  town: "Sorsogon City" },
    { name: "Kochi Café",                    town: "Sorsogon City" },
    { name: "Una Pizzeria",                  town: "Sorsogon City" },
    { name: "Marion's Garden",               town: "Sorsogon City" },
    { name: "Padrino Cafe",                  town: "Sorsogon City" },
    { name: "Que Pasa",                      town: "Sorsogon City" },
    { name: "Skyview Restobar",              town: "Sorsogon City" },
    { name: "Caridad RestoBar",              town: "Donsol" },
    { name: "Baracuda Seafood and Cocktail", town: "Donsol" },
    { name: "Roberto's Restobar",            town: "Donsol" },
    { name: "Yanina's Snackbite Restaurant and Bar", town: "Donsol" },
    { name: "Agapito's Cafe",                town: "Pilar" }
  ];

  // 2) Grab DOM elements
  const accomSelect   = document.getElementById('accommodation-select');
  const daysContainer = document.getElementById('days-container');
  const dayTemplate   = document.getElementById('day-template');
  const genBtn        = document.getElementById('generate-itinerary-btn');
  const outputEl      = document.getElementById('custom-itinerary-output');

  // 3) Populate accommodation dropdown
  accommodations.forEach(a => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = a.name;
    accomSelect.appendChild(opt);
  });

  // 4) Create three day blocks from template
  const dayBlocks = [];
  for (let day = 1; day <= 3; day++) {
    const clone = dayTemplate.content.cloneNode(true);
    const wrapper = clone.querySelector('.day-block');
    wrapper.querySelector('h3').textContent = `Day ${day}`;
    const [attrGroup, restGroup] = wrapper.querySelectorAll('.checkbox-group');

    // assign data-target and data-list for filtering
    const attrInput = attrGroup.querySelector('.filter-input');
    const restInput = restGroup.querySelector('.filter-input');
    const attrContainer = attrGroup.querySelector('.checkbox-container');
    const restContainer = restGroup.querySelector('.checkbox-container');

    attrInput.dataset.target = `attr-${day}`;
    restInput.dataset.target = `rest-${day}`;
    attrContainer.dataset.list = `attr-${day}`;
    restContainer.dataset.list = `rest-${day}`;

    daysContainer.appendChild(clone);
    dayBlocks.push({ attrGroup, restGroup, attrContainer, restContainer });
  }

  // 5) Helper to build a checkbox label
  function buildCheckbox(name, item) {
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.name = name;
    chk.value = item.name;
    label.append(chk, document.createTextNode(` ${item.name}`));
    return label;
  }

  // 6) Populate each day's checkbox containers
  dayBlocks.forEach(({ attrContainer, restContainer }, idx) => {
    const day = idx + 1;
    attractions.forEach(a => {
      attrContainer.appendChild(buildCheckbox(`attr-day${day}`, a));
    });
    restaurants.forEach(r => {
      restContainer.appendChild(buildCheckbox(`rest-day${day}`, r));
    });
  });

  // 7) Enforce a max of 3 selections per container
  function enforceLimit(container, limit = 3) {
    const boxes = Array.from(container.querySelectorAll('input[type=checkbox]'));
    boxes.forEach(box =>
      box.addEventListener('change', () => {
        const checked = boxes.filter(b => b.checked);
        if (checked.length > limit) {
          box.checked = false;
          alert(`You can only select up to ${limit} items here.`);
        }
      })
    );
  }
  dayBlocks.forEach(({ attrContainer, restContainer }) => {
    enforceLimit(attrContainer);
    enforceLimit(restContainer);
  });

  // 8) Live‐filter wiring
  document.querySelectorAll('.filter-input').forEach(input => {
    const listType = input.dataset.target;
    input.addEventListener('input', () => {
      const term = input.value.trim().toLowerCase();
      const container = input.parentElement.querySelector(
        `.checkbox-container[data-list="${listType}"]`
      );
      container.querySelectorAll('label').forEach(label => {
        label.style.display = label.textContent.toLowerCase().includes(term)
          ? 'block'
          : 'none';
      });
    });
  });

  // 9) Tips & routing helpers
  const tips = [
    'Start early to beat the heat.',
    'Carry a refillable water bottle.',
    'Keep small change handy.',
    'Wear comfortable shoes.',
    'Check the weather forecast.'
  ];
  function randomTip() {
    return tips[Math.floor(Math.random() * tips.length)];
  }
  function getRoute(from, to) {
    return from === to
      ? `Hop on a tricycle around ${from}.`
      : `Take a UV-Express/bus from ${from} to ${to}, then a tricycle.`;
  }

  // 10) Generate the itinerary on button click (cleaned‐up version)
  genBtn.addEventListener('click', () => {
    outputEl.innerHTML = '';  // clear previous
    const accomName = accomSelect.value;
    if (!accomName) return alert('Please select an accommodation.');
    const accomTown = accommodations.find(a => a.name === accomName).town;

    let html = '<h3>Your 3-Day Itinerary</h3><ol>';

    dayBlocks.forEach(({ attrContainer, restContainer }, idx) => {
      const dayNum = idx + 1;
      const chosenAttrs = Array.from(
        attrContainer.querySelectorAll('input:checked')
      ).map(i => i.value);
      const chosenRests = Array.from(
        restContainer.querySelectorAll('input:checked')
      ).map(i => i.value);

      if (!chosenAttrs.length || !chosenRests.length) {
        return alert(
          `Day ${dayNum}: please select at least 1 attraction and 1 restaurant.`
        );
      }

      // Gather towns
      const attrTowns = chosenAttrs.map(name =>
        attractions.find(a => a.name === name).town
      );
      const lastAttrTown = attrTowns[attrTowns.length - 1];
      const restTowns = chosenRests.map(name =>
        restaurants.find(r => r.name === name).town
      );
      const firstRestTown = restTowns[0];

      // Build Day block
      html += `<li><strong>Day ${dayNum}:</strong><ul>`;

      // Attractions list
      html += `<li><em>Attractions:</em> ${chosenAttrs.join(', ')}.</li>`;
      // Getting there → attractions
      if (attrTowns.every(t => t === attrTowns[0])) {
        html += `<li><em>Getting there:</em> ${
          getRoute(accomTown, attrTowns[0])
        }</li>`;
      } else {
        html += `<li><em>Getting there:</em> ${getRoute(
          accomTown,
          attrTowns[0]
        )}`;
        for (let i = 1; i < attrTowns.length; i++) {
          html += ` Then ${getRoute(attrTowns[i - 1], attrTowns[i])}`;
        }
        html += `</li>`;
      }

      // Restaurants list
      html += `<li><em>Dining:</em> ${chosenRests.join(', ')}.</li>`;
      // Getting there → restaurants
      if (restTowns.every(t => t === lastAttrTown)) {
        html += `<li><em>Getting there:</em> Hop on a tricycle around ${lastAttrTown}.</li>`;
      } else {
        html += `<li><em>Getting there:</em> ${getRoute(
          lastAttrTown,
          firstRestTown
        )}</li>`;
      }

      // Daily tip
      html += `<li><strong>Tip:</strong> ${randomTip()}</li>`;

      html += '</ul></li>';
    });

    html += '</ol>';
    outputEl.innerHTML = html;
    outputEl.scrollIntoView({ behavior: 'smooth' });
  });
}); 