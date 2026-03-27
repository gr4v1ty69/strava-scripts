// ==UserScript==
// @name         Airbnb - OSM Transit Map Replacement
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Airbnb > OSM/Thunderforest + Transit Overlay (Press T) - Maps stay synced (Press M to toggle)
// @author       You
// @match        https://www.airbnb.com/*
// @match        https://www.airbnb.fr/*
// @match        https://airbnb.com/*
// @grant        GM_addStyle
// @require      https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js
// @run-at       document-end
// ==/UserScript==

(function() {
'use strict';

const THUNDERFOREST_API_KEY = 'b0349a85d9164790ae499f1e1b619d9f';

// Inject MapLibre CSS
const maplibreCss = document.createElement('link');
maplibreCss.rel = 'stylesheet';
maplibreCss.href = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
document.head.appendChild(maplibreCss);

// Add layer switcher styles
GM_addStyle(`
    #custom-airbnb-map {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 1 !important;
    }

    #transit-map-switcher {
        position: absolute !important;
        top: 10px !important;
        left: 10px !important;
        background: white !important;
        padding: 12px !important;
        border-radius: 4px !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        z-index: 99999 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: 13px !important;
        min-width: 180px !important;
    }

    #transit-map-switcher .switcher-title {
        font-weight: 600 !important;
        margin-bottom: 10px !important;
        color: #333 !important;
        font-size: 14px !important;
        border-bottom: 1px solid #eee !important;
        padding-bottom: 8px !important;
    }

    #transit-map-switcher label {
        display: block !important;
        margin-bottom: 8px !important;
        cursor: pointer !important;
        color: #666 !important;
        user-select: none !important;
        transition: color 0.2s !important;
    }

    #transit-map-switcher label:hover {
        color: #000 !important;
    }

    #transit-map-switcher input[type="radio"] {
        margin-right: 8px !important;
        cursor: pointer !important;
    }

    #transit-map-switcher select {
        width: 100% !important;
        margin-top: 8px !important;
        padding: 4px !important;
        border: 1px solid #ddd !important;
        border-radius: 3px !important;
        font-size: 12px !important;
    }

    #transit-overlay-indicator {
        position: absolute !important;
        top: 10px !important;
        right: 10px !important;
        background: rgba(0, 0, 0, 0.7) !important;
        color: white !important;
        padding: 8px 12px !important;
        border-radius: 4px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: 12px !important;
        z-index: 99999 !important;
        display: none !important;
    }

    #transit-overlay-indicator.visible {
        display: block !important;
    }

    #search-area-button {
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: white !important;
        color: #222 !important;
        padding: 12px 24px !important;
        border-radius: 24px !important;
        border: none !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        z-index: 99998 !important;
        display: none !important;
        transition: all 0.2s !important;
    }

    #search-area-button:hover {
        background: #222 !important;
        color: white !important;
        transform: translate(-50%, -50%) scale(1.04) !important;
    }

    #search-area-button.visible {
        display: block !important;
    }

    /* Airbnb authentic marker styles */
    .custom-marker {
        transform: translate(-50%, -100%);
        cursor: pointer;
    }

    .custom-marker-inner {
        align-items: center;
        cursor: pointer;
        display: flex;
        height: 28px;
        position: relative;
        transform: scale(1);
        transform-origin: 50% 50% 0px;
        transition: transform 200ms cubic-bezier(0.35, 0, 0.65, 1);
    }

    .custom-marker:hover .custom-marker-inner {
        transform: scale(1.04);
    }

    .custom-marker-pill {
        background-color: #FFFFFF;
        border-radius: 28px;
        box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.18), 0px 0px 0px 1px rgba(0, 0, 0, 0.08);
        color: #222222;
        height: 28px;
        padding: 0px 8px;
        position: relative;
        transform: scale(1);
        transform-origin: 50% 50% 0px;
        transition: background-color 200ms cubic-bezier(0.35, 0, 0.65, 1),
                    transform 200ms cubic-bezier(0.35, 0, 0.65, 1),
                    box-shadow 200ms cubic-bezier(0.35, 0, 0.65, 1);
    }

    .custom-marker:hover .custom-marker-pill {
        background-color: #000000;
        color: #FFFFFF;
    }

    .custom-marker-content {
        align-items: center;
        display: flex;
        height: 100%;
        justify-content: center;
        opacity: 1;
        transition: opacity 200ms cubic-bezier(0.35, 0, 0.65, 1);
        white-space: nowrap;
    }

    .custom-marker-price {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        font-weight: 700;
        line-height: 18px;
    }
`);

let mapInstance = null;
let markers = [];
let transitOverlayVisible = false;
let currentTransitSource = 'thunderforest';
let mapMoved = false;
let searchButton = null;
let originalMapElement = null;
let googleMapInstance = null;
let customMapVisible = true;
let syncInProgress = false;
let googleMapListeners = [];

// Transit overlay sources (multiple fallbacks)
const transitSources = {
    thunderforest: {
        name: 'Thunderforest Transport',
        tiles: [`https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${THUNDERFOREST_API_KEY}`],
        attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>',
        opacity: 0.7
    },
    facilmap: {
        name: 'FacilMap OpenPTMap',
        tiles: ['https://tiles.facilmap.org/openptmap/{z}/{x}/{y}.png'],
        attribution: '&copy; <a href="https://github.com/dkocich/openptmap">OpenPTMap</a>',
        opacity: 0.7
    },
    openrailway: {
        name: 'OpenRailwayMap',
        tiles: [
            'https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
            'https://b.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
            'https://c.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'
        ],
        attribution: '&copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>',
        opacity: 0.6
    },
    stamen: {
        name: 'Stamen Toner Lines',
        tiles: ['https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}.png'],
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
        opacity: 0.5
    }
};

// Find Google Maps instance from Airbnb
function findGoogleMap() {
    if (googleMapInstance) return googleMapInstance;

    // Try to find the Google Maps instance in various ways
    const gmapDivs = document.querySelectorAll('[class*="gm-style"]');

    for (const div of gmapDivs) {
        // Check if the element has a __gm property (Google Maps internal)
        if (div.__gm) {
            // Access the map through internal Google Maps structure
            const mapData = div.__gm;
            if (mapData && mapData.map) {
                googleMapInstance = mapData.map;
                console.log('✅ Found Google Maps instance');
                setupGoogleMapListeners();
                return googleMapInstance;
            }
        }
    }

    // Alternative: try to find through window.google
    if (window.google && window.google.maps) {
        // Try to find map instances
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            for (const prop in el) {
                if (prop.match(/^__gm/) && el[prop]?.map) {
                    googleMapInstance = el[prop].map;
                    console.log('✅ Found Google Maps instance (alternative method)');
                    setupGoogleMapListeners();
                    return googleMapInstance;
                }
            }
        }
    }

    console.warn('⚠️ Could not find Google Maps instance');
    return null;
}

// Setup listeners on Google Map to track changes
function setupGoogleMapListeners() {
    if (!googleMapInstance || !window.google?.maps) return;

    try {
        // Listen for when Google Map moves (but only sync when Airbnb map is visible)
        const centerListener = window.google.maps.event.addListener(googleMapInstance, 'center_changed', () => {
            if (!customMapVisible && !syncInProgress) {
                updateCustomMapFromGoogle();
            }
        });

        const zoomListener = window.google.maps.event.addListener(googleMapInstance, 'zoom_changed', () => {
            if (!customMapVisible && !syncInProgress) {
                updateCustomMapFromGoogle();
            }
        });

        googleMapListeners.push(centerListener, zoomListener);
        console.log('✅ Google Maps listeners attached');
    } catch (e) {
        console.error('Error setting up Google Maps listeners:', e);
    }
}

// Update custom map position from Google Maps (in background)
function updateCustomMapFromGoogle() {
    if (!googleMapInstance || !mapInstance || syncInProgress) return;

    try {
        const center = googleMapInstance.getCenter();
        const zoom = googleMapInstance.getZoom();

        if (center && zoom !== undefined) {
            syncInProgress = true;
            mapInstance.setCenter([center.lng(), center.lat()]);
            mapInstance.setZoom(zoom);
            setTimeout(() => { syncInProgress = false; }, 100);
        }
    } catch (e) {
        console.error('Error updating custom map from Google:', e);
        syncInProgress = false;
    }
}

// Sync map position from Google Maps to MapLibre (when switching)
function syncFromGoogleMap() {
    const gmap = findGoogleMap();
    if (!gmap || !mapInstance) return;

    try {
        const center = gmap.getCenter();
        const zoom = gmap.getZoom();

        if (center && zoom !== undefined) {
            syncInProgress = true;
            mapInstance.jumpTo({
                center: [center.lng(), center.lat()],
                zoom: zoom
            });
            console.log(`✅ Synced from Google Map: [$${center.lng().toFixed(5)}, $${center.lat().toFixed(5)}], zoom ${zoom}`);
            setTimeout(() => { syncInProgress = false; }, 200);
        }
    } catch (e) {
        console.error('Error syncing from Google Map:', e);
        syncInProgress = false;
    }
}

// Sync map position from MapLibre to Google Maps (when switching)
function syncToGoogleMap() {
    const gmap = findGoogleMap();
    if (!gmap || !mapInstance) return;

    try {
        const center = mapInstance.getCenter();
        const zoom = mapInstance.getZoom();

        if (window.google && window.google.maps) {
            syncInProgress = true;
            const latLng = new window.google.maps.LatLng(center.lat, center.lng);
            gmap.setCenter(latLng);
            gmap.setZoom(Math.round(zoom));
            console.log(`✅ Synced to Google Map: [$${center.lng.toFixed(5)}, $${center.lat.toFixed(5)}], zoom ${Math.round(zoom)}`);
            setTimeout(() => { syncInProgress = false; }, 200);
        }
    } catch (e) {
        console.error('Error syncing to Google Map:', e);
        syncInProgress = false;
    }
}

// Get initial map position from Google Maps
function getInitialPosition() {
    const gmap = findGoogleMap();
    if (gmap) {
        try {
            const center = gmap.getCenter();
            const zoom = gmap.getZoom();
            if (center && zoom !== undefined) {
                console.log(`📍 Got initial position from Airbnb map: [$${center.lng()}, $${center.lat()}], zoom ${zoom}`);
                return {
                    center: [center.lng(), center.lat()],
                    zoom: zoom
                };
            }
        } catch (e) {
            console.error('Error getting initial position:', e);
        }
    }

    // Fallback to extracted coordinates
    const coords = extractCoordinates();
    return coords.length > 0 ?
        { center: [coords[0].lng, coords[0].lat], zoom: 12 } :
        { center: [-6.2603, 53.3498], zoom: 12 };
}

// Extract coordinates from page scripts
function extractCoordinates() {
    const coords = [];
    const scripts = document.querySelectorAll('script:not([src])');

    scripts.forEach(script => {
        const content = script.textContent;
        if (content.includes('latitude') && content.includes('longitude')) {
            const regex = /"(?:latitude|lat)"\s*:\s*([-\d.]+)[^}]*?"(?:longitude|lng|lon)"\s*:\s*([-\d.]+)/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                coords.push({
                    lat: parseFloat(match[1]),
                    lng: parseFloat(match[2])
                });
            }
        }
    });

    return coords;
}

