var http = require( 'http' );

http.createServer( function ( req, result ) {

	if ( '/' == req.url ) {

		// npm install async
		// npm install cheerio
		// npm install geojson
		var async   = require( 'async' );
		var cheerio = require( 'cheerio' );
		var geojson = require( 'geojson' );

		// Fetch the page with our contributors on it
		http.get( 'http://wordpress.org/news/2013/08/oscar/', function( res ) {

			var data = '';

			res.on( 'data', function( chunk ) {
				data += chunk;
			} );
			res.on( 'end', function() {

				// Load the page using Cheerio
				var $ = cheerio.load( data );
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
				async.each( contributors, function( contributor, callback ) {

					// Fetch the contributor's profile page
					http.get( contributor.url, function( lol ) {

						var content = '';

						lol.on( 'data', function( chunk ) {
							content += chunk;
						} );
						lol.on( 'end', function() {

							// Find the contributor's address
							var address = content.match( /codeAddress\(\'([^\']+)\'\);/ );

							if ( address ) {

								contributor.location = address[1];

								// Geocode the contributor's address
								http.get( 'http://maps.googleapis.com/maps/api/geocode/json?sensor=false&address=' + encodeURI( contributor.location ), function( geo_result ) {

									var geocoded = '';

									geo_result.on( 'data', function( chunk ) {
										geocoded += chunk;
									} );
									geo_result.on( 'end', function() {

										var geo = JSON.parse( geocoded );

										// Only add the geo data if we actually have some
										if ( 'OK' == geo.status ) {
											var location = geo.results[0];
											if ( location.geometry && location.geometry.location ) {
												contributor.lat = location.geometry.location.lat;
												contributor.lng = location.geometry.location.lng;
											}
										}

										callback();

									} );
									geo_result.on( 'error', callback );

								} );

							} else {
								callback();
							}

						} );

					} );

				}, function() {

					// We'll send it as plain text because we want to pretty print it
					result.writeHead( 200, {
						'Content-Type' : 'text/plain'
					} );

					var contributors_with_location = [];

					// Build list of contributors for whom we have geo data
					for ( var i = 0; i < contributors.length; i++ ) {
						if ( contributors[i].lat )
							contributors_with_location.push( contributors[i] );
					}

					var geojs = geojson.parse( contributors_with_location, { Point : [ 'lat', 'lng' ] } );

					result.write( JSON.stringify( geojs, null, 2 ) );
					result.end();

				} );

			} );

		} );

	} else {

		result.writeHead( 404 );
		result.end();

	}

} ).listen( 1337, '127.0.0.1' );

console.log( 'Server running at http://127.0.0.1:1337/' );
