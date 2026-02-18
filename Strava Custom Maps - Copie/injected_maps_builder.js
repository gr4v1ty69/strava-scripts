// injected_maps_builder.js - Custom Maps for Route Builder (Mapbox GL)
(function() {
    'use strict';

    // Access layers from the shared config (assumed injected before this script)
    const LAYERS = (typeof STRAVA_EXTENSION_LAYERS !== 'undefined') ? STRAVA_EXTENSION_LAYERS : {
        // Fallback
        'openstreetmap': { name: "OpenStreetMap", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '© OSM' }
    };

    function getReactFiber(domElement) {
        const key = Object.keys(domElement).find(k => k.startsWith('__reactFiber$'));
        return key ? domElement[key] : null;
    }

    function findMapInstance(fiber) {
        let current = fiber;
        for (let i = 0; i < 15 && current; i++) {
            const props = current.memoizedProps;
            if (props && props.mapboxRef) {
                let mapInstance = null;
                try {
                    props.mapboxRef((m) => { mapInstance = m; return m; });
                } catch (e) {}
                return mapInstance;
            }
            current = current.return;
        }
        return null;
    }

    function setMapLayer(map, layerKey) {
        const LAYER_ID = 'strava-custom-switcher';
        const SOURCE_ID = 'strava-custom-source';
        
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

        if (layerKey === 'default' || !LAYERS[layerKey]) return;

        const layer = LAYERS[layerKey];
        let tiles = [];
        if (layer.url.includes('{s}')) {
            const subs = layer.subdomains || 'abc';
            tiles = subs.split('').map(s => layer.url.replace('{s}', s));
        } else {
            tiles = [layer.url];
        }

        map.addSource(SOURCE_ID, {
            'type': 'raster',
            'tiles': tiles,
            'tileSize': 256,
            'attribution': layer.attribution,
            'maxzoom': layer.maxZoom || 22
        });

        let labelLayerId;
        const layers = map.getStyle().layers;
        for (const l of layers) {
            if (l.type === 'symbol' && (l.id.includes('label') || l.id.includes('text') || l.id.includes('road'))) {
                labelLayerId = l.id;
                break;
            }
        }

        map.addLayer({
            'id': LAYER_ID,
            'type': 'raster',
            'source': SOURCE_ID,
            'paint': { 'raster-opacity': 1 }
        }, labelLayerId);
    }

    function injectUI(map) {
        if (document.getElementById('strava-custom-map-ui')) return;
        
        // 1. Create the Container (List Item for Nav)
        const container = document.createElement('li'); // Using 'li' to fit into the list
        container.id = 'strava-custom-map-ui';
        container.className = 'strava-map-switcher-container strava-map-switcher-builder';
        
        // Label
        const label = document.createElement('div');
        label.className = 'strava-map-switcher-label';
        label.innerText = 'Custom Map';
        container.appendChild(label);

        // Select
        const select = document.createElement('select');
        select.className = 'strava-map-switcher-select';
        select.innerHTML = '<option value="default">Strava Default</option>';
        Object.keys(LAYERS).forEach(k => {
            select.innerHTML += `<option value="${k}">${LAYERS[k].name}</option>`;
        });
        select.onchange = (e) => setMapLayer(map, e.target.value);
        container.appendChild(select);

        // Links
        const links = document.createElement('div');
        links.className = 'strava-map-switcher-links';
        links.innerHTML = `
            <a href="https://github.com/gr4v1ty69/strava-scripts" target="_blank" class="strava-map-switcher-link"><span>⭐</span> GitHub</a>
            <a href="https://buymeacoffee.com/just1d3v" target="_blank" class="strava-map-switcher-link"><span>☕</span> Donate</a>
        `;
        container.appendChild(links);

        // 2. Find Insertion Point (The Nav Bar)
        const giftLink = document.querySelector('a[href*="/gift"]');
        const subscribeLink = document.querySelector('a[href*="/subscribe"]');
        const targetAnchor = giftLink || subscribeLink;

        if (targetAnchor) {
            const targetLi = targetAnchor.closest('li');
            if (targetLi && targetLi.parentNode) {
                targetLi.parentNode.insertBefore(container, targetLi);
                console.log("✅ Injected Map Switcher into Navigation Bar");
            } else {
                fallbackInjection(container);
            }
        } else {
            fallbackInjection(container);
        }
    }

    function fallbackInjection(element) {
        console.warn("⚠️ Nav bar not found, falling back to absolute positioning");
        element.style.position = 'absolute';
        element.style.top = '10px';
        element.style.left = '10px';
        document.body.appendChild(element);
    }

    function init() {
        const mapEl = document.querySelector('.mapboxgl-map');
        if (mapEl) {
            const fiber = getReactFiber(mapEl);
            if (fiber) {
                const map = findMapInstance(fiber);
                if (map && map.addLayer) {
                    console.log("✅ Mapbox Found!");
                    injectUI(map);
                    return;
                }
            }
        }
        setTimeout(init, 1000);
    }

    init();
})();