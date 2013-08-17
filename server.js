
var server = function( port, host ) {

	this.http    = require( 'http' );
	this.async   = require( 'async' );
	this.cheerio = require( 'cheerio' );
	this.geojson = require( 'geojson' );

	this.http.createServer( this.request.bind( this ) ).listen( port, host );

	console.log( 'Server running at http://' + host + ':' + port + '/' );

};

server.prototype.request = function( req, result ) {

	this.result = result;

	// I could use a routing framework here but I'm not bothering

	if ( '/' == req.url ) {

		console.log( 'server.request' );

		this.handleRequest( req );

	} else {

		this.result.writeHead( 404 );
		this.result.end();

	}

};

server.prototype.handleRequest = function( req ) {

	console.log( 'server.handleRequest' );

	// Fetch the page with our contributors on it
	this.fetch( 'http://wordpress.org/news/2013/08/oscar/', this.processBlog.bind( this ) );

};

server.prototype.processBlog = function( data ) {

	console.log( 'server.processBlog' );

	// Load the page using Cheerio
	var $ = this.cheerio.load( data );
	var contributors = [];

	// Find all our contributors and store them in an array
	$('.storycontent').find('a[href^="http://profiles.wordpress.org/"]').each(function(index,element){

		var url  = $(this).attr('href');
		var name = $(this).text();
		var user = url.match( /\/([a-z0-9_-]+)$/i );

		contributors.push( {
			'name'     : name,
			'username' : user[1],
			'url'      : url
		} );

	});

	// Asynchronously loop over our contributors
	this.async.each( contributors, this.processContributor.bind( this ), (function() {
		this.completedContributors( contributors );
	}).bind( this ) );

};

server.prototype.completedContributors = function( contributors ) {

	console.log( 'server.completedContributors' );

	// We'll send it as plain text because we want to pretty print it
	this.result.writeHead( 200, {
		'Content-Type' : 'text/plain'
	} );

	var contributors_with_location = [];

	// Build list of contributors for whom we have geo data
	for ( var i = 0; i < contributors.length; i++ ) {
		if ( contributors[i].lat )
			contributors_with_location.push( contributors[i] );
	}

	var geojs = this.geojson.parse( contributors_with_location, {
		Point : [ 'lat', 'lng' ]
	} );

	this.result.write( JSON.stringify( geojs, null, 2 ) );
	this.result.end();

};

server.prototype.processContributor = function( contributor, callback ) {

	//console.log( 'server.processContributor' );

	// Fetch the contributor's profile page
	this.fetch( contributor.url, (function( content ) {
		this.processProfile( content, contributor, callback );
	}).bind( this ), callback );

};

server.prototype.processProfile = function( content, contributor, callback ) {

	//console.log( 'server.processProfile' );

	// Find the contributor's address
	var address = content.match( /codeAddress\(\'([^\']+)\'\);/ );

	if ( address ) {

		contributor.location = address[1];

		// Geocode the contributor's address
		this.fetch( 'http://maps.googleapis.com/maps/api/geocode/json?sensor=false&address=' + encodeURI( contributor.location ), (function( content ) {
			this.processGeocode( content, contributor, callback );
		}).bind( this ), callback );

	} else {

		console.log( '-----------' );
		console.log( 'no address: ' + contributor.url );

		callback();

	}

};

server.prototype.processGeocode = function( content, contributor, callback ) {

	//console.log( 'server.processGeocode' );

	var geo = JSON.parse( content );

	// Only add the geo data if we actually have some
	if ( 'OK' == geo.status ) {
		var location = geo.results[0];
		if ( location.geometry && location.geometry.location ) {
			contributor.lat = location.geometry.location.lat;
			contributor.lng = location.geometry.location.lng;
		} else {

			console.log( '-----------' );
			console.log( 'no geometry: ' + contributor.url );
			console.log( geo );

		}
	} else {

		console.log( '-----------' );
		console.log( 'geo.status not ok: ' + contributor.url );
		console.log( geo );

	}

	callback();

};

server.prototype.fetch = function( url, success_callback, error_callback ) {

	this.http.get( url, function( response ) {

		var content = '';

		response.on( 'data', function( chunk ) {
			content += chunk;
		} );

		response.on( 'end', function() {
			if ( success_callback )
				success_callback( content );
		} );

		response.on( 'error', function() {
			if ( error_callback )
				error_callback( content );
		} );

	} );

};

var wp = new server( 1337, '127.0.0.1' );
