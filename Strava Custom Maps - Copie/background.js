/* Updated for Firefox Manifest V3 using browser.scripting */
(() => {
  const browser = globalThis.browser || globalThis.chrome;
  const SCRIPT_ID = "us_Strava_Custom_Maps";

  /**
   * Registers the content scripts using the Scripting API.
   * This replaces browser.userScripts.register.
   */
  async function registerScripts() {
    try {
      // Always try to unregister first to avoid "Duplicate ID" errors during development/reloads
      try {
        await browser.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
      } catch (e) {
        // Ignore error if script wasn't registered yet
      }

      // Register the scripts
      await browser.scripting.registerContentScripts([{
        id: SCRIPT_ID,
        matches: ["https://www.strava.com/activities/*"],
        js: ["userscript_api.js", "script.user.js"], // Load API first, then the user script
        runAt: "document_end",
        world: "ISOLATED" // Runs in extension context (standard for MV3)
      }]);
      
      console.log("Strava Custom Maps: Scripts registered successfully.");
    } catch (err) {
      console.error("Strava Custom Maps: Registration failed", err);
    }
  }

  /**
   * Handles messages from the content script (GM_ functions emulation).
   */
  function handleMessage(message, sender, sendResponse) {
    if (!message || !message.type) return;

    (async () => {
      switch (message.type) {
        case 'GM_setValue': {
          const { name, value } = message.payload;
          const key = 'userscript_Strava_Custom_Maps_' + name;
          await browser.storage.local.set({ [key]: value });
          sendResponse({});
          break;
        }
        case 'GM_getValue': {
          const { name, defaultValue } = message.payload;
          const key = 'userscript_Strava_Custom_Maps_' + name;
          const data = await browser.storage.local.get(key);
          sendResponse(
            Object.prototype.hasOwnProperty.call(data, key)
              ? { value: data[key] }
              : { value: defaultValue }
          );
          break;
        }
        case 'GM_deleteValue': {
          const { name } = message.payload;
          await browser.storage.local.remove('userscript_Strava_Custom_Maps_' + name);
          sendResponse({});
          break;
        }
        case 'GM_listValues': {
          const all = await browser.storage.local.get(null);
          const PFX = 'userscript_Strava_Custom_Maps_';
          sendResponse({ 
            keys: Object.keys(all).filter(k => k.startsWith(PFX)).map(k => k.slice(PFX.length)) 
          });
          break;
        }
        case 'GM_xmlhttpRequest': {
          const d = message.payload;
          try {
            const resp = await fetch(d.url, {
              method: d.method || 'GET',
              headers: d.headers || undefined,
              body: d.data !== undefined ? d.data : undefined,
              credentials: d.anonymous ? 'omit' : 'include'
            });

            // Convert response body based on requested type
            let body;
            const ct = resp.headers.get('content-type') || '';
            if (d.responseType === 'blob') {
                // Blobs can't be passed directly via messaging in some contexts, 
                // often need to be serialized or handled differently. 
                // For basic text/json, this works:
                const blob = await resp.blob();
                const reader = new FileReader();
                body = await new Promise(resolve => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } else if (d.responseType === 'json' || ct.includes('application/json')) {
                body = await resp.json();
            } else {
                body = await resp.text();
            }

            const headers = {};
            resp.headers.forEach((v, h) => headers[h] = v);

            sendResponse({
              id: d.id,
              success: true,
              result: {
                response: body,
                responseText: typeof body === 'string' ? body : JSON.stringify(body),
                status: resp.status,
                statusText: resp.statusText,
                responseHeaders: headers
              }
            });
          } catch (err) {
            sendResponse({ id: d.id, success: false, error: err.message });
          }
          break;
        }
        case 'GM_download': {
          const { url, name } = message.payload;
          try {
            await browser.downloads.download({ url, filename: name, saveAs: false });
            sendResponse({ success: true });
          } catch (e) {
            sendResponse({ success: false, error: e.message });
          }
          break;
        }
        case 'GM_openInTab': {
          const { url, open_in_background } = message.payload;
          await browser.tabs.create({ url, active: !open_in_background });
          sendResponse({});
          break;
        }
        case 'GM_notification': {
            const { text, title } = message.payload;
            try {
              await browser.notifications.create({
                type: 'basic',
                iconUrl: 'icon-48.png', 
                title: title || 'Strava Map',
                message: text
              });
            } catch (e) { console.error(e); }
            sendResponse({});
            break;
        }
      }
    })();
    return true; // Indicates we will send a response asynchronously
  }

  // --- Event Listeners ---

  // Register scripts when the extension is installed or updated
  browser.runtime.onInstalled.addListener(registerScripts);

  // Register scripts when the browser starts up (to ensure persistence)
  browser.runtime.onStartup.addListener(registerScripts);

  // Handle messages (GM_ functions)
  browser.runtime.onMessage.addListener(handleMessage);

})();