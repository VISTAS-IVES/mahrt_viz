

/* Utility functions for tile math */
function lon2tile(lon, zoom) {
    return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
}

function lat2tile(lat, zoom)  {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2,zoom));
}

function tile2lon(x, z) {
    return (x / Math.pow(2, z) * 360 - 180);
}

function tile2lat(y, z) {
    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
}

// http://stackoverflow.com/questions/343865/how-to-convert-from-utm-to-latlng-in-python-or-javascript
function utmToLatLng(zone, easting, northing, northernHemisphere){

    if (!northernHemisphere){
        northing = 10000000 - northing;
    }
 
    var a = 6378137;
    var e = 0.081819191;
    var e1sq = 0.006739497;
    var k0 = 0.9996;
 
    var arc = northing / k0;
    var mu = arc / (a * (1 - Math.pow(e, 2) / 4.0 - 3 * Math.pow(e, 4) / 64.0 - 5 * Math.pow(e, 6) / 256.0));
 
    var ei = (1 - Math.pow((1 - e * e), (1 / 2.0))) / (1 + Math.pow((1 - e * e), (1 / 2.0)));
 
    var ca = 3 * ei / 2 - 27 * Math.pow(ei, 3) / 32.0;
 
    var cb = 21 * Math.pow(ei, 2) / 16 - 55 * Math.pow(ei, 4) / 32;
    var cc = 151 * Math.pow(ei, 3) / 96;
    var cd = 1097 * Math.pow(ei, 4) / 512;
    var phi1 = mu + ca * Math.sin(2 * mu) + cb * Math.sin(4 * mu) + cc * Math.sin(6 * mu) + cd * Math.sin(8 * mu);
 
    var n0 = a / Math.pow((1 - Math.pow((e * Math.sin(phi1)), 2)), (1 / 2.0));
 
    var r0 = a * (1 - e * e) / Math.pow((1 - Math.pow((e * Math.sin(phi1)), 2)), (3 / 2.0));
    var fact1 = n0 * Math.tan(phi1) / r0;
 
    var _a1 = 500000 - easting;
    var dd0 = _a1 / (n0 * k0);
    var fact2 = dd0 * dd0 / 2;
 
    var t0 = Math.pow(Math.tan(phi1), 2);
    var Q0 = e1sq * Math.pow(Math.cos(phi1), 2);
    var fact3 = (5 + 3 * t0 + 10 * Q0 - 4 * Q0 * Q0 - 9 * e1sq) * Math.pow(dd0, 4) / 24;
 
    var fact4 = (61 + 90 * t0 + 298 * Q0 + 45 * t0 * t0 - 252 * e1sq - 3 * Q0 * Q0) * Math.pow(dd0, 6) / 720;
 
    var lof1 = _a1 / (n0 * k0);
    var lof2 = (1 + 2 * t0 + Q0) * Math.pow(dd0, 3) / 6.0;
    var lof3 = (5 - 2 * Q0 + 28 * t0 - 3 * Math.pow(Q0, 2) + 8 * e1sq + 24 * Math.pow(t0, 2)) * Math.pow(dd0, 5) / 120;
    var _a2 = (lof1 - lof2 + lof3) / Math.cos(phi1);
    var _a3 = _a2 * 180 / Math.PI;
 
    var latitude = 180 * (phi1 - fact1 * (fact2 + fact3 + fact4)) / Math.PI;
 
    if (!northernHemisphere){
      latitude = -latitude;
    }
 
    var longitude = ((zone > 0) && (6 * zone - 183.0) || 3.0) - _a3;
 
    var obj = {
          latitude : latitude,
          longitude: longitude
    };
 
    return obj;
}

/*
function metersPerPx(lat, zoom) {
    return 40075016.686 * Math.abs(Math.cos(lat * 180/Math.PI)) / Math.pow(2, zoom+8);
}
*/

// Initialize the whole scene with a configuration

var scene, camera, tiles, points;

    var min_height = 100000; // to move the heights down by a uniform value.


