// ==UserScript==
// @name         Airbnb - OSM Transit Map Replacement
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Airbnb > OSM/Thunderforest + Transit Overlay (Press T) - Maps stay synced (Press M to toggle)
// @author       You
// @match        https://www.airbnb.com/*
// @match        https://www.airbnb.fr/*
// @match        https://airbnb.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ─── API KEY ────────────────────────────────────────────────────────────────
    // Stored in Tampermonkey storage on first run instead of hardcoded in source.
    // To reset: run GM_setValue('thunderforest_api_key', '') in the console.
    let THUNDERFOREST_API_KEY = GM_getValue('thunderforest_api_key', '');
    if (!THUNDERFOREST_API_KEY) {
        THUNDERFOREST_API_KEY = prompt(
            'Enter your Thunderforest API key (get one free at thunderforest.com).\n' +
            'It will be saved in Tampermonkey storage and never re-asked.'
        ) || '';
        GM_setValue('thunderforest_api_key', THUNDERFOREST_API_KEY);
    }

    // ─── MAPLIBRE CSS ────────────────────────────────────────────────────────────
    const maplibreCss = document.createElement('link');
    maplibreCss.rel = 'stylesheet';
    maplibreCss.href = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
    document.head.appendChild(maplibreCss);

    // ─── STYLES ──────────────────────────────────────────────────────────────────
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

    // ─── MAP STYLE DEFINITIONS ───────────────────────────────────────────────────
    // Single source of truth — used by both createCustomMap() and applyCustomStyle().
    // NOTE: Google Maps tiles (mt0/mt1/mt2) are undocumented and ToS-violating;
    //       they may break without warning. OSM is the safest default alternative.
    function buildMapStyles() {
        return {
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
                layers: [{ id: 'transit-layer', type: 'raster', source: 'thunderforest-transit' }]
            },
            'google-maps': {
                version: 8,
                sources: {
                    'google-roadmap': {
                        type: 'raster',
                        // ⚠️ Unofficial Google tile URLs — may break without notice.
                        tiles: [
                            'https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                            'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                            'https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
                        ],
                        tileSize: 256,
                        attribution: '&copy; Google Maps'
                    }
                },
                layers: [{ id: 'google-layer', type: 'raster', source: 'google-roadmap' }]
            },
            osm: {
                version: 8,
                sources: {
                    osm: {
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
                layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }]
            }
        };
    }

    // ─── STATE ───────────────────────────────────────────────────────────────────
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
    let spaNavigationSetup = false;

    // ─── TRANSIT OVERLAY SOURCES ─────────────────────────────────────────────────
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

    // ─── GOOGLE MAPS DETECTION ───────────────────────────────────────────────────

    function findGoogleMap() {
        if (googleMapInstance) return googleMapInstance;

        // Method 1: Check known Google Maps internal property on gm-style divs.
        // Scoped to gm-style elements — no full-DOM scan needed.
        const gmapDivs = document.querySelectorAll('[class*="gm-style"]');
        for (const div of gmapDivs) {
            try {
                if (div.__gm && div.__gm.map) {
                    googleMapInstance = div.__gm.map;
                    console.log('✅ Found Google Maps instance (method 1)');
                    setupGoogleMapListeners();
                    return googleMapInstance;
                }
            } catch (e) {
                // Internal property access can throw — continue searching
            }
        }

        // Method 2: Scan only gm-style elements (not all DOM nodes) for __gm* variants.
        // Guard: bail if there are suspiciously many candidates to avoid a hang.
        if (window.google && window.google.maps) {
            if (gmapDivs.length > 100) {
                console.warn('⚠️ Too many gm-style elements to scan safely, skipping method 2');
            } else {
                for (const el of gmapDivs) {
                    try {
                        for (const prop of Object.keys(el)) {
                            if (/^__gm/.test(prop) && el[prop]?.map) {
                                googleMapInstance = el[prop].map;
                                console.log('✅ Found Google Maps instance (method 2)');
                                setupGoogleMapListeners();
                                return googleMapInstance;
                            }
                        }
                    } catch (e) {
                        // Property enumeration can fail on some elements — continue
                    }
                }
            }
        }

        console.warn('⚠️ Could not find Google Maps instance');
        return null;
    }

    function cleanupGoogleMapListeners() {
        if (window.google?.maps?.event) {
            googleMapListeners.forEach(l => {
                try { window.google.maps.event.removeListener(l); } catch (e) { /* ignore */ }
            });
        }
        googleMapListeners = [];
    }

    function setupGoogleMapListeners() {
        if (!googleMapInstance || !window.google?.maps) return;

        // Always clean up before attaching to avoid duplicate listeners on re-init
        cleanupGoogleMapListeners();

        try {
            const centerListener = window.google.maps.event.addListener(
                googleMapInstance, 'center_changed', () => {
                    if (!customMapVisible && !syncInProgress) {
                        updateCustomMapFromGoogle();
                    }
                }
            );
            const zoomListener = window.google.maps.event.addListener(
                googleMapInstance, 'zoom_changed', () => {
                    if (!customMapVisible && !syncInProgress) {
                        updateCustomMapFromGoogle();
                    }
                }
            );
            googleMapListeners.push(centerListener, zoomListener);
            console.log('✅ Google Maps listeners attached');
        } catch (e) {
            console.error('Error setting up Google Maps listeners:', e);
        }
    }

    // ─── MAP SYNC ────────────────────────────────────────────────────────────────

    // Sets syncInProgress safely, always clearing it even if an error is thrown.
    function withSync(fn) {
        if (syncInProgress) return;
        syncInProgress = true;
        try {
            fn();
        } catch (e) {
            console.error('Sync error:', e);
        } finally {
            setTimeout(() => { syncInProgress = false; }, 200);
        }
    }

    function updateCustomMapFromGoogle() {
        if (!googleMapInstance || !mapInstance) return;
        try {
            const center = googleMapInstance.getCenter();
            const zoom = googleMapInstance.getZoom();
            if (center && zoom !== undefined) {
                withSync(() => {
                    mapInstance.setCenter([center.lng(), center.lat()]);
                    mapInstance.setZoom(zoom);
                });
            }
        } catch (e) {
            console.error('Error updating custom map from Google:', e);
        }
    }

    function syncFromGoogleMap() {
        const gmap = findGoogleMap();
        if (!gmap || !mapInstance) return;
        try {
            const center = gmap.getCenter();
            const zoom = gmap.getZoom();
            if (center && zoom !== undefined) {
                withSync(() => {
                    mapInstance.jumpTo({
                        center: [center.lng(), center.lat()],
                        zoom: zoom
                    });
                    console.log(`✅ Synced from Google Map: [${center.lng().toFixed(5)}, ${center.lat().toFixed(5)}], zoom ${zoom}`);
                });
            }
        } catch (e) {
            console.error('Error syncing from Google Map:', e);
        }
    }

    function syncToGoogleMap() {
        const gmap = findGoogleMap();
        if (!gmap || !mapInstance || !window.google?.maps) return;
        try {
            const center = mapInstance.getCenter();
            const zoom = mapInstance.getZoom();
            withSync(() => {
                const latLng = new window.google.maps.LatLng(center.lat, center.lng);
                gmap.setCenter(latLng);
                gmap.setZoom(Math.round(zoom));
                console.log(`✅ Synced to Google Map: [${center.lng.toFixed(5)}, ${center.lat.toFixed(5)}], zoom ${Math.round(zoom)}`);
            });
        } catch (e) {
            console.error('Error syncing to Google Map:', e);
        }
    }

    // ─── INITIAL POSITION ────────────────────────────────────────────────────────

    function getInitialPosition() {
        const gmap = findGoogleMap();
        if (gmap) {
            try {
                const center = gmap.getCenter();
                const zoom = gmap.getZoom();
                if (center && zoom !== undefined) {
                    console.log(`📍 Got initial position from Airbnb map: [${center.lng()}, ${center.lat()}], zoom ${zoom}`);
                    return { center: [center.lng(), center.lat()], zoom };
                }
            } catch (e) {
                console.error('Error getting initial position:', e);
            }
        }

        const coords = extractCoordinates();
        return coords.length > 0
            ? { center: [coords[0].lng, coords[0].lat], zoom: 12 }
            : { center: [-6.2603, 53.3498], zoom: 12 };
    }

    // ─── DATA EXTRACTION ─────────────────────────────────────────────────────────

    function extractCoordinates() {
        const coords = [];
        const coordMap = new Map(); // deduplicate by roomId where possible
        const scripts = document.querySelectorAll('script:not([src])');

        scripts.forEach(script => {
            const content = script.textContent;

            // Prefer id-anchored matches to avoid picking up unrelated lat/lng values
            // (e.g. map viewport bounds, analytics pings).
            const idAnchoredRegex =
                /"id"\s*:\s*(\d+)[^}]{0,200}?"latitude"\s*:\s*([-\d.]+)[^}]{0,200}?"longitude"\s*:\s*([-\d.]+)/g;
            let match;
            while ((match = idAnchoredRegex.exec(content)) !== null) {
                const id = match[1];
                const lat = parseFloat(match[2]);
                const lng = parseFloat(match[3]);
                if (!coordMap.has(id) && isFinite(lat) && isFinite(lng)) {
                    coordMap.set(id, { id, lat, lng });
                }
            }

            // Fallback: generic lat/lng pairs only if id-anchored pass found nothing
            if (coordMap.size === 0 && content.includes('latitude') && content.includes('longitude')) {
                const genericRegex =
                    /"(?:latitude|lat)"\s*:\s*([-\d.]+)[^}]*?"(?:longitude|lng|lon)"\s*:\s*([-\d.]+)/g;
                while ((match = genericRegex.exec(content)) !== null) {
                    const lat = parseFloat(match[1]);
                    const lng = parseFloat(match[2]);
                    if (isFinite(lat) && isFinite(lng)) {
                        coords.push({ lat, lng });
                    }
                }
            }
        });

        return coordMap.size > 0 ? [...coordMap.values()] : coords;
    }

    function extractPrice(text) {
        if (!text) return '';
        // FIX: was [€$$£¥] — doubled $ inside character class was a typo, use \$
        const priceMatch = text.match(/([€$£¥]\s*\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*[€$£¥])/);
        if (priceMatch) return priceMatch[1].trim();
        const firstLine = text.split('\n')[0].trim();
        if (firstLine.match(/[€$£¥]/)) return firstLine;
        return '';
    }

    function extractProperties() {
        const properties = [];
        const listings = document.querySelectorAll('[itemprop="itemListElement"]');

        listings.forEach((listing, idx) => {
            const link = listing.querySelector('a[href*="/rooms/"]');
            const priceEl = Array.from(listing.querySelectorAll('span')).find(span =>
                /^[€$£¥]\s*\d+|^\d+\s*[€$£¥]/.test(span.textContent.trim())
            );

            if (link) {
                const match = link.href.match(/\/rooms\/(\d+)/);
                const roomId = match ? match[1] : null;
                const title = listing.querySelector('[itemprop="name"]')?.content || 'Property';
                const price = priceEl ? extractPrice(priceEl.textContent) : '';

                if (price) {
                    properties.push({ roomId, title, price, url: link.href, index: idx });
                }
            }
        });

        return properties;
    }

    // ─── MAP TOGGLE ──────────────────────────────────────────────────────────────

    function toggleMapView() {
        if (!originalMapElement) return;

        const customMap = document.getElementById('custom-airbnb-map');
        const switcher = document.getElementById('transit-map-switcher');
        const indicator = document.getElementById('transit-overlay-indicator');

        if (customMapVisible) {
            syncToGoogleMap();
            if (customMap) customMap.style.display = 'none';
            if (switcher) switcher.style.display = 'none';
            if (indicator) indicator.style.display = 'none';
            if (searchButton) searchButton.style.display = 'none';
            originalMapElement.style.opacity = '1';
            originalMapElement.style.pointerEvents = 'auto';
            customMapVisible = false;
            console.log('✅ Switched to Airbnb map (Press M to return)');
        } else {
            syncFromGoogleMap();
            if (customMap) customMap.style.display = 'block';
            if (switcher) switcher.style.display = 'block';
            if (transitOverlayVisible && indicator) indicator.style.display = 'block';
            originalMapElement.style.opacity = '0';
            originalMapElement.style.pointerEvents = 'none';
            customMapVisible = true;
            console.log('✅ Switched to custom map (Press M to return)');
        }
    }

    // ─── SEARCH AREA ─────────────────────────────────────────────────────────────

    function updateSearchArea() {
        if (!mapInstance) return;

        const zoom = mapInstance.getZoom();
        const bounds = mapInstance.getBounds();

        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);

        params.set('ne_lat', bounds.getNorth().toFixed(6));
        params.set('ne_lng', bounds.getEast().toFixed(6));
        params.set('sw_lat', bounds.getSouth().toFixed(6));
        params.set('sw_lng', bounds.getWest().toFixed(6));
        params.set('zoom', Math.round(zoom).toString());

        // FIX: was `$${url.pathname}?$${params.toString()}` — spurious $ prefixes
        const newUrl = `${url.pathname}?${params.toString()}`;

        if (searchButton) {
            searchButton.textContent = 'Searching...';
            searchButton.disabled = true;
        }

        window.location.href = newUrl;
    }

    function showSearchButton() {
        if (searchButton) {
            searchButton.classList.add('visible');
            mapMoved = true;
        }
    }

    function hideSearchButton() {
        if (searchButton) {
            searchButton.classList.remove('visible');
            mapMoved = false;
        }
    }

    // ─── MAP CREATION ────────────────────────────────────────────────────────────

    function createCustomMap(mapContainer) {
        console.log('🗺️ Creating custom Airbnb map...');

        // FIX: clean up any previous instance so MapLibre doesn't throw on duplicate id
        const existingDiv = document.getElementById('custom-airbnb-map');
        if (existingDiv) existingDiv.remove();
        if (mapInstance) {
            try { mapInstance.remove(); } catch (e) { /* ignore */ }
            mapInstance = null;
        }

        const initialPos = getInitialPosition();
        console.log(`Center: [${initialPos.center[0]}, ${initialPos.center[1]}], zoom: ${initialPos.zoom}`);

        const mapDiv = document.createElement('div');
        mapDiv.id = 'custom-airbnb-map';
        mapContainer.appendChild(mapDiv);

        const styles = buildMapStyles();

        mapInstance = new maplibregl.Map({
            container: 'custom-airbnb-map',
            style: styles.transit,
            center: initialPos.center,
            zoom: initialPos.zoom
        });

        mapInstance.addControl(new maplibregl.NavigationControl(), 'bottom-right');

        // FIX: clean up previous search button before adding a new one
        const existingBtn = document.getElementById('search-area-button');
        if (existingBtn) existingBtn.remove();

        searchButton = document.createElement('button');
        searchButton.id = 'search-area-button';
        searchButton.textContent = 'Search this area';
        searchButton.addEventListener('click', updateSearchArea);
        mapContainer.appendChild(searchButton);

        let moveTimeout;
        mapInstance.on('movestart', () => {
            // FIX: set syncInProgress BEFORE calling map methods in withSync()
            // so this guard is already true when programmatic moves fire movestart
            if (mapInstance.loaded() && !syncInProgress) {
                showSearchButton();
            }
        });

        mapInstance.on('moveend', () => {
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

    // ─── PROPERTY MARKERS ────────────────────────────────────────────────────────

    function addPropertyMarkers() {
        const coords = extractCoordinates();
        const properties = extractProperties();

        console.log(`Found ${coords.length} coordinates and ${properties.length} properties`);

        markers.forEach(marker => marker.remove());
        markers = [];

        // Attempt to match by roomId if coords carry an id field (id-anchored extraction)
        let matchedData;
        const coordById = new Map(coords.filter(c => c.id).map(c => [c.id, c]));

        if (coordById.size > 0) {
            matchedData = properties
                .filter(p => p.roomId && coordById.has(p.roomId))
                .map(p => ({ ...p, lat: coordById.get(p.roomId).lat, lng: coordById.get(p.roomId).lng }));
        } else {
            // Fallback: index-based matching (less reliable)
            matchedData = properties.slice(0, coords.length).map((prop, idx) => ({
                ...prop,
                lat: coords[idx].lat,
                lng: coords[idx].lng
            }));
        }

        matchedData.forEach(property => {
            // FIX: use textContent for the price — never inject untrusted data via innerHTML
            const el = document.createElement('div');
            el.className = 'custom-marker';

            const inner = document.createElement('div');
            inner.className = 'custom-marker-inner';

            const pill = document.createElement('div');
            pill.className = 'custom-marker-pill';

            const content = document.createElement('div');
            content.className = 'custom-marker-content';

            const priceSpan = document.createElement('span');
            priceSpan.className = 'custom-marker-price';
            priceSpan.textContent = property.price; // safe — no innerHTML

            content.appendChild(priceSpan);
            pill.appendChild(content);
            inner.appendChild(pill);
            el.appendChild(inner);
            el.title = property.title;

            el.addEventListener('click', () => {
                window.open(property.url, '_blank');
            });

            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([property.lng, property.lat])
                .addTo(mapInstance);

            markers.push(marker);
        });

        console.log(`✅ Added ${markers.length} property markers`);
        hideSearchButton();
    }

    // ─── TRANSIT OVERLAY ─────────────────────────────────────────────────────────

    const OVERLAY_SOURCE_ID = 'transit-overlay';
    const OVERLAY_LAYER_ID = 'transit-overlay-layer';

    function removeTransitOverlay() {
        if (!mapInstance) return;
        try {
            if (mapInstance.getLayer(OVERLAY_LAYER_ID)) mapInstance.removeLayer(OVERLAY_LAYER_ID);
            if (mapInstance.getSource(OVERLAY_SOURCE_ID)) mapInstance.removeSource(OVERLAY_SOURCE_ID);
        } catch (e) {
            console.error('Error removing transit overlay:', e);
        }
    }

    function addTransitOverlay(sourceName) {
        if (!mapInstance) return;
        const sourceConfig = transitSources[sourceName];
        if (!sourceConfig) { console.error('Invalid transit source:', sourceName); return; }

        try {
            if (!mapInstance.getSource(OVERLAY_SOURCE_ID)) {
                mapInstance.addSource(OVERLAY_SOURCE_ID, {
                    type: 'raster',
                    tiles: sourceConfig.tiles,
                    tileSize: 256,
                    attribution: sourceConfig.attribution,
                    maxzoom: 20
                });
            }
            if (!mapInstance.getLayer(OVERLAY_LAYER_ID)) {
                mapInstance.addLayer({
                    id: OVERLAY_LAYER_ID,
                    type: 'raster',
                    source: OVERLAY_SOURCE_ID,
                    paint: { 'raster-opacity': sourceConfig.opacity }
                });
            }
            transitOverlayVisible = true;
            currentTransitSource = sourceName;
            updateOverlayIndicator(true, sourceConfig.name);
            console.log(`Transit overlay shown (${sourceConfig.name})`);
        } catch (e) {
            console.error('Error adding transit overlay:', e);
        }
    }

    function toggleTransitOverlay(sourceName = null) {
        if (!mapInstance) return;
        const sourceToUse = sourceName || currentTransitSource;

        if (transitOverlayVisible) {
            removeTransitOverlay();
            transitOverlayVisible = false;
            updateOverlayIndicator(false);
            console.log('Transit overlay hidden');
        } else {
            addTransitOverlay(sourceToUse);
        }
    }

    // FIX: changeTransitSource no longer relies on a 100ms blind timeout.
    // It removes the old overlay synchronously, updates state, then adds the new one.
    function changeTransitSource(sourceName) {
        if (!transitOverlayVisible) {
            currentTransitSource = sourceName;
            return;
        }
        removeTransitOverlay();
        transitOverlayVisible = false;
        addTransitOverlay(sourceName);
    }

    function updateOverlayIndicator(visible, sourceName = '') {
        const indicator = document.getElementById('transit-overlay-indicator');
        if (!indicator) return;
        if (visible) {
            // Safe: sourceName comes from our own transitSources object, not user input
            indicator.textContent = '';
            const line1 = document.createTextNode(`🚇 Transit Overlay Active: ${sourceName}`);
            const br = document.createElement('br');
            const line2 = document.createElement('small');
            line2.textContent = '(Press T to toggle)';
            indicator.appendChild(line1);
            indicator.appendChild(br);
            indicator.appendChild(line2);
            indicator.classList.add('visible');
        } else {
            indicator.classList.remove('visible');
        }
    }

    function addOverlayIndicator(mapContainer) {
        const existing = document.getElementById('transit-overlay-indicator');
        if (existing) existing.remove();
        const indicator = document.createElement('div');
        indicator.id = 'transit-overlay-indicator';
        mapContainer.appendChild(indicator);
    }

    // ─── STYLE SWITCHING ─────────────────────────────────────────────────────────

    function applyCustomStyle(styleType = 'transit') {
        if (!mapInstance) return;
        const styles = buildMapStyles();
        if (!styles[styleType]) { console.error('Unknown style:', styleType); return; }

        console.log(`Applying ${styleType} style...`);

        const wasOverlayVisible = transitOverlayVisible;
        const previousSource = currentTransitSource;

        // Reset overlay state before setStyle wipes all layers/sources
        transitOverlayVisible = false;

        mapInstance.setStyle(styles[styleType]);

        mapInstance.once('style.load', () => {
            console.log('Style loaded');
            addPropertyMarkers();
            if (wasOverlayVisible) {
                addTransitOverlay(previousSource);
            }
        });
    }

    // ─── LAYER SWITCHER UI ───────────────────────────────────────────────────────

    function addLayerSwitcher(mapContainer) {
        const existing = document.getElementById('transit-map-switcher');
        if (existing) existing.remove();

        const switcher = document.createElement('div');
        switcher.id = 'transit-map-switcher';

        // Build title
        const title = document.createElement('div');
        title.className = 'switcher-title';
        title.textContent = '🗺️ Map Style';
        switcher.appendChild(title);

        // Build radio buttons for base style
        const radioOptions = [
            { value: 'transit', label: '🚌 Transit (Thunderforest)', checked: true },
            { value: 'google-maps', label: '🗺️ Google Maps' },
            { value: 'osm', label: '📍 OpenStreetMap' }
        ];

        radioOptions.forEach(opt => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'map-style';
            radio.value = opt.value;
            if (opt.checked) radio.checked = true;
            radio.addEventListener('change', () => applyCustomStyle(opt.value));
            label.appendChild(radio);
            label.appendChild(document.createTextNode(' ' + opt.label));
            switcher.appendChild(label);
        });

        // Transit overlay source section
        const overlaySection = document.createElement('div');
        overlaySection.style.cssText = 'margin-top:12px;padding-top:8px;border-top:1px solid #eee;';

        const overlayLabel = document.createElement('div');
        overlayLabel.style.cssText = 'color:#666;font-size:11px;margin-bottom:4px;';
        overlayLabel.textContent = 'Transit Overlay Source:';
        overlaySection.appendChild(overlayLabel);

        const select = document.createElement('select');
        select.id = 'transit-source-select';
        for (const [key, config] of Object.entries(transitSources)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = config.name; // safe textContent, not innerHTML
            if (key === currentTransitSource) option.selected = true;
            select.appendChild(option);
        }
        select.addEventListener('change', e => changeTransitSource(e.target.value));
        overlaySection.appendChild(select);
        switcher.appendChild(overlaySection);

        // Keyboard hints
        const hints = document.createElement('div');
        hints.style.cssText = 'margin-top:8px;color:#999;font-size:11px;';
        hints.innerHTML = '<strong>T</strong> = Toggle overlay<br><strong>M</strong> = Airbnb map (synced)';
        switcher.appendChild(hints);

        mapContainer.appendChild(switcher);
        console.log('✅ Layer switcher added');
    }

    // ─── KEYBOARD LISTENER ───────────────────────────────────────────────────────

    function addKeyboardListener() {
        document.addEventListener('keydown', e => {
            const active = document.activeElement;
            const isInput = active.tagName === 'INPUT' ||
                            active.tagName === 'TEXTAREA' ||
                            active.isContentEditable;
            if (isInput) return;

            if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                toggleTransitOverlay();
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                toggleMapView();
            }
        });
        console.log('✅ Keyboard listener added (T = transit overlay, M = toggle map)');
    }

    // ─── SPA NAVIGATION HANDLING ─────────────────────────────────────────────────
    // Airbnb is a React SPA. Intercept history mutations so the script
    // re-initializes when the user navigates to a new search page.

    function setupSpaNavigationHandler() {
        if (spaNavigationSetup) return;
        spaNavigationSetup = true;

        const originalPushState = history.pushState.bind(history);
        history.pushState = function (...args) {
            originalPushState(...args);
            console.log('🔄 SPA navigation detected (pushState), re-initializing...');
            setTimeout(init, 1000);
        };

        window.addEventListener('popstate', () => {
            console.log('🔄 SPA navigation detected (popstate), re-initializing...');
            setTimeout(init, 1000);
        });

        console.log('✅ SPA navigation handler installed');
    }

    // ─── INIT ────────────────────────────────────────────────────────────────────

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
                    findGoogleMap();
                    createCustomMap(mapContainer);
                    addLayerSwitcher(mapContainer);
                    addOverlayIndicator(mapContainer);
                    addKeyboardListener();
                    setupSpaNavigationHandler();

                    console.log('✅ Custom map initialized! Press M to toggle, T for transit overlay.');
                }, 1000);
            }
        }, 500);

        // Stop polling after 30 seconds to avoid running forever
        setTimeout(() => clearInterval(checkInterval), 30000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