// Extract clean price from text
function extractPrice(text) {
    if (!text) return '';

    const priceMatch = text.match(/([€$$£¥]\s*\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*[€$$£¥])/);
    if (priceMatch) {
        return priceMatch[1].trim();
    }

    const firstLine = text.split('\n')[0].trim();
    if (firstLine.match(/[€$£¥]/)) {
        return firstLine;
    }

    return '';
}

// Extract property data from DOM
function extractProperties() {
    const properties = [];
    const listings = document.querySelectorAll('[itemprop="itemListElement"]');

    listings.forEach((listing, idx) => {
        const link = listing.querySelector('a[href*="/rooms/"]');

        const priceEl = Array.from(listing.querySelectorAll('span')).find(span =>
            /^[€$$£¥]\s*\d+|^\d+\s*[€$$£¥]/.test(span.textContent.trim())
        );

        if (link) {
            const match = link.href.match(/\/rooms\/(\d+)/);
            const roomId = match ? match[1] : null;
            const title = listing.querySelector('[itemprop="name"]')?.content || 'Property';
            const price = priceEl ? extractPrice(priceEl.textContent) : '';

            if (price) {
                properties.push({
                    roomId,
                    title,
                    price,
                    url: link.href,
                    index: idx
                });
            }
        }
    });

    return properties;
}

