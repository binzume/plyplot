
function getxhr() {
	var xhr;
	if(window.XMLHttpRequest) {
		xhr =  new XMLHttpRequest();
	} else if(window.ActiveXObject) {
		try {
			xhr = new ActiveXObject('Msxml2.XMLHTTP');
		} catch (e) {
			xhr = new ActiveXObject('Microsoft.XMLHTTP');
		}
	}
	return xhr;
}

function fullScreen(f) {
	var canvas = document.getElementById('screen');
	if (f) {
	    if(canvas.requestFullScreen ) {
	      canvas.requestFullScreen();
	    } else if(canvas.webkitRequestFullScreen ) {
	      canvas.webkitRequestFullScreen();
	    }else if(canvas.mozRequestFullScreen ) {
	      canvas.mozRequestFullScreen();
	    }else if(canvas.msRequestFullscreen) {
	      canvas.msRequestFullscreen();
	    }
	} else {
	    canvas.webkitExitFullscreen();
	}
}

function checkLocationHash() {
	var m = location.hash.match(/^#ply=([^&]+)/);
	if (m) {
		var xhr = getxhr();
		xhr.open('GET', m[1]);
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4) return;
			if (xhr.status == 200) {
				loadPly(xhr.responseText);
			}
		};
		xhr.send();
	}
}

var drag = false;
var button = 0;
var dragX = 0, dragY = 0;
window.addEventListener('load',(function(e){
	start("glcanvas");
	
	document.getElementById('refresh').addEventListener('click',(function(e){
		loadPly(document.getElementById('ply').value);
	}),false);

	document.getElementById('fullscreen_button').addEventListener('click',(function(e){
		fullScreen(true);
	}),false);

	document.getElementById("glcanvas").addEventListener('mousedown', function(e){
		e.preventDefault();
		drag = true;
		button = e.button; // MSIE
		dragX = e.clientX;
		dragY = e.clientY;
	});

	document.getElementById("glcanvas").addEventListener('contextmenu', function(e){
		e.preventDefault();
	});

	document.body.addEventListener('mouseup', function(e){
		drag = false;
	});

	document.body.addEventListener('mousemove', function(e){
		if (drag) {
			if (button == 2) {
				cameraDist -= (e.clientY - dragY) * 0.01;
				cameraDist = Math.max(cameraDist, 1.0);
			} else if (button == 1) {
				var d = vec3.fromValues((e.clientX - dragX) * 0.01, -(e.clientY - dragY) * 0.01, 0);
				vec3.rotateX(d, d, [0,0,0], -cameraRot[0]);
				vec3.rotateY(d, d, [0,0,0], -cameraRot[1]);
				vec3.add(cameraLookAt, cameraLookAt, d);
				//cameraLookAt[0] -= (e.clientX - dragX) * 0.01;
				//cameraLookAt[1] += (e.clientY - dragY) * 0.01;
			} else {
				cameraRot[1] -= (e.clientX - dragX) * 0.01;
				cameraRot[0] += (e.clientY - dragY) * 0.01;
			}
			dragX = e.clientX;
			dragY = e.clientY;
		}
	});

	document.getElementById("glcanvas").addEventListener('mousewheel', function(e){
	console.log(e.wheelDelta);
		cameraDist -= (e.wheelDelta || e.detail) * 0.01;
		cameraDist = Math.max(cameraDist, 1.0);
		e.preventDefault();
	});

	document.body.addEventListener('dragover', function(e){
		e.preventDefault();
	});
	document.body.addEventListener('drop', function(e){
		e.preventDefault();
		if (e.dataTransfer.getData('URL')) {
	    	console.log(e.dataTransfer.getData('URL'));
	    	console.log(e.dataTransfer.getData('text/html'));
	    }
		var file = e.dataTransfer.files[0];
		if (file) {
			var reader = new FileReader();
			reader.readAsText(file);
			reader.onload = function(ev){
				loadPly(reader.result);
			}
		}
	});

	checkLocationHash();
}),false);
