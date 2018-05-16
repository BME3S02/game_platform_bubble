/*********************
 *                   *
 *   Global status   *
 *                   *
 *********************/
var Global = [];

for(i = 0; i < 2; i++) {
	Global[i] = {
		flag: {
			mouseHolding: false,
			voiceHolding: false
		},
		status: {
			progress: 0,
			timer: null
		},
		blowing: {
			voice: new Audio('./audio/bubble_blow.mp3'),
			timer: null
		}
	};
}

/******************
 *                *
 *   Controller   *
 *                *
 ******************/
buildPlayerUI = function(dom, id) {
	var buttonContainer = document.createElement('div');
	buttonContainer.className = 'blow-button-container';
	dom.appendChild(buttonContainer);

	var button = document.createElement('div');
	button.className = 'button';
	buttonContainer.appendChild(button);

	var micImg = document.createElement('div');
	micImg.className = 'mic-img';
	button.appendChild(micImg);

	button.addEventListener('mousedown', function() {
		onMouseDown(id);
	});

	button.addEventListener('mouseup', function() {
		onMouseUp(id);
	});
}

onMouseDown = function(id) {
	var user = Global[id];
	user.flag.mouseHolding = true;
	var audio = new Audio('./audio/bubble_tap.mp3');
	audio.play();
	audio.volume = 2;

	console.log(audio.volume);

	user.blowing.voice.currentTime = 1.8 * user.status.progress;
	user.blowing.voice.play();

	if(user.blowing.timer != null) {
		clearTimeout(user.blowing.timer);
	}
	user.blowing.timer = setTimeout(function() {
		onTimeout(id);
	}, 1800);
}

onMouseUp = function(id) {
	var user = Global[id];

	user.flag.mouseHolding = false;
	user.blowing.voice.pause();
	clearTimeout(user.blowing.timer);
	user.blowing.timer = null;
}

onUpdateProgress = function(id) {

}

onTimeout = function(id) {
	var user = Global[id];

	var audioId = Math.floor(Math.random() * 4) + 1;
	var audio = new Audio('./audio/bubble_complete_' + audioId + '.mp3');
	audio.play();

	user.blowing.voice.pause();
	user.blowing.timer = null;
	user.status.progress = 0;
	user.flag.mouseHolding = false;
	user.flag.voiceHolding = false;
}

document.body.onload = function() {
	buildPlayerUI(document.getElementById('container1'), 0);
	buildPlayerUI(document.getElementById('container2'), 1);

	var audio = new Audio('./audio/bubble_title.mp3');
	audio.play();
}

/******************
 *                *
 *   Background   *
 *                *
 ******************/

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container;

var camera, scene, renderer;

var mesh, zmesh, lightMesh, geometry;
var spheres = [];

var directionalLight, pointLight;

init();
animate();

function init() {

	container = document.createElement( 'div' );
	document.body.appendChild( container );

	camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 100000 );
	camera.position.z = 3200;

	//

	var path = "images/textures/";
	var format = '.jpg';
	var urls = [
			path + 'posx' + format, path + 'negx' + format,
			path + 'posy' + format, path + 'negy' + format,
			path + 'posz' + format, path + 'negz' + format
		];

	var textureCube = new THREE.CubeTextureLoader().load( urls );
	textureCube.format = THREE.RGBFormat;

	scene = new THREE.Scene();
	scene.background = textureCube;

	//

	var geometry = new THREE.SphereBufferGeometry( 100, 32, 16 );

	var shader = THREE.FresnelShader;
	var uniforms = THREE.UniformsUtils.clone( shader.uniforms );

	uniforms[ "tCube" ].value = textureCube;

	var material = new THREE.ShaderMaterial( {
		uniforms: uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader
	} );

	for ( var i = 0; i < 500; i ++ ) {

		var mesh = new THREE.Mesh( geometry, material );

		mesh.position.x = Math.random() * 10000 - 5000;
		mesh.position.y = Math.random() * 10000 - 5000;
		mesh.position.z = Math.random() * 10000 - 5000;

		mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 3 + 1;

		scene.add( mesh );

		spheres.push( mesh );

	}

	scene.matrixAutoUpdate = false;

	//

	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	//

	window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

	requestAnimationFrame( animate );

	render();

}

function render() {

	var timer = 0.0001 * Date.now();

	camera.lookAt( scene.position );

	for ( var i = 0, il = spheres.length; i < il; i ++ ) {

		var sphere = spheres[ i ];

		sphere.position.x = 5000 * Math.cos( timer + i );
		sphere.position.y = 5000 * Math.sin( timer + i * 1.1 );

	}

	renderer.render( scene, camera );

}
