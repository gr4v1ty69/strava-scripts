// ==UserScript==
// @name Strava route planner for all - FIXED
// @namespace xsanda
// @description Use Strava's premium route planner for all users
// @version 0.4.1
// @match https://www.strava.com/maps/*
// @match https://www.strava.com/maps/create*
// @match https://www.strava.com/routes/new*
// @match https://www.strava.com/routes/*/edit*
// @match https://www.strava.com/athletes/*/training/log
// @match https://www.strava.com/athlete/heatmaps*
// @require https://openuserjs.org/src/libs/xsanda/Run_code_as_client.js
// @updateURL https://openuserjs.org/meta/xsanda/Strava_route_planner_for_all.meta.js
// @downloadURL https://openuserjs.org/install/xsanda/Strava_route_planner_for_all.user.js
// @run-at document-start
// @inject-into page
// @grant GM_addStyle
// @license MIT
// ==/UserScript==

/* jshint esversion: 6 */
/* globals Waiter, runAsClient */

(function () {
  'use strict';

  // Add banner styles
  if (typeof GM_addStyle !== 'undefined') {
    GM_addStyle(`
      #premium-route-banner {
        position: fixed !important;
        top: 0 !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        background: #fc4c02 !important;
        color: white !important;
        padding: 12px 24px !important;
        border-radius: 0 0 8px 8px !important;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2) !important;
        z-index: 999999 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
        animation: slideDown 0.3s ease-out !important;
      }

      @keyframes slideDown {
        from {
          transform: translateX(-50%) translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }

      .banner-link {
        color: white !important;
        text-decoration: none !important;
        padding: 6px 12px !important;
        background: rgba(255, 255, 255, 0.2) !important;
        border-radius: 4px !important;
        transition: all 0.2s !important;
        font-weight: 600 !important;
      }

      .banner-link:hover {
        background: rgba(255, 255, 255, 0.3) !important;
        transform: translateY(-1px) !important;
      }

      .banner-separator {
        color: rgba(255, 255, 255, 0.5) !important;
      }
    `);
  }

  // Create and insert banner
  function createBanner() {
    if (document.getElementById('premium-route-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'premium-route-banner';
    banner.innerHTML = `
      <span>🎉 Premium Route Planning Unlocked!</span>
      <span class="banner-separator">|</span>
      <a href="https://buymeacoffee.com/just1d3v" target="_blank" class="banner-link">☕ Donations</a>
      <a href="https://github.com/gr4v1ty69/strava-scripts/tree/main" target="_blank" class="banner-link">⭐ Other Strava Scripts</a>
    `;

    // Wait for body to be available
    const insertBanner = () => {
      if (document.body) {
        document.body.appendChild(banner);
      } else {
        setTimeout(insertBanner, 100);
      }
    };
    insertBanner();
  }

  // Wait until document.head is available
  function waitForHead(fn) {
    const tryRun = () => {
      if (document.head) {
        fn();
      } else {
        setTimeout(tryRun, 50);
      }
    };
    tryRun();
  }

  function initScript() {
    if (typeof runAsClient !== 'function') {
      console.error('Strava route planner: runAsClient not loaded yet.');
      return;
    }

    // Create banner after a short delay to ensure page is loaded
    setTimeout(createBanner, 1000);

    runAsClient(function () {
      console.log('Strava route planner: Trying to enable premium.');

      // Helper to hook into __NEXT_DATA__ changes
      const addSetHandler = (obj, prop, didSet) => {
        let value = obj[prop];
        Object.defineProperty(obj, prop, {
          set: (newValue) => didSet(value = newValue),
          get: () => value,
        });
        if (value) didSet(value);
      };

      // Patch __NEXT_DATA__ to make us look premium
      addSetHandler(window, '__NEXT_DATA__', (data) => {
        if (!data?.props) return;

        const athlete = data.props.currentAthletePreload;
        if (!athlete) return;

        athlete.is_subscriber = true;

        if (athlete.features) {
          Object.keys(athlete.features).forEach(key => {
            athlete.features[key] = true;
          });
        }

        if (data.props.pageProps?.metadata) {
          data.props.pageProps.metadata.is_paywalled = false;
        }

        console.log('✅ Premium route editor enabled');
      });

      // Patch XMLHttpRequest to fix route creation
      setTimeout(() => {
        const requests = new WeakMap();
        const { open, send } = window.XMLHttpRequest.prototype;

        window.XMLHttpRequest.prototype.open = function (...args) {
          requests.set(this, args);
          open.apply(this, args);
        };

        window.XMLHttpRequest.prototype.send = function (data) {
          const req = requests.get(this);
          if (!req) return send.call(this, data);

          const [method, path] = req;

          if (method === 'POST' && path === '/frontend/routes') {
            try {
              const parsed = JSON.parse(data);
              if (!parsed.original_route_id) {
                parsed.original_route_id = '1';
              }
              data = JSON.stringify(parsed);
            } catch (e) {
              console.warn('Route planner: failed to patch /frontend/routes', e);
            }
          }

          return send.call(this, data);
        };
      }, 1500);
    });
  }

  // Run only once document.head is ready
  waitForHead(initScript);
})();
