// webgl + video demo

var gl;
var shaderProgram;

var aPosition;
var aColor;

// gl buffers
var bufferObject;
var axis;

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


function GLDrawable() {
	this.vertBuffer = null; // attribute vec3 aPosition;
	this.normBuffer = null; // attribute vec4 aNormal
	this.colorBuffer = null; // attribute vec4 aColor
	this.indexBuffer = null;
	this.drawMode = gl.POINTS; // gl.TRIANGLES
	this.vertexes = 0;
}

GLDrawable.prototype.draw = function(gl) {
	// index
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

	for (var offset = 0; offset < this.vertexes; offset+=65536 ) {
		// vertex
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, offset * 4 * 3);

		// color
		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
		gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, offset * 4 * 4);

		// draw
		gl.drawElements(this.drawMode, Math.min(this.vertexes - offset, 65536), gl.UNSIGNED_SHORT, offset * 2);
	}

}

GLDrawable.prototype.init = function(gl, verts, norm, colors, indices) {
	this.free();
	this.vertexes = verts.length / 3;

	this.vertBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

	this.colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

	this.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}

GLDrawable.prototype.free = function(gl) {
	if (this.vertBuffer) {
		gl.deleteBuffer(this.vertBuffer);
		gl.deleteBuffer(this.colorBuffer);
		gl.deleteBuffer(this.indexBuffer);
		this.vertBuffer = null;
	}
}




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

function updateViewport() {
	var w = canvasElement.clientWidth;
	var h = canvasElement.clientHeight;
	console.log([w,h]);
	if (canvasElement.width != w || canvasElement.height != h) {
		canvasElement.width = w;
		canvasElement.height = h;
		gl.viewport(0, 0, w, h);
		mat4.perspective(pMatrix, glMatrix.toRadian(60), w/h, 0.1, 100 );
	}
}

function start(v,c) {
	canvasElement = document.getElementById(c);

	init(canvasElement, "shader-fs", "shader-vs");

	updateViewport();
	window.addEventListener('resize', function(e){
		updateViewport();
	});

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.enableVertexAttribArray(aPosition);
	gl.enableVertexAttribArray(aColor);

	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.enable(gl.BLEND);
	gl.enable(gl.DEPTH_TEST);
	
	axis = createAxisLines(gl);

	if (intervalID) {
		clearInterval(intervalID);
		// cancelAnimationFrame(intervalID);
	}
	intervalID = setInterval(drawScene, 50);
	// intervalID = requestAnimationFrame(drawScene);
}

function createAxisLines(gl) {
	var sz = 1.0;
	var verts = [
		0.0, 0.0, 0.0,
		sz , 0.0, 0.0,
		0.0, 0.0, 0.0,
		0.0, sz , 0.0,
		0.0, 0.0, 0.0,
		0.0, 0.0, sz
	];

	var colors = [
		1.0, 0.0, 0.0, 1.0,
		1.0, 0.0, 0.0, 1.0,
		0.0, 1.0, 0.0, 1.0,
		0.0, 1.0, 0.0, 1.0,
		0.0, 0.0, 1.0, 1.0,
		0.0, 0.0, 1.0, 1.0
	];

	var indices = [
		0, 1, 2, 3, 4, 5
	];

	var o = new GLDrawable();
	o.init(gl, verts, null, colors, indices);
	o.drawMode = gl.LINES;
	return o;
}

function loadPly(data) {

	var vert = [];
	var color = [];
	var vertexIndices = [];

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
	
	if (bufferObject) {
		bufferObject.free(gl);
	}
	cameraRot = [Math.PI, 0];
	bufferObject = new GLDrawable();
	bufferObject.init(gl, vert, null, color, vertexIndices);
}

function drawScene() {
	videoFrame ++;

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

	axis.draw(gl);

	if (bufferObject) {
		bufferObject.draw(gl);
	}

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


