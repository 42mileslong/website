
/**
 * @file A simple WebGL example drawing randomly generated terrain
 * @author Rafi Long, Eric Shaffer
 *
 * Using code from Lab4 as starting point.
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global An object holding the geometry for a 3D terrain */
var myTerrain;

/** @global An object holding the position of the player */
var position = vec3.fromValues(-1.25,-0.25,-1.5);

/** @global An object holding the speed of the player */
var speed = 0.0005;

/** @global An object holding the rotation of the player */
var rotation = quat.fromValues(0.0,0.2,0.0,1.0);
quat.normalize(rotation, rotation);

// View parameters
/** @global Direction of the starting view in world coordinates */
var defaultViewDir = vec3.fromValues(1.0, 0.0, 0.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.create();
/** @global Starting up vector for view matrix creation, in world coordinates */
var defaultUpDir = vec3.fromValues(0.0,0.0,1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var upDir = vec3.create();


//Light parameters
/** @global Light position in world coordinates */
var lightPosition = [-2,-3,2];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0.05,0.05,0.05];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0.05,0.05,0.05]

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [205.0/255.0,163.0/255.0,63.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.5,0.5,0.5];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];


//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);

  // If we don't find an element with the specified id
  // we do an early exit
  if (!shaderScript) {
    return null;
  }

  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
  shaderProgram.uniformColorHeightLoc = gl.getUniformLocation(shaderProgram, "uColorHeight");
  shaderProgram.uniformFogToggleLoc = gl.getUniformLocation(shaderProgram, "uFogToggle");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 * @param {Boolean} color whether to color based on height
 * @param {Boolean} fog whether to add fog
 */
function setMaterialUniforms(alpha,a,d,s,color,fog) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
  gl.uniform1i(shaderProgram.uniformColorHeightLoc, color)
  gl.uniform1i(shaderProgram.uniformFogToggleLoc, fog)
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    myTerrain = new Terrain(64,100,0.005,-0.5,0.5,-0.5,0.5);
    myTerrain.loadBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
    //console.log("function draw()")
    var transformVec = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective
    mat4.perspective(pMatrix,
      degToRad(45),
      gl.viewportWidth / gl.viewportHeight,
      0.1, 200.0);

    var viewPt = vec3.create();
    vec3.add(viewPt, position, viewDir);
    mat4.lookAt(mvMatrix,position,viewPt,upDir);

    // Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,0.0,-0.25,-2.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);

    var localLightPosition4 = vec4.fromValues(lightPosition[0], lightPosition[1], lightPosition[2], 1.0);
    vec3.transformMat4(localLightPosition4, localLightPosition4, mvMatrix);
    var localLightPosition3 = vec3.fromValues(localLightPosition4[0], localLightPosition4[1], localLightPosition4[2]);

    setMatrixUniforms();
    setLightUniforms(localLightPosition3,lAmbient,lDiffuse,lSpecular);

    var fog = document.getElementById("fog").checked;

    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
    {
      setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular, true, fog);
      myTerrain.drawTriangles();
    }

    if(document.getElementById("wirepoly").checked)
    {
      setMaterialUniforms(shininess,kAmbient,kEdgeBlack,kSpecular, false, fog);
      myTerrain.drawEdges();
    }

    if(document.getElementById("wireframe").checked)
    {
      setMaterialUniforms(shininess,kAmbient,kEdgeWhite,kSpecular, false, fog);
      myTerrain.drawEdges();
    }
    mvPopMatrix();
}

//----------------------------------------------------------------------------------
/**
 * @param {Vec3} axis the local axis to rotate around
 * @param {Quat} rotation the current rotation of the object from the world coordinates
 * @param {Float32} degree the number of degrees to rotate by
 */
function getTransformQuat(axis, rotation, degree) {
  var c = Math.cos(degree*(Math.PI/180)/2);
  var s = Math.sin(degree*(Math.PI/180)/2);

  var vec = vec3.clone(axis);
  vec = vec3.transformQuat(vec, vec, rotation);
  var transform = quat.fromValues(vec[0]*s, vec[1]*s, vec[2]*s, c);
  quat.normalize(transform, transform);
  return transform;
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  document.addEventListener('keydown', function(event) {
    const dSpeed = 0.0005;
    const dPitch = 0.5;
    const dRoll = 1.0;

    if (event.keyCode == 73) {
      // i key keycode
      speed += dSpeed;
    } else if (event.keyCode == 75) {
      // k key keycode
      speed -= dSpeed;
      if (speed < 0) speed = 0;
    } else if (event.keyCode == 83) {
      // s arrow keycode
      quat.multiply(
        rotation,
        getTransformQuat(vec3.fromValues(0.0,1.0,0.0), rotation, -dPitch),
        rotation);
    } else if (event.keyCode == 87) {
      // w arrow keycode
      quat.multiply(
        rotation,
        getTransformQuat(vec3.fromValues(0.0,1.0,0.0), rotation, dPitch),
        rotation);
    } else if (event.keyCode == 65) {
      // a arrow keycode
      quat.multiply(
        rotation,
        getTransformQuat(vec3.fromValues(1.0,0.0,0.0), rotation, -dRoll),
        rotation);
    } else if (event.keyCode == 68) {
      // s arrow keycode
      quat.multiply(
        rotation,
        getTransformQuat(vec3.fromValues(1.0,0.0,0.0), rotation, dRoll),
        rotation);
    }
  });

  tick();
}

//----------------------------------------------------------------------------------
/**
 * Update the view given changes in rotation
 */
function updateView() {
  vec3.copy(viewDir, defaultViewDir);
  vec3.transformQuat(viewDir, viewDir, rotation);

  vec3.copy(upDir, defaultUpDir);
  vec3.transformQuat(upDir, upDir, rotation);

  var delta = vec3.create();
  vec3.scale(delta, viewDir, speed);
  vec3.add(position, position, delta);
}

//----------------------------------------------------------------------------------
/**
 * Keep drawing frames....
 */
function tick() {
  updateView();
  requestAnimFrame(tick);
  draw();
}
