// injected_unlock.js - Unlocks Premium Route features
(function() {
    console.log("🚀 Strava Premium Unlocker Loaded");

    // 1. Patch __NEXT_DATA__ to fake subscription status
    // This allows the UI to show premium features
    let nextData = undefined;
    Object.defineProperty(window, '__NEXT_DATA__', {
        get: function() { return nextData; },
        set: function(val) {
            nextData = val;
            if (val && val.props && val.props.currentAthletePreload) {
                const athlete = val.props.currentAthletePreload;
                athlete.is_subscriber = true;
                // Enable all specific features
                if (athlete.features) {
                    Object.keys(athlete.features).forEach(k => athlete.features[k] = true);
                }
                console.log("✅ Premium Status Spoofed in __NEXT_DATA__");
            }
        },
        configurable: true
    });

    // 2. Patch XMLHttpRequest to fix saving
    // Strava checks for subscription on the backend during save. 
    // This trick modifies the save request to look like a legacy save if needed.
    const originalOpen = window.XMLHttpRequest.prototype.open;
    const originalSend = window.XMLHttpRequest.prototype.send;

    window.XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        this._method = method;
        return originalOpen.apply(this, arguments);
    };

    window.XMLHttpRequest.prototype.send = function(body) {
        if (this._url && this._url.includes('/frontend/routes') && this._method === 'POST') {
            try {
                let data = JSON.parse(body);
                // Ensure original_route_id is present to bypass some server checks
                if (!data.original_route_id) {
                    data.original_route_id = "1";
                }
                body = JSON.stringify(data);
                console.log("✅ Patched Route Save Request");
            } catch (e) {
                console.warn("Failed to patch route save", e);
            }
        }
        return originalSend.apply(this, [body]);
    };
})();