// Toggle between custom map and original Airbnb map
function toggleMapView() {
    if (!originalMapElement) return;

    const customMap = document.getElementById('custom-airbnb-map');
    const switcher = document.getElementById('transit-map-switcher');
    const indicator = document.getElementById('transit-overlay-indicator');

    if (customMapVisible) {
        // Switching TO Airbnb map - sync position first
        syncToGoogleMap();

        // Show Airbnb map
        if (customMap) customMap.style.display = 'none';
        if (switcher) switcher.style.display = 'none';
        if (indicator) indicator.style.display = 'none';
        if (searchButton) searchButton.style.display = 'none';

        originalMapElement.style.opacity = '1';
        originalMapElement.style.pointerEvents = 'auto';

        customMapVisible = false;
        console.log('✅ Switched to Airbnb map (Press M to return to custom map)');
    } else {
        // Switching TO custom map - sync position first
        syncFromGoogleMap();

        // Show custom map
        if (customMap) customMap.style.display = 'block';
        if (switcher) switcher.style.display = 'block';
        if (transitOverlayVisible && indicator) indicator.style.display = 'block';

        originalMapElement.style.opacity = '0';
        originalMapElement.style.pointerEvents = 'none';

        customMapVisible = true;
        console.log('✅ Switched to custom map (Press M to return to Airbnb map)');
    }
}

