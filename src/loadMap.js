const maplibregl = require('maplibre-gl');

chrome.runtime.sendMessage(
  { type: 'newTabLoaded' },
  (data) => {

    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.error('No Willhaben data received');
      return;
    }

    initializeMap(data);
  }
);

function initializeMap(data) {

  const properties = data.map(item => {

    if (!item.coordinates) return null;

    const coordinates = item.coordinates
      .split(',')
      .map(Number);

    if (
      coordinates.length !== 2 ||
      !coordinates.every(Number.isFinite)
    ) {
      return null;
    }

    return {
      ...item,
      latitude: coordinates[0],
      longitude: coordinates[1]
    };

  }).filter(Boolean);

  if (!properties.length) {
    console.error('No valid coordinates');
    return;
  }

  const map = new maplibregl.Map({
    container: 'map',

    style: 'https://tiles.openfreemap.org/styles/liberty',

    center: [
      properties[0].longitude,
      properties[0].latitude
    ],

    zoom: 11
  });

  map.addControl(
    new maplibregl.NavigationControl(),
    'top-left'
  );

  const bounds = new maplibregl.LngLatBounds();

  properties.forEach(property => {

    const position = [
      property.longitude,
      property.latitude
    ];

    bounds.extend(position);

    const container = document.createElement('div');
    container.className = 'property-popup';

    if (property.imageUrl) {
      const img = document.createElement('img');
      img.src = property.imageUrl;
      img.style.width = '180px';
      img.style.maxWidth = '100%';
      container.appendChild(img);
    }

    const title = document.createElement('h3');
    title.textContent = property.description || 'Immobilie';
    container.appendChild(title);

    const price = document.createElement('p');
    price.textContent = property.price || '';
    container.appendChild(price);

    if (property.detailUrl) {
      const link = document.createElement('a');
      link.href = property.detailUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Auf Willhaben öffnen';
      container.appendChild(link);
    }

    const popup = new maplibregl.Popup({
      maxWidth: '300px'
    }).setDOMContent(container);

    new maplibregl.Marker()
      .setLngLat(position)
      .setPopup(popup)
      .addTo(map);

  });

  map.fitBounds(bounds, {
    padding: 60,
    maxZoom: 14
  });


  // Address search using OpenStreetMap Nominatim
  let addressMarker = null;
  let lastSearchTime = 0;

  const addressForm = document.getElementById('address-form');
  const addressInput = document.getElementById('address-input');
  const searchStatus = document.getElementById('search-status');

  addressForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const address = addressInput.value.trim();

    if (!address) return;

    const now = Date.now();

    // Respect Nominatim's maximum of one request per second
    if (now - lastSearchTime < 1100) {
      searchStatus.textContent = 'Bitte kurz warten.';
      return;
    }

    lastSearchTime = now;
    searchStatus.textContent = 'Adresse wird gesucht ...';

    const button = addressForm.querySelector('button');
    button.disabled = true;

    try {
      const endpoint = new URL(
        'https://nominatim.openstreetmap.org/search'
      );

      endpoint.searchParams.set('q', address);
      endpoint.searchParams.set('format', 'jsonv2');
      endpoint.searchParams.set('limit', '1');
      endpoint.searchParams.set('accept-language', 'de');

      const response = await fetch(endpoint.toString());

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      const results = await response.json();

      if (!results.length) {
        searchStatus.textContent = 'Adresse nicht gefunden.';
        return;
      }

      const latitude = Number(results[0].lat);
      const longitude = Number(results[0].lon);

      if (!Number.isFinite(latitude) ||
          !Number.isFinite(longitude)) {
        throw new Error('Ungültige Koordinaten');
      }

      const position = [longitude, latitude];

      // Remove previous address marker
      if (addressMarker) {
        addressMarker.remove();
      }

      const markerElement = document.createElement('div');

      markerElement.style.width = '18px';
      markerElement.style.height = '18px';
      markerElement.style.backgroundColor = '#e53935';
      markerElement.style.border = '3px solid white';
      markerElement.style.borderRadius = '50%';
      markerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';

      addressMarker = new maplibregl.Marker({
        element: markerElement
      })
        .setLngLat(position)
        .setPopup(
          new maplibregl.Popup().setText(results[0].display_name)
        )
        .addTo(map);

      // Center map on searched address
      map.flyTo({
        center: position,
        zoom: 14,
        essential: true
      });

      searchStatus.textContent = 'Adresse gefunden.';

    } catch (error) {
      console.error('[Willhaben Map] Address search error:', error);
      searchStatus.textContent = 'Adresssuche fehlgeschlagen.';
    } finally {
      button.disabled = false;
    }
  });

  console.log(
    '[Willhaben Map] Loaded',
    properties.length,
    'properties'
  );
}
