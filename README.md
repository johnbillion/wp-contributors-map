wp-contributors-map
===================

A Node.js server for generating a GeoJSON file of contributors to WordPress.

Want to run it yourself?
========================

Install the necessary modules if you don't already have them:

`npm install async`

`npm install cheerio`

`npm install geojson`

Start the server:

`node server.js`

Hit up `http://127.0.0.1:1337/`. Give it a while because it's gotta do > 400 HTTP requests. I removed the console.log calls, but I should have left them in really. Oops.

Observe your nicely formatted GeoJSON file.
