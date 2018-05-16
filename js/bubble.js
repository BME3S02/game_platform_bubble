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
			score: 0,
			scoreDOM: null,
			progress: 0,
			timer: null
		},
		blowing: {
			voice: new Audio('./audio/bubble_blow.mp3'),
			timer: null
		}
	};
}

/************************
 *                      *
 *   Audio Controller   *
 *                      *
 ************************/
buildAudioSelectUI = function(dom, id) {
	var container = document.createElement( 'div' );
	dom.appendChild(container);

	var select = document.createElement('select');
	container.appendChild(select);

	navigator.mediaDevices.getUserMedia({"audio": true}).then(function() {
		devices_list(select, id);
	});
}

devices_list = function(dom, id) {
	var handleMediaSourcesList = function(list) {
		for(i=0;i<list.length;i++){
			var device= list[i];
			if(device.kind == 'audioinput') {
				dom.options.add(new Option(device.label ,device.deviceId));
			}
		}
		dom.onchange = function() {
			usemic(dom, id);
		}
	}
	if (navigator["mediaDevices"] && navigator["mediaDevices"]["enumerateDevices"]) {
		navigator["mediaDevices"]["enumerateDevices"]().then(handleMediaSourcesList);
	// Old style API
	} else if (window["MediaStreamTrack"] && window["MediaStreamTrack"]["getSources"]) {
		window["MediaStreamTrack"]["getSources"](handleMediaSourcesList);
	}
}

usemic = function(dom, id) {
	navigator.mediaDevices.getUserMedia({
		"audio":{
			"optional": [{
				"sourceId": dom.value
			}]
		}}).then(function (stream) {
			var context = new AudioContext();

			// analyser extracts frequency, waveform, etc.
			var analyser = context.createAnalyser();
			analyser.smoothingTimeConstant = 0.3;
			analyser.fftSize = 1024;

			// setup a javascript node
			javascriptNode = context.createScriptProcessor(2048, 1, 1);

			// connect to destination, else it isn't called
			javascriptNode.connect(context.destination);

			javascriptNode.onaudioprocess = function() {
				// get the average, bincount is fftsize / 2
				var array =  new Uint8Array(analyser.frequencyBinCount);
				analyser.getByteFrequencyData(array);
				var average = getAverageVolume(array)
				console.log(average);
			}

			// create a buffer source node
			sourceNode = context.createBufferSource();

			// connect the source to the analyser
			sourceNode.connect(analyser);

			// we use the javascript node to draw at a specific interval.
			analyser.connect(javascriptNode);

			// and connect to destination, if you want audio
			sourceNode.connect(context.destination);
		}).catch(function(err){
			console.error('getMedia ERR:'+err.message );
		});
}

function getAverageVolume(array) {
	var values = 0;
	var average;

	var length = array.length;

	// get all the frequency amplitudes
	for (var i = 0; i < length; i++) {
		values += array[i];
	}

	average = values / length;
	return average;
}


/**************************
 *                        *
 *   General Controller   *
 *                        *
 **************************/
buildController = function(dom) {
	var container1 = document.createElement( 'div' );
	container1.id = "container1";
	container1.className = "container";
	dom.appendChild(container1);

	var container2 = document.createElement( 'div' );
	container2.id = "container2";
	container2.className = "container";
	dom.appendChild(container2);

	buildPlayerUI(document.getElementById('container1'), 0);
	buildPlayerUI(document.getElementById('container2'), 1);

	var audio = new Audio('./audio/bubble_title.mp3');
	audio.play();
}

buildPlayerUI = function(dom, id) {
	buildAudioSelectUI(dom, id);

	Global[id].status.scoreDOM = document.createElement('div');
	Global[id].status.scoreDOM.className = 'score';
	Global[id].status.scoreDOM.innerHTML = 0;
	dom.appendChild(Global[id].status.scoreDOM);

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
	Global[id].flag.mouseHolding = true;
	onStart(id);
}

onMouseUp = function(id) {
	Global[id].flag.mouseHolding = false;
	onEnd(id);
}