// Update URL with new map bounds (triggers Airbnb to load new results)
function updateSearchArea() {
    if (!mapInstance) return;

    const center = mapInstance.getCenter();
    const zoom = mapInstance.getZoom();
    const bounds = mapInstance.getBounds();

    console.log('Updating search area:', { center, zoom });

    // Get current URL params
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    // Update map coordinates in URL
    params.set('ne_lat', bounds.getNorth().toFixed(6));
    params.set('ne_lng', bounds.getEast().toFixed(6));
    params.set('sw_lat', bounds.getSouth().toFixed(6));
    params.set('sw_lng', bounds.getWest().toFixed(6));
    params.set('zoom', Math.round(zoom).toString());

    // Update URL without reload to preserve our custom map
    const newUrl = `$${url.pathname}?$${params.toString()}`;

    // Instead of changing URL (which would reload), we'll hide the button and show a loading state
    searchButton.textContent = 'Searching...';
    searchButton.disabled = true;

    // Reload the page with new parameters to get updated results
    window.location.href = newUrl;
}

// Show "Search this area" button when map moves
function showSearchButton() {
    if (searchButton) {
        searchButton.classList.add('visible');
        mapMoved = true;
    }
}

// Hide search button
function hideSearchButton() {
    if (searchButton) {
        searchButton.classList.remove('visible');
        mapMoved = false;
    }
}

// Create custom map with property markers
function createCustomMap(mapContainer) {
    console.log('🗺️ Creating custom Airbnb map...');

    // Get initial position from Google Maps
    const initialPos = getInitialPosition();

    console.log(`Center: [$${initialPos.center[0]}, $${initialPos.center[1]}], zoom: ${initialPos.zoom}`);

    const mapDiv = document.createElement('div');
    mapDiv.id = 'custom-airbnb-map';
    mapContainer.appendChild(mapDiv);

    mapInstance = new maplibregl.Map({
        container: 'custom-airbnb-map',
        style: {
            version: 8,
            sources: {
                'thunderforest-transit': {
                    type: 'raster',
                    tiles: [
                        `https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${THUNDERFOREST_API_KEY}`
                    ],
                    tileSize: 256,
                    attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>'
                }
            },
            layers: [{
                id: 'transit-layer',
                type: 'raster',
                source: 'thunderforest-transit'
            }]
        },
        center: initialPos.center,
        zoom: initialPos.zoom
    });

    mapInstance.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    // Add "Search this area" button
    searchButton = document.createElement('button');
    searchButton.id = 'search-area-button';
    searchButton.textContent = 'Search this area';
    searchButton.addEventListener('click', () => {
        updateSearchArea();
    });
    mapContainer.appendChild(searchButton);

    // Show button when map moves
    let moveTimeout;
    mapInstance.on('movestart', () => {
        // Don't show on initial load
        if (mapInstance.loaded() && !syncInProgress) {
            showSearchButton();
        }
    });

    mapInstance.on('moveend', () => {
        // Debounce to avoid showing button during continuous movement
        clearTimeout(moveTimeout);
        if (mapMoved && !syncInProgress) {
            moveTimeout = setTimeout(() => {
                console.log('Map movement ended, ready to search new area');
            }, 300);
        }
    });

    mapInstance.on('load', () => {
        console.log('✅ Map loaded, adding property markers...');
        addPropertyMarkers();
    });

    return mapInstance;
}

