// content.js - Injects scripts into the main page context

function injectScript(file_path) {
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', chrome.runtime.getURL(file_path));
    // script.onload = function() { this.remove(); }; // Optional: Remove script tag after loading
    (document.head || document.documentElement).appendChild(script);
}

function injectCSS(file_path) {
    var link = document.createElement('link');
    link.href = chrome.runtime.getURL(file_path);
    link.type = 'text/css';
    link.rel = 'stylesheet';
    (document.head || document.documentElement).appendChild(link);
}

// 1. Always inject the Premium Unlocker
injectScript('injected_unlock.js');

// 2. Inject Shared Layer Configuration
injectScript('layers_config.js');

// 3. Logic to inject Map scripts based on current URL
const currentUrl = window.location.href;

if (currentUrl.includes('/maps/') || currentUrl.includes('/routes/new') || currentUrl.includes('/routes/') && currentUrl.includes('/edit')) {
    // Route Builder Page
    console.log("→ Injecting Route Builder Maps...");
    injectScript('injected_maps_builder.js');
} 
else if (currentUrl.includes('/activities/')) {
    // Activity Page - Needs Leaflet
    console.log("→ Injecting Activity Maps...");
    injectCSS('leaflet.css');
    injectScript('leaflet.js'); // We bundle Leaflet locally
    // Wait for Leaflet to load before injecting our logic
    setTimeout(() => {
        injectScript('injected_maps_activity.js');
    }, 500);
}