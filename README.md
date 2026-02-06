# Strava Custom Scripts

A collection of userscripts that enhance Strava's functionality by unlocking premium features and adding custom map layers.

## Scripts

### 1. Strava Route Planner for All - FIXED
**Version:** 0.4.1  

Enables Strava's premium route planner features for all users, removing paywall restrictions on route creation and editing.

#### Features
- Unlocks premium route planning features without a subscription
- Enables all athlete features by patching `__NEXT_DATA__`
- Fixes route creation by patching XMLHttpRequest requests
- Removes paywalled content restrictions

#### How It Works
The script intercepts Strava's authentication checks and modifies the user's subscriber status to enable premium features. It also patches route creation requests to ensure proper functionality.

### 2. Strava Custom Maps
**Version:** 1.0  

Adds multiple custom interactive map layers to Strava activity pages, including specialized outdoor, hiking, cycling, and aerial map options.

#### Features
- **Multiple Map Providers:**
  - OpenStreetMap (standard)
  - OpenTopoMap (topographic)
  - CyclOSM (cycling-focused)
  - mapy.cz (Outdoor, Winter, Aerial)
  - mtbmap.cz (mountain biking - Europe)
  - freemap.sk (outdoor)
  - Esri World Imagery (satellite)
  - Waymarked Trails (hiking trails)

- **Advanced Functionality:**
  - Custom Referer header spoofing for mapy.cz tiles
  - Interactive map layer switcher
  - Real-time activity playback synchronization
  - Blue dot marker showing current position
  - Leaflet.js integration for smooth map interactions

- **User Interface:**
  - Info panel with layer status
  - Support buttons (GitHub & Buy Me a Coffee)
  - Seamless integration with Strava's activity pages

## Installation

### Prerequisites
You need a userscript manager browser extension:
- [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Safari, Edge, Opera)
- [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge)
- [Greasemonkey](https://www.greasespot.net/) (Firefox)

### Install Scripts

#### Option 1: From OpenUserJS (Route Planner only)
1. Visit the [Strava Route Planner for All](https://openuserjs.org/install/xsanda/Strava_route_planner_for_all.user.js) page
2. Click "Install" when prompted by your userscript manager

#### Option 2: Manual Installation
1. Click on the script file in this repository
2. Click the "Raw" button
3. Your userscript manager should prompt you to install
4. Click "Install" to confirm

#### Option 3: Copy-Paste
1. Copy the entire script content
2. Open your userscript manager dashboard
3. Create a new script
4. Paste the content and save

## Usage

### Strava Route Planner for All
1. Navigate to any Strava route planning page:
   - https://www.strava.com/routes/new
   - https://www.strava.com/maps/create
   - Existing route edit pages
2. Premium route planning features will automatically be enabled
3. Check the browser console for confirmation: "✅ Premium route editor enabled"

### Strava Custom Maps
1. Open any Strava activity page: `https://www.strava.com/activities/*`
2. Look for the map layer switcher control (top-right of map)
3. Click to select different map layers
4. The blue dot marker will sync with your activity playback
5. Info panel appears in the bottom-right corner showing:
   - Current map layer status
   - Links to support the project

## Dependencies

### Strava Route Planner for All
- External library: [Run_code_as_client.js](https://openuserjs.org/src/libs/xsanda/Run_code_as_client.js)
- Automatically loaded via `@require` directive

### Strava Custom Maps
- jQuery 3.6.0 (loaded via CDN)
- Leaflet.js 1.9.4 (mapping library, loaded via CDN)
- Leaflet CSS (loaded as resource)

All dependencies are automatically loaded by the userscript manager.

## Browser Compatibility

Both scripts are compatible with:
- Chrome/Chromium-based browsers (Chrome, Edge, Opera, Brave)
- Firefox
- Safari (with Tampermonkey)

## Permissions & Grants

### Strava Route Planner for All
- `@grant none` - No special permissions required
- `@inject-into page` - Injects into page context for DOM access
- `@run-at document-start` - Runs early to patch before Strava loads

### Strava Custom Maps
- `@grant GM_xmlhttpRequest` - Makes HTTP requests with custom headers
- `@grant GM_addStyle` - Injects custom CSS
- `@grant GM_getResourceText` - Loads external CSS resources
- `@connect strava.com` - Connects to Strava domain
- `@connect mapy.cz` - Connects to mapy.cz tile servers

## Troubleshooting

### Route Planner Not Working
- Check browser console for error messages
- Ensure the script is enabled in your userscript manager
- Clear browser cache and reload the page
- Verify you're on a supported Strava URL

### Custom Maps Not Appearing
- Verify you're on a Strava activity page (not route planning)
- Check that jQuery and Leaflet loaded successfully (browser console)
- Disable conflicting browser extensions
- Some map tiles may be slow to load depending on provider

### Map Tiles Not Loading (mapy.cz)
- The script includes Referer spoofing specifically for mapy.cz
- If tiles still don't load, the tile server may be temporarily unavailable
- Try switching to alternative map layers

## Contributing

Contributions are welcome! Please feel free to:
- Report bugs or issues
- Suggest new map providers
- Submit pull requests with improvements
- Share feedback on features

## Support

If you find these scripts useful, consider supporting the original author:
- ☕ [Buy Me a Coffee](https://buymeacoffee.com/just1d3v)
- ⭐ Star this repository on GitHub

## Credits

- **Strava Route Planner for All:** Original by [xsanda](https://openuserjs.org/users/xsanda)
- **Strava Custom Maps:** Modified by Just4d3v

## Disclaimer

These scripts are unofficial modifications and are not affiliated with, endorsed by, or supported by Strava, Inc. Use at your own discretion. The route planner script bypasses Strava's premium subscription features, which may violate Strava's Terms of Service.

## License

- **Strava Route Planner for All:** MIT License
- **Strava Custom Maps:** Check with original author

---

**Repository:** [https://github.com/gr4v1ty69/strava-scripts](https://github.com/gr4v1ty69/strava-scripts)