// Add property markers with authentic Airbnb style
function addPropertyMarkers() {
    const coords = extractCoordinates();
    const properties = extractProperties();

    console.log(`Found $${coords.length} coordinates and $${properties.length} properties`);

    markers.forEach(marker => marker.remove());
    markers = [];

    const matchedData = properties.slice(0, coords.length).map((prop, idx) => ({
        ...prop,
        lat: coords[idx].lat,
        lng: coords[idx].lng
    }));

    matchedData.forEach(property => {
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.innerHTML = `
            <div class="custom-marker-inner">
                <div class="custom-marker-pill">
                    <div class="custom-marker-content">
                        <span class="custom-marker-price">${property.price}</span>
                    </div>
                </div>
            </div>
        `;
        el.title = property.title;

        el.addEventListener('click', () => {
            window.open(property.url, '_blank');
        });

        const marker = new maplibregl.Marker({
            element: el,
            anchor: 'bottom'
        })
            .setLngLat([property.lng, property.lat])
            .addTo(mapInstance);

        markers.push(marker);
    });

    console.log(`✅ Added ${markers.length} property markers with prices`);

    // Hide search button after loading new results
    hideSearchButton();
}

// Toggle transit overlay
function toggleTransitOverlay(sourceName = null) {
    if (!mapInstance) return;

    const sourceToUse = sourceName || currentTransitSource;
    const sourceConfig = transitSources[sourceToUse];

    if (!sourceConfig) {
        console.error('Invalid transit source:', sourceToUse);
        return;
    }

    const overlaySourceId = 'transit-overlay';
    const overlayLayerId = 'transit-overlay-layer';

    try {
        if (transitOverlayVisible) {
            if (mapInstance.getLayer(overlayLayerId)) {
                mapInstance.removeLayer(overlayLayerId);
            }
            if (mapInstance.getSource(overlaySourceId)) {
                mapInstance.removeSource(overlaySourceId);
            }
            transitOverlayVisible = false;
            console.log('Transit overlay hidden');
            updateOverlayIndicator(false);
        } else {
            if (!mapInstance.getSource(overlaySourceId)) {
                mapInstance.addSource(overlaySourceId, {
                    type: 'raster',
                    tiles: sourceConfig.tiles,
                    tileSize: 256,
                    attribution: sourceConfig.attribution,
                    maxzoom: 20
                });
            }

            if (!mapInstance.getLayer(overlayLayerId)) {
                mapInstance.addLayer({
                    id: overlayLayerId,
                    type: 'raster',
                    source: overlaySourceId,
                    paint: {
                        'raster-opacity': sourceConfig.opacity
                    }
                });
            }

            transitOverlayVisible = true;
            currentTransitSource = sourceToUse;
            console.log(`Transit overlay shown (${sourceConfig.name})`);
            updateOverlayIndicator(true, sourceConfig.name);
        }
    } catch (e) {
        console.error('Error toggling transit overlay:', e);
    }
}

function changeTransitSource(sourceName) {
    if (transitOverlayVisible) {
        toggleTransitOverlay();
        setTimeout(() => {
            toggleTransitOverlay(sourceName);
        }, 100);
    } else {
        currentTransitSource = sourceName;
    }
}

function updateOverlayIndicator(visible, sourceName = '') {
    const indicator = document.getElementById('transit-overlay-indicator');
    if (indicator) {
        if (visible) {
            indicator.innerHTML = `🚇 Transit Overlay Active: ${sourceName}<br><small>(Press T to toggle)</small>`;
            indicator.classList.add('visible');
        } else {
            indicator.classList.remove('visible');
        }
    }
}

