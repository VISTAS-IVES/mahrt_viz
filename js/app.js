

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

/*
function metersPerPx(lat, zoom) {
    return 40075016.686 * Math.abs(Math.cos(lat * 180/Math.PI)) / Math.pow(2, zoom+8);
}
*/

// Initialize the whole scene with a configuration
function init(config) {

    var spread = 3;
    
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
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera( 75, document.body.clientWidth/document.body.clientHeight, 0.1, 2500 );
    
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize( document.body.clientWidth, document.body.clientHeight);
    document.body.appendChild(renderer.domElement);
    
    var controls = new THREE.OrbitControls(camera, renderer.domElement)
    controls.maxDistance = 1900
    //controls.minDistance = 100
    controls.maxPolarAngle = Math.PI / 2.1
    
    var loader = new THREE.TextureLoader()
    
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
    			heights[x + y * w] = ((data[idx] * 256) +  data[idx+1] + (data[idx+2] / 256) - 32768) / 255.0;  // divide by 255.0 to bring it down to proper scaling in buffer.
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
                var vertices = geometry.getAttribute('position')
                for (var i = 0; i < vertices.count; i++) {
                    vertices.setZ(i, heights[i]);
    
                }
                vertices.needsUpdate = true;
    
                var material = new THREE.ShaderMaterial(
                    {
                        uniforms: {
                            't_data': {value: d_texture}
                        },
                        vertexShader: document.getElementById('vertexShader').textContent,
                        fragmentShader: document.getElementById('fragmentShader').textContent
                    })	// end block comment
    
                geometry.rotateX(-Math.PI / 2)
                var tile = new THREE.Mesh(geometry, material);
                tile.userData = {'x': x_idx, 'y': y_idx};
    
                tile.translateOnAxis(new THREE.Vector3(1, 0, 0), x_offset);
                tile.translateOnAxis(new THREE.Vector3(0, 0, 1), y_offset);
                scene.add(tile);
                num_requests--;
                if (num_requests == 0) {
                    console.log('Loaded in ' + String((new Date().getTime() - start) / 1000) + ' seconds');
                    // TODO - create selectable points at elevation locations
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
    camera.position.y = 1000;
    
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
        var idx = Math.round(256 * val.pct_x) + 256 * Math.round(256 * val.pct_y);
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

var config = {};

$.getJSON('/scp/locations').done(function(res) {

    config.variables = res.variables;
    config.num_steps = res.num_steps;

    var lats = res.latitude[0];
    var lons = res.longitude[0];

    var north_edge = Math.max(...lats);
    var south_edge = Math.min(...lats);
    var west_edge = Math.min( ...lons);
    var east_edge = Math.max( ...lons);

    var zoom        = 15;
    var top_tile    = lat2tile(north_edge, zoom); // eg.lat2tile(34.422, 9);
    var left_tile   = lon2tile(west_edge, zoom);
    var bottom_tile = lat2tile(south_edge, zoom);
    var right_tile  = lon2tile(east_edge, zoom);
    var width       = Math.abs(left_tile - right_tile) + 1;
    var height      = Math.abs(top_tile - bottom_tile) + 1;

    // total tiles
    var total_tiles = width * height; // -> eg. 377

    config.zoom = zoom;
    config.top = top_tile;
    config.left = left_tile;
    config.bottom = bottom_tile;
    config.right = right_tile;
    config.width = width;
    config.height = height;

    var tile_data = [];

    // Determine position of each station within a respective tile.
    // TODO - determine position
    for (var i = 0; i < lats.length; i++) {
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
        var pct_y = (lat - s) / (n - s);

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
