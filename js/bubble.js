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
			// grab an audio context
			var audioContext = new AudioContext();

			// Create an AudioNode from the stream.
			var mediaStreamSource = audioContext.createMediaStreamSource(stream);

			// Create a new volume meter and connect it.
			var meter = createAudioMeter(audioContext);
			mediaStreamSource.connect(meter);

			// kick off the visual updating
			onLevelChange(meter);
		}).catch(function(err){
			console.error('getMedia ERR:'+err.message );
		});
}

createAudioMeter = function(audioContext,clipLevel,averaging,clipLag) {
	var processor = audioContext.createScriptProcessor(512);
	processor.onaudioprocess = volumeAudioProcess;
	processor.clipping = false;
	processor.lastClip = 0;
	processor.volume = 0;
	processor.clipLevel = clipLevel || 0.98;
	processor.averaging = averaging || 0.95;
	processor.clipLag = clipLag || 750;

	// this will have no effect, since we don't copy the input to the output,
	// but works around a current Chrome bug.
	processor.connect(audioContext.destination);

	processor.checkClipping =
		function(){
			if (!this.clipping)
				return false;
			if ((this.lastClip + this.clipLag) < window.performance.now())
				this.clipping = false;
			return this.clipping;
		};

	processor.shutdown =
		function(){
			this.disconnect();
			this.onaudioprocess = null;
		};

	return processor;
}

volumeAudioProcess = function( event ) {
	var buf = event.inputBuffer.getChannelData(0);
	var bufLength = buf.length;
	var sum = 0;
	var x;

	// Do a root-mean-square on the samples: sum up the squares...
	for (var i=0; i<bufLength; i++) {
		x = buf[i];
		if (Math.abs(x)>=this.clipLevel) {
			this.clipping = true;
			this.lastClip = window.performance.now();
		}
		sum += x * x;
	}

	// ... then take the square root of the sum.
	var rms =  Math.sqrt(sum / bufLength);

	// Now smooth this out with the averaging factor applied
	// to the previous sample - take the max here because we
	// want "fast attack, slow release."
	this.volume = Math.max(rms, this.volume*this.averaging);
}

onLevelChange = function(meter) {
	console.log(meter.volume);

	setTimeout(function() {
		onLevelChange(meter);
	}, 100);
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

	for ( var i = 0; i < 202; i ++ ) {

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

	for ( var i = 0, il = 200; i < il; i ++ ) {

		var sphere = spheres[ i ];

		sphere.position.x = 5000 * Math.cos( timer + i );
		sphere.position.y = 5000 * Math.sin( timer + i * 1.1 );

	}

	// Sphere 1
	var sphere = spheres[200];
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
	sphere = spheres[201];
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
