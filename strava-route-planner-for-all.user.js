// ==UserScript==
// @name Strava route planner for all - FIXED
// @namespace xsanda
// @description Use Strava’s premium route planner for all users
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
// @grant none
// @license MIT
// ==/UserScript==

/* jshint esversion: 6 */
/* globals Waiter, runAsClient */

(function () {
  'use strict';

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
