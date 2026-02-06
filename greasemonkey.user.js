// ==UserScript==
// @name strava-map-switcher
// @description Map switcher for Strava website
// @match https://www.strava.com/*
// @downloadURL https://cdn.jsdelivr.net/gh/gr4v1ty69/strava-map-switcher-v2@master/greasemonkey.user.js
// ==/UserScript==

{
	const s = document.createElement("script");
	s.src = 'https://cdn.jsdelivr.net/gh/gr4v1ty69/strava-map-switcher-v2@master/load.js';
	s.type = 'text/javascript';
	document.body.appendChild(s);
}