function init(config) {

    var spread = 0;
    
    var z = config.zoom;
    var xmin = config.left - spread;
    var xmax = config.right + spread;
    var ymin = config.bottom - spread;
    var ymax = config.top + spread;

    // tile constants
    var tile_size = 256;
    
    // num tiles, width and height <--> x and y
    // Increase the number of tiles to see more of the area
    var x_tiles = xmax - xmin + 1;
    var y_tiles = ymax - ymin + 1;
    
    
    // world sizes
    var w_width = tile_size * x_tiles;
    var w_height = tile_size * y_tiles;
    
    // scene graph, camera and builtin WebGL renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, document.body.clientWidth/document.body.clientHeight, 0.1, 25000 );
    
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize( document.body.clientWidth, document.body.clientHeight);
    document.body.appendChild(renderer.domElement);
    
    var controls = new THREE.OrbitControls(camera, renderer.domElement)
    //controls.maxDistance = 800
    //controls.minDistance = 100
    controls.maxPolarAngle = Math.PI / 2.1
    
    var loader = new THREE.TextureLoader()

    // groups for housing 3d objects
    tiles = new THREE.Group();
    points = new THREE.Group();

    // Lighting
    var lights = [];
    lights[ 0 ] = new THREE.PointLight( 0xffffff, 1, 0 );
    lights[ 1 ] = new THREE.PointLight( 0xffffff, 1, 0 );
    lights[ 2 ] = new THREE.PointLight( 0xffffff, 1, 0 );
    lights[ 3 ] = new THREE.PointLight( 0xffffff, 1, 0 );
    
    lights[ 0 ].position.set( 0, 200, 0 );
    lights[ 1 ].position.set( 100, 200, 100 );
    lights[ 2 ].position.set( - 100, - 200, - 100 );
    lights[ 3 ].position.set( 0, -200, 0 );
    
    scene.add( lights[ 0 ] );
    scene.add( lights[ 1 ] );
    scene.add( lights[ 2 ] );
    scene.add( lights[ 3 ] );

    
    function computeHeights(texture) {
    
    	// Access Image object from THREE.Texture
    	var image = texture.image
    	var w = image.naturalWidth
    	var h = image.naturalHeight
    
    	// Instantiate a canvas and extract the data from within
    	var canvas = document.createElement('canvas')
    	canvas.width = w
    	canvas.height = h
    	var ctx = canvas.getContext('2d')
    	ctx.drawImage(image, 0, 0, w, h)
    	var data = ctx.getImageData(0, 0, w, h).data
    
    	// Allocate space for the height information
    	var heights = new Float32Array(w * h)
    	var idx;
    	for (var y = 0; y < h; ++y) {
    		for (var x = 0; x < w; ++x) {
    
    			// Access the data one row at a time, top to bottom, left to right
    			idx = (x + y * w) * 4;
    
    			// Mapzen & s3.aws elevation tiles are decoded as such below
    			// (red * 256 + green + blue / 256) - 32768
    			heights[x + y * w] = ((data[idx] * 256) +  data[idx+1] + (data[idx+2] / 256) - 32768);  // divide by 255.0 to bring it down to proper scaling in buffer.
    		}
    	}
    
    	// Free the resources and return
    	data = ctx = canvas = null
    	return heights
    }
    
    function createOneTile(x_idx,y_idx, x_offset, y_offset) {
        var height_tex_url = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/' + z + '/' + x_idx + '/' + y_idx + '.png'
        var data_tex_url = 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' + z + '/' + y_idx + '/' + x_idx
        loader.load(height_tex_url, function (h_texture) {
            loader.load(data_tex_url, function (d_texture) {
    
                // Declare our base geometry. Using the PlaneBufferGeometry as a helper for specifying vertex positions before altering them.
                var geometry = new THREE.PlaneBufferGeometry(tile_size, tile_size, tile_size - 1, tile_size - 1);
    
                var heights = computeHeights(h_texture);
                var h_min = Math.min(...heights);
                min_height = (h_min < min_height) ? h_min : min_height;
                var vertices = geometry.getAttribute('position')
                for (var i = 0; i < vertices.count; i++) {
                    vertices.setZ(i, heights[i]);
    
                }
                vertices.needsUpdate = true;
    
                var material = new THREE.ShaderMaterial(
                    {
                        uniforms: {
                            't_data': {value: d_texture},
                            'min_height': {value: min_height}
                        },
                        vertexShader: document.getElementById('vertexShader').textContent,
                        fragmentShader: document.getElementById('fragmentShader').textContent
                    })	// end block comment
    
                geometry.rotateX(-Math.PI / 2)
                var tile = new THREE.Mesh(geometry, material);
                tile.userData = {'x': x_idx, 'y': y_idx};
    
                tile.translateOnAxis(new THREE.Vector3(1, 0, 0), x_offset);
                tile.translateOnAxis(new THREE.Vector3(0, 0, 1), y_offset);
                //scene.add(tile);
                tiles.add(tile);
                num_requests--;
                if (num_requests == 0) {
                    scene.add(tiles);
                    tiles.translateOnAxis(new THREE.Vector3(0,1,0), -min_height);
                    console.log('Loaded in ' + String((new Date().getTime() - start) / 1000) + ' seconds');
                    $('#loading_div').hide();
                    createTilePoints();
                }
            })
        })
    }
    
    var local_x_offset = 0;
    var local_y_offset = 0;
    
    var start = new Date().getTime();
    var num_requests = 0;
    
    // add tiles in succession
    for (var x = xmin; x <= xmax; x++) {
    	local_y_offset = 0;
    	for (var y = ymin; y <= ymax; y++) {
    		num_requests++;
    		createOneTile(x, y, local_x_offset, local_y_offset);
            local_y_offset += tile_size;
    	}
    	local_x_offset += tile_size;
    }
    
    // move the whole world to center the map
    scene.translateOnAxis(new THREE.Vector3(1,0,0), - w_width / 2 + tile_size/2);
    scene.translateOnAxis(new THREE.Vector3(0,0,1), - w_height / 2 + tile_size/2);
    // move the camera
    camera.position.y = 800;

    function createTilePoints() {

        // Same geometry for each mesh
        var point_geo = new THREE.SphereBufferGeometry(3, 8, 8);
        var point_material = new THREE.MeshPhongMaterial({
            color: 0x156289,
            emissive: 0x072534,
            side: THREE.DoubleSide,
            shading: THREE.FlatShading
        });

        function createOnePoint(tile, data) {

            // Determine if this tile's lat lon are unique.
            // If not, we push data.id onto the existing tile's userData.id_list to keep track of later.
            var is_unique = true;
            if (points.children.length > 0) {

                for (var i = 0; i < points.children.length; i++) {
                    var tdata = points.children[i].userData;
                    if (tdata.lat == data.lat && tdata.lon == data.lon) {
                        is_unique = false;
                        points.children[i].userData.id_list.push(data.id);
                        break;
                    }
                }
            }

            if (is_unique) {

                var sx = tile.position.x + tile_size * data.pct_x - tile_size / 2;
                var sz = tile.position.z + tile_size * data.pct_y - tile_size / 2;
                var sy = getHeightFromTile(tile, data) - min_height;

                var mesh = new THREE.Mesh(point_geo, point_material);
                mesh.userData = data;
                mesh.position.x = sx;
                mesh.position.y = sy;
                mesh.position.z = sz;

                points.add(mesh);
            }

        }

        for (var idx = 0; idx < tiles.children.length; idx++) {
            var tile = tiles.children[idx];
            var mesh_data = tile.userData;
            for (var i = 0; i < config.tile_data.length; i++) {
                var tile_data = config.tile_data[i];
                if (tile_data.x == mesh_data.x && tile_data.y == mesh_data.y) {
                    createOnePoint(tile, tile_data);
                }
            }
        }
        scene.add(points);
    }

    function onDocumentMouseDown( event ) {    
        //event.preventDefault();
        var mouse3D = new THREE.Vector3( ( event.clientX / window.innerWidth ) * 2 - 1,   
                                    -( event.clientY / window.innerHeight ) * 2 + 1,  
                                    0.5 );     
        var raycaster =  new THREE.Raycaster();                                        
        raycaster.setFromCamera( mouse3D, camera );
        var intersects = raycaster.intersectObjects( points.children );
        var tile_intersects = raycaster.intersectObjects( tiles.children );
        //console.log(intersects)
        if ( intersects.length > 0 ) {
            //intersects[ 0 ].object.material.color.setHex( Math.random() * 0xffffff );
            var data = intersects[0].object.userData;
            var message = 'x: ' + String(data.x) + ', y: ' + String(data.y) + ' ';
            message += 'pct_x: ' + String(data.pct_x) + ', pct_y: ' + String(data.pct_y);
            alertify.message(message);
        }

        if (tile_intersects.length > 0) {
            //console.log(tile_intersects[0]);
            //console.log(tile_intersects[0].object);
            console.log(tile_intersects[0].object.userData);

        }
    }

    document.addEventListener('mousedown', onDocumentMouseDown);
    
    // Used to update the tile layer's image texture.
    function updateOneTile(tile) {
        var tile_data = tile.userData;

        // TODO - do something with this function! =D

        /*
        var tile_url;
        if (current_service.includes('Arc')) {
            tile_url = current_service + z + '/' + tile_data.y + '/' + tile_data.x
        } else {
            var service_url = '/tiles/' + current_service + '/' + z + '/';
            tile_url = service_url + tile_data.x + '/' + tile_data.y + '.png';
        }
        loader.load(tile_url, function (t_data) {
            tile.material.uniforms.t_data.value = t_data;
            tile.material.needsUpdate = true;
        })
        */
    }
    
    function getHeightFromTile(tile, val) {
        var idx = Math.round(tile_size * val.pct_x) + tile_size * Math.round(tile_size * val.pct_y);
        return tile.geometry.getAttribute('position').getY(idx);
    }

    var render = function () {
        requestAnimationFrame(render)
    	controls.update();
    	renderer.render(scene, camera);
    };
    
    function resize() {
    	renderer.setSize(document.body.clientWidth, document.body.clientHeight);
    	camera.aspect = document.body.clientWidth / document.body.clientHeight;
    	camera.updateProjectionMatrix();
    	render();
    }
    
    window.addEventListener('resize', resize, false);
    render();
}