onStart = function(id) {
	var user = Global[id];
	var audio = new Audio('./audio/bubble_tap.mp3');
	audio.play();

	user.blowing.voice.play();

	if(user.blowing.timer != null) {
		clearTimeout(user.blowing.timer);
	}
	user.blowing.timer = setTimeout(function() {
		onTimeout(id);
	}, 1800 * (1 - user.status.progress));

	if(user.status.timer == null) {
		user.status.timer = setTimeout(function() {
			onUpdateProgress(id);
		}, 50);
	}
}

onEnd = function(id) {
	var user = Global[id];

	user.blowing.voice.pause();
	clearTimeout(user.blowing.timer);
	user.blowing.timer = null;
}

onUpdateProgress = function(id) {
	var user = Global[id];

	if(user.flag.mouseHolding || user.flag.voiceHolding) {
		user.status.progress += 0.05 / 1.8;
	} else {
		user.status.progress -= 0.05 / 32;
	}

	if(user.status.progress <= 0) {
		user.status.progress = 0;
		user.status.timer = null;
	} else {
		user.status.timer = setTimeout(function() {
			onUpdateProgress(id);
		}, 50);
	}
}

onTimeout = function(id) {
	var user = Global[id];

	var audioId = Math.floor(Math.random() * 4) + 1;
	var audio = new Audio('./audio/bubble_complete_' + audioId + '.mp3');
	audio.play();

	user.blowing.voice.pause();
	user.blowing.voice.currentTime = 0;
	user.blowing.timer = null;

	user.status.score += 1;
	user.status.scoreDOM.innerHTML = user.status.score;
	user.status.progress = 0;

	user.flag.mouseHolding = false;
	user.flag.voiceHolding = false;


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
	container.id = "container";
	document.body.appendChild( container );

	buildController(container);

	camera = new THREE.PerspectiveCamera( 60, 800 / 600, 1, 100000 );
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

	for ( var i = 0; i < 502; i ++ ) {

		var mesh = new THREE.Mesh( geometry, material );

		mesh.position.x = Math.random() * 10000 - 5000;
		mesh.position.y = Math.random() * 10000 - 5000;
		mesh.position.z = Math.random() * 6000 - 5000;

		mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 3 + 1;

		scene.add( mesh );

		spheres.push( mesh );

	}

	scene.matrixAutoUpdate = false;

	//

	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( 800, 600 );
	container.appendChild( renderer.domElement );

	//

	//window.addEventListener( 'resize', onWindowResize, false );

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

	for ( var i = 0, il = 500; i < il; i ++ ) {

		var sphere = spheres[ i ];

		sphere.position.x = 5000 * Math.cos( timer + i );
		sphere.position.y = 5000 * Math.sin( timer + i * 1.1 );

	}

	// Sphere 1
	var sphere = spheres[500];
	if(Global[0].flag.mouseHolding || Global[0].flag.voiceHolding || Global[0].status.progress > 0) {
		sphere.scale.x = sphere.scale.y = sphere.scale.z = 4 * Global[0].status.progress + 0.001;
		sphere.position.x = -600;
		sphere.position.y = 0;
		sphere.position.z = 1500;
	} else {
		sphere.scale.x = sphere.scale.y = sphere.scale.z = 4;
		sphere.position.y += 30;
		if(sphere.position.y > 5000)
			sphere.position.y = 5000;
	}

	// Sphere 2
	sphere = spheres[501];
	if(Global[1].flag.mouseHolding || Global[1].flag.voiceHolding || Global[1].status.progress > 0) {
		sphere.scale.x = sphere.scale.y = sphere.scale.z = 4 * Global[1].status.progress + 0.001;
		sphere.position.x = 650;
		sphere.position.y = 0;
		sphere.position.z = 1500;
	} else {
		sphere.scale.x = sphere.scale.y = sphere.scale.z = 4;
		sphere.position.y += 30;
		if(sphere.position.y > 5000)
			sphere.position.y = 5000;
	}

	renderer.render( scene, camera );

}
