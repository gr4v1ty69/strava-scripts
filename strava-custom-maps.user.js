// ==UserScript==
// @name         Strava Custom Maps
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Custom interactive maps for Strava with Mapy.cz Referer spoofing
// @author       Just4d3v (Modified)
// @match        https://www.strava.com/activities/*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
// @resource     LEAFLET_CSS https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @connect      strava.com
// @connect      mapy.cz
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log("Strava Custom Maps v1.0 - Running");

    const $ = window.jQuery;
    const L = window.L;

    const leafletCSS = GM_getResourceText("LEAFLET_CSS");
    GM_addStyle(leafletCSS);

    const GITHUB_URL = "https://github.com/gr4v1ty69/strava-scripts";
    const BUYMEACOFFEE_URL = "https://buymeacoffee.com/just1d3v";
    const osmAttr = '© OpenStreetMap contributors';
    const mapyCzAttr = '© Seznam.cz, © OpenStreetMap';
    const mtbMapAttr = '© mtbmap.cz, © OpenStreetMap';
    const freeMapSkAttr = '© freemap.sk, © OpenStreetMap';

    // --- CUSTOM LEAFLET LAYER FOR HEADER SPOOFING ---
    // This implements the "Solution" by using GM_xmlhttpRequest to set Referer headers
    L.TileLayer.HeaderSpoof = L.TileLayer.extend({
        createTile: function(coords, done) {
            const tile = document.createElement('img');
            const url = this.getTileUrl(coords);
            const headers = this.options.headers || {};

            // Default Leaflet tile setup
            L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
            L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));

            if (this.options.crossOrigin) {
                tile.crossOrigin = '';
            }

            tile.alt = '';
            tile.setAttribute('role', 'presentation');

            // Use GM_xmlhttpRequest to fetch the image with custom headers
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: headers,
                responseType: "blob",
                onload: function(response) {
                    if (response.status === 200) {
                        const urlCreator = window.URL || window.webkitURL;
                        const imageUrl = urlCreator.createObjectURL(response.response);
                        tile.src = imageUrl;
                    } else {
                        // Trigger error handling
                        done(new Error('Tile load failed'), tile);
                    }
                },
                onerror: function() {
                    done(new Error('Network error'), tile);
                }
            });

            return tile;
        }
    });

    const CustomLayers = {
        openstreetmap: {
            name: "OpenStreetMap",
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            options: { maxZoom: 19, attribution: osmAttr, crossOrigin: false }
        },
        opentopo: {
            name: "OpenTopoMap",
            url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
            options: { maxZoom: 17, attribution: '© OpenTopoMap', crossOrigin: false }
        },
        cyclosm: {
            name: "CyclOSM",
            url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
            options: { maxZoom: 20, attribution: '© CyclOSM', crossOrigin: false }
        },
        // MAPY.CZ Layers - Added 'headers' property to implement the spoof
        mapycz: {
            name: "mapy.cz (Outdoor)",
            url: "https://mapserver.mapy.cz/turist-m/{z}-{x}-{y}",
            options: {
                minZoom: 2,
                maxZoom: 18,
                attribution: mapyCzAttr,
                // These headers mimic the JSON rule you provided
                headers: { "Referer": "https://mapy.cz/", "Origin": "https://mapy.cz/" }
            }
        },
        mapyczwinter: {
            name: "mapy.cz (Winter)",
            url: "https://mapserver.mapy.cz/winter-m/{z}-{x}-{y}",
            options: {
                minZoom: 2,
                maxZoom: 18,
                attribution: mapyCzAttr,
                headers: { "Referer": "https://mapy.cz/", "Origin": "https://mapy.cz/" }
            }
        },
        mapyczaerial: {
            name: "mapy.cz (Aerial)",
            url: "https://mapserver.mapy.cz/ophoto-m/{z}-{x}-{y}",
            options: {
                minZoom: 2,
                maxZoom: 20,
                attribution: mapyCzAttr,
                headers: { "Referer": "https://mapy.cz/", "Origin": "https://mapy.cz/" }
            }
        },
        mtbmap: {
            name: "mtbmap.cz [Europe]",
            url: "https://tile.mtbmap.cz/mtbmap_tiles/{z}/{x}/{y}.png",
            options: { minZoom: 3, maxZoom: 18, attribution: mtbMapAttr, crossOrigin: null }
        },
        freemapsk: {
            name: "freemap.sk",
            url: "https://outdoor.tiles.freemap.sk/{z}/{x}/{y}",
            options: { minZoom: 3, maxZoom: 19, attribution: freeMapSkAttr, crossOrigin: null }
        },
        esri_world: {
            name: "Esri World Imagery",
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            options: { maxZoom: 19, attribution: '© Esri', crossOrigin: false }
        },
        waymarked_hiking: {
            name: "Waymarked Trails (Hiking)",
            url: "https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png",
            options: { maxZoom: 18, attribution: '© Waymarked Trails', crossOrigin: false }
        }
    };

    GM_addStyle(`
        #custom-leaflet-map-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 1 !important;
            display: none !important;
            pointer-events: none !important;
        }

        #custom-leaflet-map-container.active {
            display: block !important;
        }

        #custom-leaflet-map-container .leaflet-container {
            width: 100% !important;
            height: 100% !important;
            background: #f0f0f0 !important;
            pointer-events: auto !important;
        }

        #custom-leaflet-map-container .leaflet-control-container {
            pointer-events: none !important;
        }

        #custom-leaflet-map-container .leaflet-control {
            pointer-events: auto !important;
        }

        /* Blue dot marker - always on top */
        .custom-playback-marker {
            z-index: 10000 !important;
            pointer-events: none !important;
        }

        .leaflet-marker-pane {
            z-index: 600 !important;
        }

        /* Info panel - always visible */
        #custom-map-info-panel {
            position: fixed !important;
            bottom: 30px !important;
            right: 30px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            z-index: 999999 !important;
            pointer-events: auto !important;
        }

        /* Info message */
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

        /* Support buttons */
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
    `);

    let leafletMap = null;
    let currentLayer = null;
    let routeCoords = null;
    let currentLayerKey = null;
    let syncInterval = null;
    let playbackMarker = null;
    let chartSyncInterval = null;

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

        console.log("→ Starting chart sync");

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

        console.log("  ✓ Chart sync active (mousemove mode)");
    }


    function stopChartSync() {
        if (chartSyncInterval) {
            clearInterval(chartSyncInterval);
            chartSyncInterval = null;
        }
    }


        function fetchGPX(activityId) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `https://www.strava.com/activities/${activityId}/export_gpx`,
                    onload: (r) => r.status === 200 ? resolve(r.responseText) : reject(new Error(`HTTP ${r.status}`)),
                    onerror: () => reject(new Error('Network error'))
                });
            });
        }

        function parseGPX(gpxText) {
            const parser = new DOMParser();
            const xml = parser.parseFromString(gpxText, 'text/xml');
            const coords = [];
            xml.querySelectorAll('trkpt').forEach(pt => {
                coords.push([parseFloat(pt.getAttribute('lat')), parseFloat(pt.getAttribute('lon'))]);
            });
            return coords;
        }

    function startDropdownSync() {
        if (syncInterval) return;

        syncInterval = setInterval(() => {
            try {
                const $select = $('select[data-testid="mre-map-style-select"]');
                if ($select.length && currentLayerKey) {
                    const currentVal = $select.val();
                    if (currentVal !== currentLayerKey) {
                        $select.val(currentLayerKey);
                    }
                }
            } catch (e) {
                console.error('Sync error:', e);
            }
        }, 300);
    }

    function stopDropdownSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
    }

    async function createLeafletMap(layerKey, activityId) {
        const layer = CustomLayers[layerKey];
        if (!layer) {
            console.error('Invalid layer:', layerKey);
            return;
        }

        currentLayerKey = layerKey;
        console.log(`→ ${leafletMap ? 'Switching to' : 'Loading'} ${layer.name}`);

        const mapContainer = document.querySelector('.Map--map--k2M4e');
        if (!mapContainer) {
            console.error('Map container not found');
            alert('⚠️ Map container not found');
            return;
        }

        let container = document.getElementById('custom-leaflet-map-container');

        if (!container) {
            container = document.createElement('div');
            container.id = 'custom-leaflet-map-container';
            container.innerHTML = '<div id="custom-leaflet-map" style="width:100%;height:100%"></div>';
            mapContainer.insertBefore(container, mapContainer.firstChild);
        }

        // Helper function to create the correct layer type
        const createLayerInstance = (layerDef) => {
            if (layerDef.options.headers) {
                // Use our custom spoofing layer if headers are present
                return new L.TileLayer.HeaderSpoof(layerDef.url, layerDef.options);
            } else {
                // Use standard layer otherwise
                return L.tileLayer(layerDef.url, layerDef.options);
            }
        };

        if (!leafletMap) {
            // First time
            container.classList.add('active');
            startDropdownSync();
            updateInfoPanel(true);

            const canvas = document.querySelector('canvas#canvas');
            if (canvas) canvas.style.visibility = 'hidden';

            try {
                console.log('  Loading GPX...');
                const gpxText = await fetchGPX(activityId);
                routeCoords = parseGPX(gpxText);

                if (routeCoords.length === 0) {
                    throw new Error('No coordinates found');
                }

                console.log(`  ✓ ${routeCoords.length} points loaded`);

                leafletMap = L.map('custom-leaflet-map', {
                    zoomControl: true,
                    attributionControl: true
                });

                currentLayer = createLayerInstance(layer).addTo(leafletMap);

                const route = L.polyline(routeCoords, {
                    color: '#FC4C02',
                    weight: 3,
                    opacity: 0.8
                }).addTo(leafletMap);

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

                // Create playback marker (blue dot) - BIGGER and MORE VISIBLE
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

                console.log("  ✓ Blue marker created at:", routeCoords[0]);

                leafletMap.fitBounds(route.getBounds(), { padding: [50, 50] });

                // Start chart sync
                setTimeout(() => startChartSync(), 1000);

                console.log('  ✓ Map ready with chart sync!');

            } catch (e) {
                console.error('  ✗ Error creating map:', e);
                alert(`❌ Error: ${e.message}`);
                removeLeafletMap();
                return;
            }
        } else {
            // Switch layer
            console.log('  Switching layer...');
            if (currentLayer) leafletMap.removeLayer(currentLayer);
            currentLayer = createLayerInstance(layer).addTo(leafletMap);
            updateInfoPanel(true);
            console.log('  ✓ Switched!');
        }
    }

    function removeLeafletMap() {
        console.log('→ Removing custom map');

        stopChartSync();
        stopDropdownSync();
        updateInfoPanel(false);

        const container = document.getElementById('custom-leaflet-map-container');

        if (container) container.classList.remove('active');

        if (leafletMap) {
            leafletMap.remove();
            leafletMap = null;
            currentLayer = null;
            currentLayerKey = null;
            playbackMarker = null;
        }

        const canvas = document.querySelector('canvas#canvas');
        if (canvas) canvas.style.visibility = 'visible';

        const $select = $('select[data-testid="mre-map-style-select"]');
        $select.val('0');
        localStorage.removeItem('stravaCustomLayer');

        console.log('  ✓ Back to Strava');
    }

    function setupDropdown() {
        const $select = $('select[data-testid="mre-map-style-select"]');

        if ($select.length === 0 || $select.data('custom-ready')) return false;

        const activityId = window.location.pathname.match(/\/activities\/(\d+)/)?.[1];
        if (!activityId) {
            console.error('Could not extract activity ID');
            return false;
        }

        console.log("→ Setting up dropdown");

        // Clean existing custom options
        $select.find('option').each(function() {
            if (CustomLayers[$(this).val()]) $(this).remove();
        });

        // Add options
        $select.append($('<option>').attr('disabled', true).text('──── Custom ────'));
        Object.entries(CustomLayers).forEach(([key, layer]) => {
            $select.append($('<option>').val(key).text(`🗺️ ${layer.name}`));
        });

        // Handle change
        $select.off('change.custom').on('change.custom', function() {
            const val = $(this).val();
            console.log('Dropdown changed to:', val);

            if (CustomLayers[val]) {
                localStorage.setItem('stravaCustomLayer', val);
                createLeafletMap(val, activityId);
            } else {
                removeLeafletMap();
            }
        });

        $select.data('custom-ready', true);

        // Create info panel
        createInfoPanel();

        // Restore saved
        const saved = localStorage.getItem('stravaCustomLayer');
        if (saved && CustomLayers[saved]) {
            setTimeout(() => {
                console.log('Restoring saved layer:', saved);
                $select.val(saved).trigger('change');
            }, 1500);
        }

        console.log("  ✓ Dropdown ready");
        return true;
    }

    console.log("Initializing...");
    let attempts = 0;
    const check = setInterval(() => {
        if (setupDropdown() || ++attempts > 30) {
            clearInterval(check);
            if (attempts <= 30) {
                console.log("✅ Strava Custom Maps with Chart Sync loaded!");
            } else {
                console.warn("⏱️ Timeout waiting for dropdown");
            }
        }
    }, 500);

})();
