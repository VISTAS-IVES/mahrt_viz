// main.js

// Global contents to access
var scene, camera, tiles, points, vectors;
var min_height = 100000; // to move the heights down by a uniform value.

var spread = 1;
var NO_DATA = -9999.0
// tile constants
var tile_size = 256;

// Initialize the whole scene with a configuration
function init(config) {

    
    var z = config.zoom;
    var xmin = config.left - spread;
    var xmax = config.right + spread;
    var ymin = config.bottom - spread;
    var ymax = config.top + spread;

    
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
    controls.maxDistance = 800
    controls.minDistance = 10
    controls.maxPolarAngle = Math.PI / 2.1
    
    var loader = new THREE.TextureLoader()

    // groups for housing 3d objects
    tiles = new THREE.Group();
    points = new THREE.Group();
    vectors = new THREE.Group();

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
                idx = (x + y * w) * 4;        
                // (red * 256 + green + blue / 256) - 32768
                heights[x + y * w] = ((data[idx] * 256) +  data[idx+1] + (data[idx+2] / 256) - 32768);
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
                    })    // end block comment
    
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
                    initTimeline();
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

    // Create stations
    function createTilePoints() {

        // Same geometry for each mesh
        var point_geo = new THREE.SphereBufferGeometry(3, 8, 8);
        var point_material = new THREE.MeshLambertMaterial({color: 0x156289});

        function createOnePoint(tile, data) {

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

    // Create playback timeline
    function initTimeline() {
        var tstart = new Date().getTime();
        config.timeline_initialized = false;
        config.vectors_initialized = false;
        $.getJSON('/scp/all').done(function(res) {
            config.time_data = res;
            config.timeline_initialized = true;
            updateVectors(0);
            console.log("Got data in " + String((new Date().getTime() - tstart)/1000) + " seconds");
        });
        $(function() {
            $( "#time_slider" ).slider({
                value:0,
                min: 0,
                max: config.num_steps-1,
                step: 1,
                slide: function( event, ui ) {
                    if (config.timeline_initialized) {
                        updateVectors(ui.value);
                    }                   
                }
            });
        });
    }

    // Create direction vectors
    function initVectors() {

        for (var i = 0; i < points.children.length; i++) {
            var origin = points.children[i].position.clone();
            origin.y  += 3;

            var direction = new THREE.Vector3(1,0,1);
            var vector = new THREE.ArrowHelper(direction, origin, 10, 0xffff00);

            // Copy id from point into this vector.
            vector.userData = {'id': points.children[i].userData.id}
            vectors.add(vector);
        }

        scene.add(vectors);        
        config.vectors_initialized = true;
    }

    // Update vector direction based on time index
    function updateVectors(t_idx) {
        if (!config.vectors_initialized) {
            initVectors();
        }

        var wind_directions = config.time_data['wind direction'][t_idx];
        for (var i = 0; i < vectors.children.length; i++) {

            var vector = vectors.children[i];
            var id = vector.userData.id;

            var wind_degrees = wind_directions[id];
            if (wind_degrees == NO_DATA) {
                vector.visible = false;
                continue;
            }

            // If wind_degrees are azimuth, then convert to polar
            var polar_degrees = (180 - wind_degrees).mod(360);
            var uv = calcUVDirection((180 - polar_degrees).mod(360));
            
            // If they are polar, then just use this.
            //var uv = calcUVDirection(wind_degrees);

            var direction = new THREE.Vector3(uv.u, 0, uv.v);
            direction.normalize();
            vector.setDirection(direction);
        }
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
            var message = 'ID: ' + String(data.id) + 'x: ' + String(data.x) + ', y: ' + String(data.y) + ' ';
            message += 'pct_x: ' + String(data.pct_x) + ', pct_y: ' + String(data.pct_y);
            alertify.message(message);
        }

        if (tile_intersects.length > 0) {
            //console.log(tile_intersects[0]);
            //console.log(tile_intersects[0].object);
            //console.log(tile_intersects[0].object.userData);

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
$.getJSON('/scp/locations').done(function(res) {

    config.variables = res.variables;
    config.num_steps = res.num_steps;

    var utm_zone = 13;
    var utm_xs = res.Utm_x[0];
    var utm_ys = res.Utm_y[0];

    var xdisps = res.x_network[0];
    var ydisps = res.y_network[0];

    var center_lat = res.latitude[0][20];
    var center_lon = res.longitude[0][20];

    console.log(center_lat, center_lon);

    var lats = [];
    var lons = [];

    // utm coordinates are more precise than supplied lat/lon coords,
    // so convert UTM to lat/lon and overwrite supplied values
    for (var i = 0; i < utm_xs.length; i++) {
        //var ll = utmToLatLng(utm_zone, utm_xs[i], utm_ys[i], true);
        //lats.push(ll.latitude);
        //lons.push(ll.longitude);

        var ll = latLonPlusDistance(center_lat, center_lon, xdisps[i], ydisps[i]);
        console.log(ll);
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
            'pct_y': pct_y
        })

    }
    config.tile_data = tile_data;
    init(config);
});