// Retrieve location data and initialize the webgl scene
var config = {};
var orig_data;
$.getJSON('/scp/locations').done(function(res) {
    orig_data = res;
    config.variables = res.variables;
    config.num_steps = res.num_steps;

    var utm_zone = 13;
    var utm_xs = res.Utm_x[0];
    var utm_ys = res.Utm_y[0];

    var lats = [];
    var lons = [];

    // utm coordinates are more precise than supplied lat/lon coords,
    // so convert UTM to lat/lon and overwrite supplied values
    for (var i = 0; i < utm_xs.length; i++) {
        var ll = utmToLatLng(utm_zone, utm_xs[i], utm_ys[i], true);
        lats.push(ll.latitude);
        lons.push(ll.longitude);
    }

    // Determine world tiles
    var north_edge = Math.max(...lats);
    var south_edge = Math.min(...lats);
    var west_edge = Math.min(...lons);
    var east_edge = Math.max(...lons);

    // Maximum resolution
    var zoom        = 15;
    var top_tile    = lat2tile(north_edge, zoom); // eg.lat2tile(34.422, 9);
    var left_tile   = lon2tile(west_edge, zoom);
    var bottom_tile = lat2tile(south_edge, zoom);
    var right_tile  = lon2tile(east_edge, zoom);
    var width       = Math.abs(left_tile - right_tile) + 1;
    var height      = Math.abs(top_tile - bottom_tile) + 1;

    // Assign values to config. In ES6, use bracket getters ( let { zoom } = config )
    config.zoom = zoom;
    config.top = top_tile;
    config.left = left_tile;
    config.bottom = bottom_tile;
    config.right = right_tile;
    config.width = width;
    config.height = height;

    // Setup tile data for point objects
    var tile_data = [];
    for (var i = 0; i < lats.length; i++) {

        var utm_x = utm_xs[i];
        var utm_y = utm_ys[i];
        var lat = lats[i];
        var lon = lons[i];


        // Get station's tile
        var x = lon2tile(lon, zoom);
        var y = lat2tile(lat, zoom);

        // Get tile bbox
        var n = tile2lat(y, zoom);
        var s = tile2lat(y+1, zoom);
        var w = tile2lon(x, zoom);
        var e = tile2lon(x+1, zoom);

        // Get position in tile
        var pct_x = (lon - w) / (e - w);
        var pct_y = 1 - ((lat - s) / (n - s));

        tile_data.push({
            'id': i,
            'x': x,
            'y': y,
            'lat': lat,
            'lon': lon,
            'pct_x': pct_x,
            'pct_y': pct_y,
            'id_list': [i]   // used if points coincide with one another
        })

    }
    config.tile_data = tile_data;
    init(config);
});
