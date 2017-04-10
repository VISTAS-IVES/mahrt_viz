// get the extent // TODO - get this from serverside somehow
var z = 6;
var xmin = 9;
var xmax = 14;
var ymin = 21;
var ymax = 27;

// tile constants
var tile_size = 256;
var tile_stretch = 1;

// num tiles, width and height <--> x and y
// Increase the number of tiles to see more of the area
var x_tiles = xmax - xmin + 1;
var y_tiles = ymax - ymin + 1;


// world sizes
var w_width = tile_size * tile_stretch * x_tiles;
var w_height = tile_size * tile_stretch * y_tiles;

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
    var norm_tex_url = 'https://s3.amazonaws.com/elevation-tiles-prod/normal/' + z + '/' + x_idx + '/' + y_idx + '.png'
    loader.load(height_tex_url, function (h_texture) {
        loader.load(data_tex_url, function (d_texture) {
            loader.load(norm_tex_url, function (t_texture) {

                // Declare our base geometry. Using the PlaneBufferGeometry as a helper for specifying vertex positions before altering them.
                var geometry = new THREE.PlaneBufferGeometry(tile_size * tile_stretch, tile_size * tile_stretch, tile_size - 1, tile_size - 1);

                var heights = computeHeights(h_texture);
                var vertices = geometry.getAttribute('position')
                for (var i = 0; i < vertices.count; i++) {
                    vertices.setZ(i, heights[i]);

                }
                vertices.needsUpdate = true;

                // Use GPU decoding in a custom shader.
                // Block comment this and unblock above to use CPU decoding.
                var material = new THREE.ShaderMaterial(
                    {
                        uniforms: {
                            't_data': {value: d_texture},
                            't_normal': {value: t_texture}
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
                    console.log(new Date().getTime() - start);
                    // TODO - create selectable points at elevation locations
                }
            })
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
	for (var y = ymin; y < ymax; y++) {
		num_requests++;
		createOneTile(x, y, local_x_offset, local_y_offset);
        local_y_offset += tile_size * tile_stretch;
	}
	local_x_offset += tile_size * tile_stretch;
}

// move the whole world to center the map
scene.translateOnAxis(new THREE.Vector3(1,0,0), - w_width / 2 + tile_size*tile_stretch/2);
scene.translateOnAxis(new THREE.Vector3(0,0,1), - w_height / 3 * 2 + tile_size*tile_stretch/2);
// move the camera
camera.position.y = 1000;

function updateOneTile(tile) {
    var tile_data = tile.userData;
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
}

function getHeightFromTile(tile, val) {
    var idx = Math.round(256 * val.pct_x) + 256 * Math.round(256 * val.pct_y);
    return tile.geometry.getAttribute('position').getY(idx);
}


//function changeService(e) {
//    current_service = e.target.value;
//    for (var i = 0; i < scene.children.length; i++) {
//        var tile = scene.children[i];
//        updateOneTile(tile)
//    }
//}


// render and go
var render = function () {
    requestAnimationFrame(render)
	controls.update();
	renderer.render(scene, camera);
};

//var animate = function() {
//    requestAnimationFrame(animate);
//    render();
//}

function resize() {
	renderer.setSize(document.body.clientWidth, document.body.clientHeight);
	camera.aspect = document.body.clientWidth / document.body.clientHeight;
	//renderer.setSize(container.offsetWidth, container.offsetHeight);	// Projection matrix is calculated based on its container
	//camera.aspect = container.offsetWidth / container.offsetHeight;	// For simplicity, we can use the whole window
	camera.updateProjectionMatrix();
	render();
}

window.addEventListener('resize', resize, false);
render();
//animate();