function addOverlayIndicator(mapContainer) {
    const existing = document.getElementById('transit-overlay-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.id = 'transit-overlay-indicator';
    indicator.innerHTML = '🚇 Transit Overlay Active (Press T to toggle)';
    mapContainer.appendChild(indicator);
}

function applyCustomStyle(styleType = 'transit') {
    if (!mapInstance) return;

    const styles = {
        transit: {
            version: 8,
            sources: {
                'thunderforest-transit': {
                    type: 'raster',
                    tiles: [
                        `https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${THUNDERFOREST_API_KEY}`
                    ],
                    tileSize: 256,
                    attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>'
                }
            },
            layers: [{
                id: 'transit-layer',
                type: 'raster',
                source: 'thunderforest-transit'
            }]
        },
        'google-maps': {
            version: 8,
            sources: {
                'google-roadmap': {
                    type: 'raster',
                    tiles: [
                        'https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                        'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                        'https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
                    ],
                    tileSize: 256,
                    attribution: '&copy; Google Maps'
                }
            },
            layers: [{
                id: 'google-layer',
                type: 'raster',
                source: 'google-roadmap'
            }]
        },
        osm: {
            version: 8,
            sources: {
                'osm': {
                    type: 'raster',
                    tiles: [
                        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '&copy; OpenStreetMap'
                }
            },
            layers: [{
                id: 'osm-layer',
                type: 'raster',
                source: 'osm'
            }]
        }
    };

    console.log(`Applying ${styleType} style...`);

    const wasOverlayVisible = transitOverlayVisible;
    const previousSource = currentTransitSource;

    mapInstance.setStyle(styles[styleType]);

    mapInstance.once('style.load', () => {
        console.log('Style loaded');
        addPropertyMarkers();

        if (wasOverlayVisible) {
            transitOverlayVisible = false;
            toggleTransitOverlay(previousSource);
        }
    });
}

function addLayerSwitcher(mapContainer) {
    const existing = document.getElementById('transit-map-switcher');
    if (existing) existing.remove();

    const switcher = document.createElement('div');
    switcher.id = 'transit-map-switcher';

    let sourceOptions = '';
    for (const [key, config] of Object.entries(transitSources)) {
        const selected = key === currentTransitSource ? 'selected' : '';
        sourceOptions += `<option value="${key}" ${selected}>${config.name}</option>`;
    }

    switcher.innerHTML = `
        <div class="switcher-title">🗺️ Map Style</div>
        <label>
            <input type="radio" name="map-style" value="transit" checked>
            🚌 Transit (Thunderforest)
        </label>
        <label>
            <input type="radio" name="map-style" value="google-maps">
            🗺️ Google Maps
        </label>
        <label>
            <input type="radio" name="map-style" value="osm">
            📍 OpenStreetMap
        </label>
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee;">
            <div style="color: #666; font-size: 11px; margin-bottom: 4px;">Transit Overlay Source:</div>
            <select id="transit-source-select">
                ${sourceOptions}
            </select>
        </div>
        <div style="margin-top: 8px; color: #999; font-size: 11px;">
            <strong>T</strong> = Toggle overlay<br>
            <strong>M</strong> = Airbnb map (synced)
        </div>
    `;

    mapContainer.appendChild(switcher);

    switcher.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            applyCustomStyle(e.target.value);
        });
    });

    const sourceSelect = switcher.querySelector('#transit-source-select');
    sourceSelect.addEventListener('change', (e) => {
        changeTransitSource(e.target.value);
    });

    console.log('✅ Layer switcher added');
}

function addKeyboardListener() {
    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        const isInputField = activeElement.tagName === 'INPUT' ||
                           activeElement.tagName === 'TEXTAREA' ||
                           activeElement.isContentEditable;

        if (!isInputField) {
            if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                toggleTransitOverlay();
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                toggleMapView();
            }
        }
    });
    console.log('✅ Keyboard listener added (Press T for transit overlay, M to toggle map view)');
}

function init() {
    console.log('🚀 Initializing Airbnb transit map replacement...');

    const checkInterval = setInterval(() => {
        const mapContainer = document.querySelector('[data-testid*="map"]');
        const gmStyle = document.querySelector('[class*="gm-style"]');

        if (mapContainer && gmStyle) {
            clearInterval(checkInterval);
            console.log('✅ Found Airbnb map container');

            originalMapElement = gmStyle;
            gmStyle.style.opacity = '0';
            gmStyle.style.pointerEvents = 'none';

            setTimeout(() => {
                // Try to find Google Maps instance first
                findGoogleMap();

                createCustomMap(mapContainer);
                addLayerSwitcher(mapContainer);
                addOverlayIndicator(mapContainer);
                addKeyboardListener();

                console.log('✅ Custom map initialized! Maps are synchronized.');
                console.log('📝 Press M to toggle between Airbnb and custom map (positions stay synced)');
            }, 1000);
        }
    }, 500);

    setTimeout(() => clearInterval(checkInterval), 30000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

})();
