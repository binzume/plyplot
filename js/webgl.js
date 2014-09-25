// webgl + video demo

var gl;
var shaderProgram;

var aPosition;
var aColor;

// gl buffers
var vertBuffer;
var colorBuffer;
var vertIndexBuffer;

var cameraRot = [0.0, 0.0];
var cameraLookAt = [0.0, 0.0, -3.0];
var cameraDist = 5.0;

var pMatrix = mat4.create();
mat4.perspective(pMatrix, glMatrix.toRadian(60), 16/9, 0.1, 100 );

var points = 0;
var autoRotate = false;

var canvasElement;

var distLimit =  null;
var intervalID;
var videoFrame = 0;


function init(canvas, fragmentShaderId, vertexShaderId) {
	gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

	var fragmentShader = getShader(gl, fragmentShaderId);
	var vertexShader = getShader(gl, vertexShaderId);

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Unable to initialize the shader program.");
	}

	gl.useProgram(shaderProgram);

	gl.viewport(0, 0, canvas.width, canvas.height);

	aPosition = gl.getAttribLocation(shaderProgram, "aPosition");
	aColor = gl.getAttribLocation(shaderProgram, "aColor");
	uPMatrix = gl.getUniformLocation(shaderProgram, "uPMatrix");
	uMVMatrix = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}


function start(v,c) {
	canvasElement = document.getElementById(c);
	
	init(canvasElement, "shader-fs", "shader-vs");

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.enableVertexAttribArray(aPosition);
	gl.enableVertexAttribArray(aColor);

	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.enable(gl.BLEND);
	gl.enable(gl.DEPTH_TEST);
	initBuffers("");

	// intervalID = requestAnimationFrame(drawScene);
	intervalID = setInterval(drawScene, 50);
	// clearInterval(intervalID);
	// cancelAnimationFrame(intervalID);
}

function initBuffers(data) {

	var vert = [
//		1.0, 1.0, 0.0,
//		0.0, 0.0, 0.0,
//		2.0, 0.0, 0.0
	];

	var color = [
//		1.0, 0.0, 0.0, 1.0,
//		0.0, 1.0, 0.0, 1.0,
//		0.0, 0.0, 1.0, 1.0
	];

	// index
	var vertexIndices = [
//		0,  1,  2
	]

	// load!
	points = 0;
	var lines = data.split("\n");
	var startdata = false;
	var props = 0;
	var cols = {'x':0,'y':1,'z':2};
	for (var i = 0; i<lines.length; i++) {
		var row = lines[i].trim().split(/\s+/);
		if (row[0] == "end_header") {
			startdata = true;
			if (!cols['red']) cols['red'] = cols['diffuse_red'];
			if (!cols['green']) cols['green'] = cols['diffuse_green'];
			if (!cols['blue']) cols['blue'] = cols['diffuse_blue'];
		}
		if (row[0] == "property") {
			cols[row[2]] = props;
			props++;
		}
		if (startdata && row.length >= 6) {
			var x = parseFloat(row[0]), y = parseFloat(row[1]), z = parseFloat(row[2]);
			if (distLimit && (x+cameraLookAt[0])*(x+cameraLookAt[0]) + (z+cameraLookAt[2])*(z+cameraLookAt[2]) + (y*y)> distLimit * distLimit) {
				continue;
			}
			vert.push(x, y, z);
			color.push(parseFloat(row[cols['red']]/255),parseFloat(row[cols['green']]/255),parseFloat(row[cols['blue']]/255), 1.0);
			vertexIndices.push(vertexIndices.length);
			points++;
		}
	}
	console.log(points);

	vertBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vert), gl.STATIC_DRAW);


	colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);

	var indexIntBuffer =  new Uint16Array(vertexIndices);
	vertIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexIntBuffer, gl.STATIC_DRAW);

	//if (document.getElementById("gluicanvas")) {
	//	var canvas = document.getElementById("gluicanvas");
	//	uiPanelTexture = createTexture();
	//	updateTexture(uiPanelTexture, canvas);
	//}

}

function createTexture() {
	// NPOT textures may be ok...
	var tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);
	return tex;
}

function updateTexture(tex, video) {
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
}

function drawScene() {
	videoFrame ++;
	//updateTexture(videoTexture, videoElement);
	
	//var mMatrix = mat4.create();
	//var pMatrix = mat4.create();
	var mMatrix = mat4.create();
	mat4.translate(mMatrix, mMatrix,[0,0,-cameraDist]);
	mat4.rotateX(mMatrix, mMatrix, cameraRot[0]);
	mat4.rotateY(mMatrix, mMatrix, cameraRot[1]);
	mat4.translate(mMatrix, mMatrix, cameraLookAt);
	if (autoRotate) {
		cameraRot[1] += 0.02;
	}

	gl.uniformMatrix4fv(uPMatrix, false, pMatrix);
	gl.uniformMatrix4fv(uMVMatrix, false, mMatrix);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// vertex
	gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
	gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

	// color
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);

	// index
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuffer);

	// draw
	//gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, 0);

	gl.drawElements(gl.POINTS, points, gl.UNSIGNED_SHORT, 0);

/*
	if (uiPanelVisible && uiPanelTexture) {
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, uiPanelTexture);
		gl.uniform1i(gl.getUniformLocation(shaderProgram, "u_sampler"), 1);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
	}
*/

//	intervalID = requestAnimationFrame(drawScene);
}


  function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
      return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
      if (k.nodeType == 3) {
        str += k.textContent;
      }
      k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
      shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
      return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }


