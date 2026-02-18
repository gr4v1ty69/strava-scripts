// injected_maps_activity.js - Runs on Activity Pages
(function() {
    if (typeof L === 'undefined') {
        console.error("Leaflet not loaded yet.");
        return;
    }

    // Access layers from the shared config (assumed injected before this script)
    const LAYERS = (typeof STRAVA_EXTENSION_LAYERS !== 'undefined') ? STRAVA_EXTENSION_LAYERS : {
        // Fallback if config not loaded
        'openstreetmap': { name: "OpenStreetMap", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", opts: { maxZoom: 19, attribution: "© OSM" } }
    };

    let leafletMap = null;
    let currentLayer = null;
    let routeCoords = null;
    let currentLayerKey = null;
    let playbackMarker = null;
    let chartSyncInterval = null;

    const GITHUB_URL = "https://github.com/gr4v1ty69/strava-scripts";
    const BUYMEACOFFEE_URL = "https://buymeacoffee.com/just1d3v";

    function createInfoPanel() {
        if (document.getElementById('custom-map-info-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'custom-map-info-panel';
        panel.innerHTML = `
            <div id="custom-map-info-msg">
                🗺️ <strong>Custom Maps Available</strong><br>
                Use the dropdown above to switch
            </div>
            <div id="custom-map-support">
                <a href="${GITHUB_URL}" target="_blank" class="custom-map-support-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    GitHub
                </a>
                <a href="${BUYMEACOFFEE_URL}" target="_blank" class="custom-map-support-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.159 1.737.212 2.48.226 5.002.19 7.472-.14.45-.06.899-.13 1.345-.21.399-.072.84-.206 1.08.206.166.281.188.657.162.974a.544.544 0 01-.169.364zm-6.159 3.9c-.862.37-1.84.788-3.109.788a5.884 5.884 0 01-1.569-.217l.877 9.004c.065.78.717 1.38 1.5 1.38 0 0 1.243.065 1.658.065.447 0 1.786-.065 1.786-.065.783 0 1.434-.6 1.499-1.38l.94-9.95a3.996 3.996 0 00-1.322-.238c-.826 0-1.491.284-2.26.613z"/>
                    </svg>
                    Support
                </a>
            </div>
        `;

        document.body.appendChild(panel);
    }

    function updateInfoPanel(isCustomMap) {
        const msg = document.getElementById('custom-map-info-msg');
        if (!msg) return;

        if (isCustomMap) {
            msg.classList.add('on-custom');
            msg.innerHTML = '🗺️ <strong>Custom Map Active</strong><br>Hover over elevation chart to explore';
        } else {
            msg.classList.remove('on-custom');
            msg.innerHTML = '🗺️ <strong>Custom Maps Available</strong><br>Use the dropdown above to switch';
        }
    }

    function startChartSync() {
        if (chartSyncInterval) return;

        // Find the chart container (the SVG or interactive area)
        const chartArea = document.querySelector('.event-rect') ||
                          document.querySelector('[class*="chart"]') ||
                          document.querySelector('svg');

        if (!chartArea) {
            console.warn("Chart area not found");
            return;
        }

        let isHovering = false;

        // Mouse enter - show marker
        chartArea.addEventListener('mouseenter', () => {
            isHovering = true;
            if (playbackMarker) {
                playbackMarker.setOpacity(1);
            }
        });

        // Mouse leave - hide marker (optional)
        chartArea.addEventListener('mouseleave', () => {
            isHovering = false;
            if (playbackMarker) {
                playbackMarker.setOpacity(0.3); // or 0 to hide completely
            }
        });

        // Mouse move - update marker position
        chartArea.addEventListener('mousemove', (e) => {
            if (!playbackMarker || !routeCoords || !isHovering) return;

            // Get the bounding rectangle of the chart
            const rect = chartArea.getBoundingClientRect();

            // Calculate mouse position relative to chart (0 to 1)
            const mouseX = e.clientX - rect.left;
            const chartWidth = rect.width;
            const percentage = Math.max(0, Math.min(1, mouseX / chartWidth));

            // Map to route index
            const index = Math.floor(percentage * (routeCoords.length - 1));

            // Update marker position
            if (index >= 0 && index < routeCoords.length) {
                playbackMarker.setLatLng(routeCoords[index]);
            }
        });
    }

    function stopChartSync() {
        if (chartSyncInterval) {
            clearInterval(chartSyncInterval);
            chartSyncInterval = null;
        }
    }

    async function fetchRouteGPX() {
        const id = window.location.pathname.split('/')[2];
        try {
            const resp = await fetch(`https://www.strava.com/activities/${id}/export_gpx`);
            if (!resp.ok) throw new Error("GPX fetch failed");
            return await resp.text();
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    function parseGPX(xmlStr) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlStr, "text/xml");
        const latlngs = [];
        xml.querySelectorAll('trkpt').forEach(pt => {
            latlngs.push([parseFloat(pt.getAttribute('lat')), parseFloat(pt.getAttribute('lon'))]);
        });
        return latlngs;
    }

    async function initLeaflet(layerKey) {
        const mapContainer = document.querySelector('.Map--map--k2M4e') || document.getElementById('map');
        if (!mapContainer) return;

        let lfContainer = document.getElementById('custom-leaflet-map');
        if (!lfContainer) {
            lfContainer = document.createElement('div');
            lfContainer.id = 'custom-leaflet-map';
            lfContainer.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:99;background:#eee;";
            mapContainer.insertBefore(lfContainer, mapContainer.firstChild);
        }
        
        const canvas = mapContainer.querySelector('canvas');
        if (canvas) canvas.style.visibility = 'hidden';

        if (!leafletMap) {
            const gpx = await fetchRouteGPX();
            if (!gpx) return;
            const coords = parseGPX(gpx);
            routeCoords = coords;

            leafletMap = L.map('custom-leaflet-map', { zoomControl: false }).fitBounds(coords);
            L.control.zoom({ position: 'bottomleft' }).addTo(leafletMap); // Bottom left to avoid blocking bottom right UI
            L.polyline(coords, {color: 'red', weight: 3}).addTo(leafletMap);

            const startIcon = L.divIcon({
                html: '<div style="background:#2ecc71;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
                iconSize: [12, 12]
            });
            const endIcon = L.divIcon({
                html: '<div style="background:#e74c3c;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
                iconSize: [12, 12]
            });

            L.marker(routeCoords[0], { icon: startIcon }).addTo(leafletMap).bindPopup('Start');
            L.marker(routeCoords[routeCoords.length - 1], { icon: endIcon }).addTo(leafletMap).bindPopup('Finish');

            // Create playback marker (blue dot)
            const playbackIcon = L.divIcon({
                html: `
                    <div style="
                        background: #2196F3;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        border: 4px solid white;
                        box-shadow: 0 0 15px rgba(33, 150, 243, 0.8), 0 0 30px rgba(33, 150, 243, 0.4);
                        position: relative;
                    "></div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                className: 'custom-playback-marker'
            });

            playbackMarker = L.marker(routeCoords[0], {
                icon: playbackIcon,
                zIndexOffset: 10000
            }).addTo(leafletMap);

            // Start chart sync
            setTimeout(() => startChartSync(), 1000);
        }

        leafletMap.eachLayer(l => { if(l instanceof L.TileLayer) leafletMap.removeLayer(l); });
        L.tileLayer(LAYERS[layerKey].url, LAYERS[layerKey].opts || {}).addTo(leafletMap);
        
        lfContainer.style.display = 'block';
        updateInfoPanel(true);
    }

    function injectUI() {
        if (document.getElementById('strava-custom-map-ui')) return;

        // Container (Fixed Bottom Right via CSS)
        const container = document.createElement('div');
        container.id = 'strava-custom-map-ui';
        container.className = 'strava-map-switcher-container strava-map-switcher-activity';
        
        const label = document.createElement('div');
        label.className = 'strava-map-switcher-label';
        label.innerText = 'Custom Map Layer';
        container.appendChild(label);

        const select = document.createElement('select');
        select.className = 'strava-map-switcher-select';
        select.innerHTML = '<option value="off">Default Strava</option>';
        Object.keys(LAYERS).forEach(k => {
            select.innerHTML += `<option value="${k}">${LAYERS[k].name}</option>`;
        });

        select.onchange = (e) => {
            if (e.target.value === 'off') {
                if (document.getElementById('custom-leaflet-map')) document.getElementById('custom-leaflet-map').style.display = 'none';
                const canvas = document.querySelector('canvas');
                if (canvas) canvas.style.visibility = 'visible';
                updateInfoPanel(false);
            } else {
                initLeaflet(e.target.value);
            }
        };
        container.appendChild(select);

        // Links
        const links = document.createElement('div');
        links.className = 'strava-map-switcher-links';
        links.innerHTML = `
            <a href="${GITHUB_URL}" target="_blank" class="strava-map-switcher-link"><span>⭐</span> GitHub</a>
            <a href="${BUYMEACOFFEE_URL}" target="_blank" class="strava-map-switcher-link"><span>☕</span> Donate</a>
        `;
        container.appendChild(links);

        document.body.appendChild(container);
        
        // Also inject the info panel
        createInfoPanel();
    }

    // Add necessary styles for info panel and playback marker
    const style = document.createElement('style');
    style.textContent = `
        #custom-map-info-panel {
            position: fixed !important;
            bottom: 30px !important;
            right: 250px !important; /* Moved left to avoid overlapping switcher */
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            z-index: 999999 !important;
            pointer-events: auto !important;
        }
        #custom-map-info-msg {
            background: white !important;
            color: #333 !important;
            padding: 12px 20px !important;
            border-radius: 6px !important;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15) !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            text-align: center !important;
            line-height: 1.4 !important;
        }
        #custom-map-info-msg.on-custom {
            background: #fc4c02 !important;
            color: white !important;
        }
        #custom-map-support {
            display: flex !important;
            gap: 8px !important;
        }
        .custom-map-support-btn {
            flex: 1 !important;
            background: white !important;
            color: #333 !important;
            padding: 10px 16px !important;
            border-radius: 6px !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
            cursor: pointer !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            user-select: none !important;
            transition: all 0.2s !important;
            text-align: center !important;
            text-decoration: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
        }
        .custom-map-support-btn:hover {
            background: #f5f5f5 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2) !important;
        }
        .custom-map-support-btn:active {
            transform: translateY(0) !important;
        }
        .custom-playback-marker {
            z-index: 10000 !important;
            pointer-events: none !important;
        }
    `;
    document.head.appendChild(style);

    setTimeout(injectUI, 2000);
})();