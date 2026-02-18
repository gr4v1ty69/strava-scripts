// ==UserScript==
// @name         Strava Custom Maps (Full Pack)
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Injects all layers from strava-map-switcher into the Route Builder.
// @author       Just4d3v
// @match        https://www.strava.com/maps/*
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
   'use strict';

   // --- 1. CONFIGURATION: Full Layer List ---
   // Adapted from layers.js in strava-map-switcher
   const LAYERS = {
       'openstreetmap': {
           name: "OpenStreetMap",
           url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
           subdomains: "abc",
           attribution: '© OpenStreetMap'
       },
       'opencyclemap': {
           name: "OpenCycleMap",
           url: "https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png",
           subdomains: "abc",
           attribution: '© OpenCycleMap, Thunderforest'
       },
       'transport': {
           name: "Transport",
           url: "https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png",
           subdomains: "abc",
           attribution: '© OpenStreetMap, Thunderforest'
       },
       'outdoors': {
           name: "Outdoors",
           url: "https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png",
           subdomains: "abc",
           attribution: '© OpenStreetMap, Thunderforest'
       },
       'mtbmap': {
           name: "mtbmap.cz [Europe]",
           url: "https://tile.mtbmap.cz/mtbmap_tiles/{z}/{x}/{y}.png",
           attribution: '© mtbmap.cz, OSM'
       },
       'freemapsk': {
           name: "freemap.sk [Europe SE]",
           url: "https://outdoor.tiles.freemap.sk/{z}/{x}/{y}",
           attribution: '© freemap.sk, OSM'
       },
       'zmcr': {
           name: "Základní mapy ČR [CZ]",
           url: "https://ags.cuzk.cz/arcgis1/rest/services/ZTM_WM/MapServer/tile/{z}/{y}/{x}",
           attribution: '© ČÚZK'
       },
       'mtbmapno': {
           name: "mtbmap.no [NO]",
           url: "https://mtbmap.no/tiles/osm/mtbmap/{z}/{x}/{y}.jpg",
           attribution: '© mtbmap.no'
       },
       'kartverket': {
           name: "Kartverket [NO]",
           url: "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png",
           attribution: '© Kartverket'
       },
       'geoportail': {
           name: "Geoportail Aerial [FR]",
           url: "https://wxs.ign.fr/an7nvfzojv5wa96dsga5nk8w/geoportail/wmts?layer=ORTHOIMAGERY.ORTHOPHOTOS&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix={z}&TileCol={x}&TileRow={y}",
           attribution: '© Geoportail'
       },
       // --- Header Dependent Layers (May require ModHeader extension) ---
       'mapycz': {
           name: "mapy.cz (Outdoor)",
           url: "https://mapserver.mapy.cz/turist-m/{z}-{x}-{y}",
           attribution: '© Seznam.cz, OSM'
       },
       'mapyczwinter': {
           name: "mapy.cz (Winter)",
           url: "https://mapserver.mapy.cz/winter-m/{z}-{x}-{y}",
           attribution: '© Seznam.cz, OSM'
       },
       'mapyczbing': {
           name: "mapy.cz (Aerial + Hybrid)",
           url: "https://mapserver.mapy.cz/ophoto-m/{z}-{x}-{y}",
           attribution: '© Seznam.cz, OSM',
           // Overlay support added below
           overlay: {
               url: "https://mapserver.mapy.cz/hybrid-trail_bike-m/{z}-{x}-{y}"
           }
       }
   };

   // --- 2. CORE LOGIC: React Fiber Extraction ---

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
                   props.mapboxRef((m) => {
                       mapInstance = m;
                       return m;
                   });
               } catch (e) {
                   console.warn("Error invoking mapboxRef", e);
               }
               return mapInstance;
           }
           current = current.return;
       }
       return null;
   }

   // --- 3. MAPBOX MANIPULATION (Now supports Overlays!) ---

   function setMapLayer(map, layerKey) {
       const LAYER_ID = 'strava-custom-switcher';
       const SOURCE_ID = 'strava-custom-source';
       const LAYER_ID_OV = 'strava-custom-switcher-overlay';
       const SOURCE_ID_OV = 'strava-custom-source-overlay';

       // 1. Remove existing custom layers
       if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
       if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
       if (map.getLayer(LAYER_ID_OV)) map.removeLayer(LAYER_ID_OV);
       if (map.getSource(SOURCE_ID_OV)) map.removeSource(SOURCE_ID_OV);

       if (layerKey === 'default') return;

       const layerDef = LAYERS[layerKey];
       if (!layerDef) return;

       // Helper to prepare tiles URL
       const getTiles = (url, subs) => {
           if (url.includes('{s}')) {
               const subdomains = subs || "abc";
               return [...subdomains].map(s => url.replace('{s}', s));
           }
           return [url];
       };

       // --- Add Base Layer ---
       map.addSource(SOURCE_ID, {
           'type': 'raster',
           'tiles': getTiles(layerDef.url, layerDef.subdomains),
           'tileSize': 256,
           'attribution': layerDef.attribution
       });

       // Find insertion point (below labels)
       let labelLayerId;
       const layers = map.getStyle().layers;
       for (const layer of layers) {
           if (layer.type === 'symbol' && (layer.id.includes('label') || layer.id.includes('text') || layer.id.includes('road'))) {
               labelLayerId = layer.id;
               break;
           }
       }

       map.addLayer({
           'id': LAYER_ID,
           'type': 'raster',
           'source': SOURCE_ID,
           'paint': { 'raster-opacity': 1 }
       }, labelLayerId);

       // --- Add Overlay Layer (if exists) ---
       if (layerDef.overlay) {
           map.addSource(SOURCE_ID_OV, {
               'type': 'raster',
               'tiles': getTiles(layerDef.overlay.url, layerDef.subdomains),
               'tileSize': 256
           });

           map.addLayer({
               'id': LAYER_ID_OV,
               'type': 'raster',
               'source': SOURCE_ID_OV,
               'paint': { 'raster-opacity': 1 }
           }, labelLayerId); // Add below labels but above base
       }

       console.log(`Switched to ${layerDef.name}`);
   }


   // --- 4. UI INJECTION ---

   function injectUI(map) {
       if (document.getElementById('custom-map-select-container')) return;

       const container = document.createElement('div');
       container.id = 'custom-map-select-container';
       container.style.cssText = `
           position: absolute; top: 10px; left: 10px; z-index: 1000;
           background: white; padding: 10px; border-radius: 4px;
           box-shadow: 0 0 0 2px rgba(0,0,0,0.1); font-family: sans-serif;
           display: flex; align-items: center; gap: 8px;
       `;

       const select = document.createElement('select');
       select.style.cssText = "font-size: 14px; padding: 4px;";

       const defOpt = document.createElement('option');
       defOpt.value = 'default';
       defOpt.text = "Strava Standard";
       select.appendChild(defOpt);

       Object.keys(LAYERS).forEach(key => {
           const opt = document.createElement('option');
           opt.value = key;
           opt.text = LAYERS[key].name;
           select.appendChild(opt);
       });

       select.addEventListener('change', (e) => {
           setMapLayer(map, e.target.value);
       });

       const label = document.createElement('span');
       label.innerText = "Custom Map:";
       label.style.fontWeight = "bold";
       label.style.fontSize = "12px";

       container.appendChild(label);
       container.appendChild(select);
       document.body.appendChild(container);
   }

   // --- 5. INITIALIZATION ---

   const init = () => {
       const mapEl = document.querySelector('.mapboxgl-map');
       if (mapEl) {
           const fiber = getReactFiber(mapEl);
           if (fiber) {
               const mapInstance = findMapInstance(fiber);
               if (mapInstance && mapInstance.addLayer) {
                   console.log("✅ Strava Map Instance Found!");
                   injectUI(mapInstance);
                   return;
               }
           }
       }
       setTimeout(init, 1500);
   };

   init();

})();
