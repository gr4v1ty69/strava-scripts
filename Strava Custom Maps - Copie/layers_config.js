// layers_config.js - Shared Map Layers Configuration
const STRAVA_EXTENSION_LAYERS = {
    'openstreetmap': { name: "OpenStreetMap", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '© OSM', opts: { maxZoom: 19 } },
    'opentopomap': { name: "OpenTopoMap", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attribution: '© OpenTopoMap', subdomains: 'abc', opts: { maxZoom: 17 } },
    'cyclosm': { name: "CyclOSM", url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png", attribution: '© CyclOSM', subdomains: 'abc', opts: { maxZoom: 20 } },
    'mapycz': { name: "mapy.cz (Outdoor)", url: "https://mapserver.mapy.cz/turist-m/{z}-{x}-{y}", attribution: '© Seznam.cz, OSM', maxZoom: 18, opts: { maxZoom: 18 } },
    'mapyczwinter': { name: "mapy.cz (Winter)", url: "https://mapserver.mapy.cz/winter-m/{z}-{x}-{y}", attribution: '© Seznam.cz, OSM', maxZoom: 18, opts: { maxZoom: 18 } },
    'mapyczbing': { name: "mapy.cz (Aerial)", url: "https://mapserver.mapy.cz/ophoto-m/{z}-{x}-{y}", attribution: '© Seznam.cz, OSM', maxZoom: 20, opts: { maxZoom: 20 } },
    'mtbmap': { name: "mtbmap.cz (Europe)", url: "https://tile.mtbmap.cz/mtbmap_tiles/{z}/{x}/{y}.png", attribution: '© mtbmap.cz', opts: { maxZoom: 18 } },
    'freemap': { name: "freemap.sk", url: "https://outdoor.tiles.freemap.sk/{z}/{x}/{y}", attribution: '© freemap.sk', opts: { maxZoom: 19 } },
    'esri': { name: "Esri World Imagery", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: '© Esri', opts: { maxZoom: 19 } },
    'waymarked': { name: "Waymarked Trails", url: "https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png", attribution: '© Waymarked Trails', opts: { maxZoom: 18 } }
};