
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
class FullScreenUtils {
    /** Enters fullscreen. */
    enterFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen({ navigationUI: "hide" });
        }
    }
    /** Exits fullscreen */
    exitFullScreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
    /**
     * Adds cross-browser fullscreenchange event
     *
     * @param exitHandler Function to be called on fullscreenchange event
     */
    addFullScreenListener(exitHandler) {
        document.addEventListener("fullscreenchange", exitHandler, false);
    }
    /**
     * Checks fullscreen state.
     *
     * @return `true` if fullscreen is active, `false` if not
     */
    isFullScreen() {
        return !!document.fullscreenElement;
    }
}

class BinaryDataLoader {
    static async load(url) {
        const response = await fetch(url);
        return response.arrayBuffer();
    }
}

class UncompressedTextureLoader {
    static load(url, gl, minFilter = gl.LINEAR, magFilter = gl.LINEAR, clamp = false) {
        return new Promise((resolve, reject) => {
            const texture = gl.createTexture();
            if (texture === null) {
                reject("Error creating WebGL texture");
                return;
            }
            const image = new Image();
            image.src = url;
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
                if (clamp === true) {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                }
                else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                }
                gl.bindTexture(gl.TEXTURE_2D, null);
                if (image && image.src) {
                    console.log(`Loaded texture ${url} [${image.width}x${image.height}]`);
                }
                resolve(texture);
            };
            image.onerror = () => reject("Cannot load image");
        });
    }
    static async loadCubemap(url, gl) {
        const texture = gl.createTexture();
        if (texture === null) {
            throw new Error("Error creating WebGL texture");
        }
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        const promises = [
            { type: gl.TEXTURE_CUBE_MAP_POSITIVE_X, suffix: "-posx.png" },
            { type: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, suffix: "-negx.png" },
            { type: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, suffix: "-posy.png" },
            { type: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, suffix: "-negy.png" },
            { type: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, suffix: "-posz.png" },
            { type: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, suffix: "-negz.png" }
        ].map(face => new Promise((resolve, reject) => {
            const image = new Image();
            image.src = url + face.suffix;
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                gl.texImage2D(face.type, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                if (image && image.src) {
                    console.log(`Loaded texture ${url}${face.suffix} [${image.width}x${image.height}]`);
                }
                resolve();
            };
            image.onerror = () => reject("Cannot load image");
        }));
        await Promise.all(promises);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }
}

class FullModel {
    /** Default constructor. */
    constructor() {
        /** Number of model indices. */
        this.numIndices = 0;
    }
    loadBuffer(gl, buffer, target, arrayBuffer) {
        var byteArray = new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength);
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, byteArray, gl.STATIC_DRAW);
    }
    /**
     * Loads model.
     *
     * @param url Base URL to model indices and strides files.
     * @param gl WebGL context.
     * @returns Promise which resolves when model is loaded.
     */
    async load(url, gl) {
        const dataIndices = await BinaryDataLoader.load(url + "-indices.bin");
        const dataStrides = await BinaryDataLoader.load(url + "-strides.bin");
        console.log(`Loaded ${url}-indices.bin (${dataIndices.byteLength} bytes)`);
        console.log(`Loaded ${url}-strides.bin (${dataStrides.byteLength} bytes)`);
        this.bufferIndices = gl.createBuffer();
        this.loadBuffer(gl, this.bufferIndices, gl.ELEMENT_ARRAY_BUFFER, dataIndices);
        this.numIndices = dataIndices.byteLength / 2 / 3;
        this.bufferStrides = gl.createBuffer();
        this.loadBuffer(gl, this.bufferStrides, gl.ARRAY_BUFFER, dataStrides);
    }
    /**
     * Binds buffers for a `glDrawElements()` call.
     *
     * @param gl WebGL context.
     */
    bindBuffers(gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferStrides);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferIndices);
    }
    /**
     * Returns number of indices in model.
     *
     * @return Number of indices
     */
    getNumIndices() {
        return this.numIndices;
    }
}

class BaseShader {
    /**
     * Constructor. Compiles shader.
     *
     * @param gl WebGL context.
     */
    constructor(gl) {
        this.gl = gl;
        this.vertexShaderCode = "";
        this.fragmentShaderCode = "";
        this.fillCode();
        this.initShader();
    }
    /**
     * Creates WebGL shader from code.
     *
     * @param type Shader type.
     * @param code GLSL code.
     * @returns Shader or `undefined` if there were errors during shader compilation.
     */
    getShader(type, code) {
        const shader = this.gl.createShader(type);
        if (!shader) {
            console.warn('Error creating shader.');
            return undefined;
        }
        this.gl.shaderSource(shader, code);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.warn(this.gl.getShaderInfoLog(shader));
            return undefined;
        }
        return shader;
    }
    /**
     * Get shader unform location.
     *
     * @param uniform Uniform name.
     * @return Uniform location.
     */
    getUniform(uniform) {
        if (this.program === undefined) {
            throw new Error('No program for shader.');
        }
        const result = this.gl.getUniformLocation(this.program, uniform);
        if (result !== null) {
            return result;
        }
        else {
            throw new Error(`Cannot get uniform "${uniform}".`);
        }
    }
    /**
     * Get shader attribute location.
     *
     * @param attrib Attribute name.
     * @return Attribute location.
     */
    getAttrib(attrib) {
        if (this.program === undefined) {
            throw new Error("No program for shader.");
        }
        return this.gl.getAttribLocation(this.program, attrib);
    }
    /** Initializes shader. */
    initShader() {
        const fragmentShader = this.getShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderCode);
        const vertexShader = this.getShader(this.gl.VERTEX_SHADER, this.vertexShaderCode);
        const shaderProgram = this.gl.createProgram();
        if (fragmentShader === undefined || vertexShader === undefined || shaderProgram === null) {
            return;
        }
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            console.warn(this.constructor.name + ": Could not initialise shader");
        }
        else {
            console.log(this.constructor.name + ": Initialised shader");
        }
        this.gl.useProgram(shaderProgram);
        this.program = shaderProgram;
        this.fillUniformsAttributes();
    }
    /** Activates shader. */
    use() {
        if (this.program) {
            this.gl.useProgram(this.program);
        }
    }
    /** Deletes shader. */
    deleteProgram() {
        if (this.program) {
            this.gl.deleteProgram(this.program);
        }
    }
}

/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */

function create$2() {
  var out = new ARRAY_TYPE(9);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }

  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create$3() {
  var out = new ARRAY_TYPE(16);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity$3(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply$3(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate$2(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function scale$3(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function rotate$3(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */

function frustum(out, left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var nf = 1 / (near - far);
  out[0] = near * 2 * rl;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = near * 2 * tb;
  out[6] = 0;
  out[7] = 0;
  out[8] = (right + left) * rl;
  out[9] = (top + bottom) * tb;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = far * near * 2 * nf;
  out[15] = 0;
  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$4() {
  var out = new ARRAY_TYPE(3);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function fromValues$4(x, y, z) {
  var out = new ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Calculates the dot product of two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function cross(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Alias for {@link vec3.length}
 * @function
 */

var len = length;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach = function () {
  var vec = create$4();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
}();

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create$5() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to normalize
 * @returns {vec4} out
 */

function normalize$1(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  var len = x * x + y * y + z * z + w * w;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }

  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach$1 = function () {
  var vec = create$5();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
}();

/**
 * Quaternion
 * @module quat
 */

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */

function create$6() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  out[3] = 1;
  return out;
}
/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyVec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/

function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  var s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}
/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  var omega, cosom, sinom, scale0, scale1; // calc cosine

  cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  } // calculate coefficients


  if (1.0 - cosom > EPSILON) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  } // calculate final values


  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}
/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyMat3} m rotation matrix
 * @returns {quat} out
 * @function
 */

function fromMat3(out, m) {
  // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
  // article "Quaternion Calculus and Fast Animation".
  var fTrace = m[0] + m[4] + m[8];
  var fRoot;

  if (fTrace > 0.0) {
    // |w| > 1/2, may as well choose w > 1/2
    fRoot = Math.sqrt(fTrace + 1.0); // 2w

    out[3] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot; // 1/(4w)

    out[0] = (m[5] - m[7]) * fRoot;
    out[1] = (m[6] - m[2]) * fRoot;
    out[2] = (m[1] - m[3]) * fRoot;
  } else {
    // |w| <= 1/2
    var i = 0;
    if (m[4] > m[0]) i = 1;
    if (m[8] > m[i * 3 + i]) i = 2;
    var j = (i + 1) % 3;
    var k = (i + 2) % 3;
    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
  }

  return out;
}
/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */

var normalize$2 = normalize$1;
/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {ReadonlyVec3} a the initial vector
 * @param {ReadonlyVec3} b the destination vector
 * @returns {quat} out
 */

var rotationTo = function () {
  var tmpvec3 = create$4();
  var xUnitVec3 = fromValues$4(1, 0, 0);
  var yUnitVec3 = fromValues$4(0, 1, 0);
  return function (out, a, b) {
    var dot$$1 = dot(a, b);

    if (dot$$1 < -0.999999) {
      cross(tmpvec3, xUnitVec3, a);
      if (len(tmpvec3) < 0.000001) cross(tmpvec3, yUnitVec3, a);
      normalize(tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot$$1 > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      cross(tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot$$1;
      return normalize$2(out, out);
    }
  };
}();
/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {ReadonlyQuat} c the third operand
 * @param {ReadonlyQuat} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

var sqlerp = function () {
  var temp1 = create$6();
  var temp2 = create$6();
  return function (out, a, b, c, d, t) {
    slerp(temp1, a, d, t);
    slerp(temp2, b, c, t);
    slerp(out, temp1, temp2, 2 * t * (1 - t));
    return out;
  };
}();
/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {ReadonlyVec3} view  the vector representing the viewing direction
 * @param {ReadonlyVec3} right the vector representing the local "right" direction
 * @param {ReadonlyVec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */

var setAxes = function () {
  var matr = create$2();
  return function (out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];
    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];
    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];
    return normalize$2(out, fromMat3(out, matr));
  };
}();

/**
 * 2 Dimensional Vector
 * @module vec2
 */

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */

function create$8() {
  var out = new ARRAY_TYPE(2);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
  }

  return out;
}
/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach$2 = function () {
  var vec = create$8();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 2;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }

    return a;
  };
}();

class BaseRenderer {
    constructor() {
        this.mMMatrix = create$3();
        this.mVMatrix = create$3();
        this.mMVPMatrix = create$3();
        this.mProjMatrix = create$3();
        this.matOrtho = create$3();
        this.m_boundTick = this.tick.bind(this);
        this.isWebGL2 = false;
        this.viewportWidth = 0;
        this.viewportHeight = 0;
    }
    /** Getter for current WebGL context. */
    get gl() {
        if (this.m_gl === undefined) {
            throw new Error("No WebGL context");
        }
        return this.m_gl;
    }
    /** Logs last GL error to console */
    logGLError() {
        var err = this.gl.getError();
        if (err !== this.gl.NO_ERROR) {
            console.warn(`WebGL error # + ${err}`);
        }
    }
    /**
     * Binds 2D texture.
     *
     * @param textureUnit A texture unit to use
     * @param texture A texture to be used
     * @param uniform Shader's uniform ID
     */
    setTexture2D(textureUnit, texture, uniform) {
        this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(uniform, textureUnit);
    }
    /**
     * Binds cubemap texture.
     *
     * @param textureUnit A texture unit to use
     * @param texture A texture to be used
     * @param uniform Shader's uniform ID
     */
    setTextureCubemap(textureUnit, texture, uniform) {
        this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, texture);
        this.gl.uniform1i(uniform, textureUnit);
    }
    /**
     * Calculates FOV for matrix.
     *
     * @param matrix Output matrix
     * @param fovY Vertical FOV in degrees
     * @param aspect Aspect ratio of viewport
     * @param zNear Near clipping plane distance
     * @param zFar Far clipping plane distance
     */
    setFOV(matrix, fovY, aspect, zNear, zFar) {
        const fH = Math.tan(fovY / 360.0 * Math.PI) * zNear;
        const fW = fH * aspect;
        frustum(matrix, -fW, fW, -fH, fH, zNear, zFar);
    }
    /**
     * Calculates MVP matrix. Saved in this.mMVPMatrix
     */
    calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        identity$3(this.mMMatrix);
        rotate$3(this.mMMatrix, this.mMMatrix, 0, [1, 0, 0]);
        translate$2(this.mMMatrix, this.mMMatrix, [tx, ty, tz]);
        scale$3(this.mMMatrix, this.mMMatrix, [sx, sy, sz]);
        rotateX(this.mMMatrix, this.mMMatrix, rx);
        rotateY(this.mMMatrix, this.mMMatrix, ry);
        rotateZ(this.mMMatrix, this.mMMatrix, rz);
        multiply$3(this.mMVPMatrix, this.mVMatrix, this.mMMatrix);
        multiply$3(this.mMVPMatrix, this.mProjMatrix, this.mMVPMatrix);
    }
    /** Perform each frame's draw calls here. */
    drawScene() {
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }
    /** Called on each frame. */
    tick() {
        requestAnimationFrame(this.m_boundTick);
        this.resizeCanvas();
        this.drawScene();
        this.animate();
    }
    /**
     * Initializes WebGL context.
     *
     * @param canvas Canvas to initialize WebGL.
     */
    initGL(canvas) {
        const gl = canvas.getContext("webgl", { alpha: false });
        if (gl === null) {
            throw new Error("Cannot initialize WebGL context");
        }
        // this.isETC1Supported = !!gl.getExtension('WEBGL_compressed_texture_etc1');
        return gl;
    }
    ;
    /**
     * Initializes WebGL 2 context
     *
     * @param canvas Canvas to initialize WebGL 2.
     */
    initGL2(canvas) {
        let gl = canvas.getContext("webgl2", { alpha: false });
        if (gl === null) {
            console.warn('Could not initialise WebGL 2, falling back to WebGL 1');
            return this.initGL(canvas);
        }
        return gl;
    }
    ;
    /**
     * Initializes WebGL and calls all callbacks.
     *
     * @param canvasID ID of canvas element to initialize WebGL.
     * @param requestWebGL2 Set to `true` to initialize WebGL 2 context.
     */
    init(canvasID, requestWebGL2 = false) {
        this.onBeforeInit();
        this.canvas = document.getElementById(canvasID);
        if (this.canvas === null) {
            throw new Error("Cannot find canvas element");
        }
        this.viewportWidth = this.canvas.width;
        this.viewportHeight = this.canvas.height;
        this.m_gl = !!requestWebGL2 ? this.initGL2(this.canvas) : this.initGL(this.canvas);
        if (this.m_gl) {
            this.resizeCanvas();
            this.onAfterInit();
            this.initShaders();
            this.loadData();
            this.m_boundTick();
        }
        else {
            this.onInitError();
        }
    }
    /** Adjusts viewport according to resizing of canvas. */
    resizeCanvas() {
        if (this.canvas === undefined) {
            return;
        }
        const cssToRealPixels = window.devicePixelRatio || 1;
        const displayWidth = Math.floor(this.canvas.clientWidth * cssToRealPixels);
        const displayHeight = Math.floor(this.canvas.clientHeight * cssToRealPixels);
        if (this.canvas.width != displayWidth || this.canvas.height != displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
        }
    }
    /**
     * Logs GL error to console.
     *
     * @param operation Operation name.
     */
    checkGlError(operation) {
        let error;
        while ((error = this.gl.getError()) !== this.gl.NO_ERROR) {
            console.error(`${operation}: glError ${error}`);
        }
    }
    /** @inheritdoc */
    unbindBuffers() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    }
    /** @inheritdoc */
    getMVPMatrix() {
        return this.mMVPMatrix;
    }
    /** @inheritdoc */
    getOrthoMatrix() {
        return this.matOrtho;
    }
    /** @inheritdoc */
    getModelMatrix() {
        return this.mMMatrix;
    }
    /** @inheritdoc */
    getViewMatrix() {
        return this.mVMatrix;
    }
}

class FrameBuffer {
    /** Constructor. */
    constructor(gl) {
        this.gl = gl;
        this.m_textureHandle = null;
        this.m_depthTextureHandle = null;
        this.m_framebufferHandle = null;
        this.m_depthbufferHandle = null;
    }
    /** Creates OpenGL objects */
    createGLData(width, height) {
        this.m_width = width;
        this.m_height = height;
        if (this.m_textureHandle !== null && this.m_width > 0 && this.m_height > 0) {
            this.m_framebufferHandle = this.gl.createFramebuffer(); // alternative to GLES20.glGenFramebuffers()
            if (this.m_textureHandle !== null) {
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.m_textureHandle);
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.m_framebufferHandle);
                this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.m_textureHandle, 0);
                this.checkGlError("FB");
            }
            if (this.m_depthTextureHandle === null) {
                this.m_depthbufferHandle = this.gl.createRenderbuffer();
                this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.m_depthbufferHandle);
                this.checkGlError("FB - glBindRenderbuffer");
                this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.m_width, this.m_height);
                this.checkGlError("FB - glRenderbufferStorage");
                this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.m_depthbufferHandle);
                this.checkGlError("FB - glFramebufferRenderbuffer");
            }
            else {
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.m_depthTextureHandle);
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.m_framebufferHandle);
                this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.m_depthTextureHandle, 0);
                this.checkGlError("FB depth");
            }
            const result = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            if (result != this.gl.FRAMEBUFFER_COMPLETE) {
                console.error(`Error creating framebufer: ${result}`);
            }
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
            // this.gl.bindTexture(this.gl.TEXTURE_2D, 0);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
    }
    checkGlError(op) {
        let error;
        while ((error = this.gl.getError()) !== this.gl.NO_ERROR) {
            console.error(`${op}: glError ${error}`);
        }
    }
    get width() {
        return this.m_width;
    }
    set width(value) {
        this.m_width = value;
    }
    get height() {
        return this.m_height;
    }
    set height(value) {
        this.m_height = value;
    }
    get textureHandle() {
        return this.m_textureHandle;
    }
    set textureHandle(value) {
        this.m_textureHandle = value;
    }
    get depthbufferHandle() {
        return this.m_depthbufferHandle;
    }
    set depthbufferHandle(value) {
        this.m_depthbufferHandle = value;
    }
    get framebufferHandle() {
        return this.m_framebufferHandle;
    }
    set framebufferHandle(value) {
        this.m_framebufferHandle = value;
    }
    get depthTextureHandle() {
        return this.m_depthTextureHandle;
    }
    set depthTextureHandle(value) {
        this.m_depthTextureHandle = value;
    }
}

/** Utilities to create various textures. */
class TextureUtils {
    /**
     * Creates non-power-of-two (NPOT) texture.
     *
     * @param gl WebGL context.
     * @param texWidth Texture width.
     * @param texHeight Texture height.
     * @param hasAlpha Set to `true` to create texture with alpha channel.
     */
    static createNpotTexture(gl, texWidth, texHeight, hasAlpha = false) {
        const textureID = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textureID);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        let glFormat = null, glInternalFormat = null;
        if (hasAlpha) {
            glFormat = gl.RGBA;
            glInternalFormat = gl.RGBA;
        }
        else {
            glFormat = gl.RGB;
            glInternalFormat = gl.RGB;
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, texWidth, texHeight, 0, glFormat, gl.UNSIGNED_BYTE, null);
        return textureID;
    }
    /**
     * Creates depth texture.
     *
     * @param gl WebGL context.
     * @param texWidth Texture width.
     * @param texHeight Texture height.
     */
    static createDepthTexture(gl, texWidth, texHeight) {
        const textureID = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textureID);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const version = gl.getParameter(gl.VERSION) || "";
        const glFormat = gl.DEPTH_COMPONENT;
        const glInternalFormat = version.includes("WebGL 2")
            ? gl.DEPTH_COMPONENT16
            : gl.DEPTH_COMPONENT;
        const type = gl.UNSIGNED_SHORT;
        // In WebGL, we cannot pass array to depth texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, texWidth, texHeight, 0, glFormat, type, null);
        return textureID;
    }
}

class CombinedAnimation {
    constructor(frames) {
        this.frames = frames;
        this.start = 0;
        this.end = 0;
        this.currentCoeff = 0;
    }
    getStart() {
        return this.start;
    }
    getEnd() {
        return this.end;
    }
    getFramesCount() {
        return this.frames;
    }
    getCurrentCoeff() {
        return this.currentCoeff;
    }
    clamp(i, low, high) {
        return Math.max(Math.min(i, high), low);
    }
    animate(coeff) {
        const clampedCoeff = this.clamp(coeff, 0.0, 1.0);
        this.start = Math.trunc(clampedCoeff * (this.frames - 1));
        if (this.start == this.frames - 1)
            this.start = this.frames - 2;
        this.end = this.start + 1;
        this.currentCoeff = (clampedCoeff * (this.frames - 1)) - this.start;
    }
}

class DiffuseShader extends BaseShader {
    /** @inheritdoc */
    fillCode() {
        this.vertexShaderCode = 'uniform mat4 view_proj_matrix;\n' +
            'attribute vec4 rm_Vertex;\n' +
            'attribute vec2 rm_TexCoord0;\n' +
            'varying vec2 vTextureCoord;\n' +
            '\n' +
            'void main() {\n' +
            '  gl_Position = view_proj_matrix * rm_Vertex;\n' +
            '  vTextureCoord = rm_TexCoord0;\n' +
            '}';
        this.fragmentShaderCode = 'precision mediump float;\n' +
            'varying vec2 vTextureCoord;\n' +
            'uniform sampler2D sTexture;\n' +
            '\n' +
            'void main() {\n' +
            '  gl_FragColor = texture2D(sTexture, vTextureCoord);\n' +
            '}';
    }
    /** @inheritdoc */
    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform('view_proj_matrix');
        this.rm_Vertex = this.getAttrib('rm_Vertex');
        this.rm_TexCoord0 = this.getAttrib('rm_TexCoord0');
        this.sTexture = this.getUniform('sTexture');
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined || this.rm_TexCoord0 === undefined || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2), 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.FLOAT, false, 4 * (3 + 2), 4 * 3);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("DiffuseShader glDrawElements");
    }
}
//# sourceMappingURL=webgl-framework.es6.js.map

/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON$1 = 0.000001;
var ARRAY_TYPE$1 = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create() {
  var out = new ARRAY_TYPE$1(16);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */

function clone(a) {
  var out = new ARRAY_TYPE$1(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function scale(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function rotate(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < EPSILON$1) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Returns the translation vector component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslation,
 *  the returned vector will be the same as the translation vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive translation component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getTranslation(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}
/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function ortho(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
}
/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis.
 * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function lookAt(out, eye, center, up) {
  var x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  var eyex = eye[0];
  var eyey = eye[1];
  var eyez = eye[2];
  var upx = up[0];
  var upy = up[1];
  var upz = up[2];
  var centerx = center[0];
  var centery = center[1];
  var centerz = center[2];

  if (Math.abs(eyex - centerx) < EPSILON$1 && Math.abs(eyey - centery) < EPSILON$1 && Math.abs(eyez - centerz) < EPSILON$1) {
    return identity(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;
  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);

  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);

  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$1() {
  var out = new ARRAY_TYPE$1(3);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */

function scale$1(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize$3(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach$3 = function () {
  var vec = create$1();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
}();

class DunesShader extends DiffuseShader {
    static getInstance(gl, lightmapIndex) {
        DunesShader.lightmapIndex = lightmapIndex;
        return new DunesShader(gl);
    }
    fillCode() {
        this.vertexShaderCode = "uniform mat4 view_proj_matrix;\n" +
            "attribute vec4 rm_Vertex;\n" +
            "attribute vec2 rm_TexCoord0;\n" +
            "attribute vec3 rm_Normal;\n" +
            "varying vec2 vTextureCoord;\n" +
            "varying vec2 vUpwindTexCoord;\n" +
            "varying vec2 vLeewardTexCoord2;\n" +
            "varying vec2 vWindSpotsTexCoord;\n" +
            "varying vec3 vNormal;\n" +
            "varying float vSlopeCoeff;\n" + // Windward slope coefficient
            "varying float vSlopeCoeff2;\n" + // Leeward slope coefficient
            "varying vec2 vDetailCoord1;\n" +
            "varying float vFogAmount;\n" +
            "varying float vDetailFade;\n" +
            "\n" +
            "uniform float fogDistance;\n" +
            "uniform float fogStartDistance;\n" +
            "uniform float detailDistance;\n" +
            "uniform float detailStartDistance;\n" +
            "uniform float uTime;\n" +
            "\n" +
            "void main() {\n" +
            "  gl_Position = view_proj_matrix * rm_Vertex;\n" +
            "  vTextureCoord = rm_TexCoord0;\n" +
            "  vNormal = rm_Normal;\n" +
            "  vSlopeCoeff = clamp( 4.0*dot(vNormal, normalize(vec3(1.0, 0.0, 0.13))), 0.0, 1.0);\n" +
            "  vSlopeCoeff2 = clamp( 14.0*dot(vNormal, normalize(vec3(-1.0, 0.0, -0.2))), 0.0, 1.0);\n" +
            "  vUpwindTexCoord = vTextureCoord * vec2(100.0, 10.0);\n" +
            "  vUpwindTexCoord.y += uTime;\n" +
            "  vDetailCoord1 = rm_TexCoord0 * vec2(100.0, 100.0);\n" +
            "  vLeewardTexCoord2 = vTextureCoord * vec2(20.0, 30.0);\n" +
            "  vLeewardTexCoord2.y += uTime;\n" +
            "  vWindSpotsTexCoord = vTextureCoord * vec2(1.5, 1.5);\n" +
            "  vWindSpotsTexCoord.x += uTime * 0.1;\n" +
            "  vFogAmount = clamp((length(gl_Position) - fogStartDistance) / fogDistance, 0.0, 1.0);\n" +
            "  vDetailFade = 1.0 - clamp((length(gl_Position) - detailStartDistance) / detailDistance, 0.0, 1.0);\n" +
            "}";
        this.fragmentShaderCode = "precision mediump float;\n" +
            "varying vec2 vTextureCoord;\n" +
            "varying vec3 vNormal;\n" +
            "varying float vSlopeCoeff;\n" +
            "varying float vSlopeCoeff2;\n" +
            "varying vec2 vUpwindTexCoord;\n" +
            "varying vec2 vLeewardTexCoord2;\n" +
            "varying vec2 vWindSpotsTexCoord;\n" +
            "varying vec2 vDetailCoord1;\n" +
            "varying float vFogAmount;\n" +
            "varying float vDetailFade;\n" +
            "uniform sampler2D sTexture;\n" +
            "uniform sampler2D sDust;\n" +
            "uniform sampler2D sDetail1;\n" +
            "uniform float uDustOpacity;\n" +
            "uniform vec4 uColor;\n" +
            "uniform vec4 uFogColor;\n" +
            "uniform vec4 uShadowColor;\n" +
            "uniform vec4 uWavesColor;\n" +
            "void main() {\n" +
            "  vec4 windward = texture2D(sDust, vUpwindTexCoord);\n" +
            "  vec4 leeward2 = texture2D(sDust, vLeewardTexCoord2);\n" +
            "  vec4 detailColor = texture2D(sDetail1, vDetailCoord1);" +
            "  float detail1 = detailColor.g - 0.5;\n" +
            "  float detail2 = detailColor.r - 0.5;\n" +
            "  detail1 *= vDetailFade;\n" +
            "  detail2 *= vDetailFade;\n" +
            "  vec4 textureData = texture2D(sTexture, vTextureCoord);\n" +
            "  gl_FragColor = textureData.r * uColor;\n" +
            // "  gl_FragColor.b += vSlopeCoeff;\n" + // windward slopes visualization
            // "  gl_FragColor.g += vSlopeCoeff2;\n" + // leeward slopes visualization
            "  vec4 waves = windward * uDustOpacity * vSlopeCoeff;\n" +
            "  waves += leeward2 * uDustOpacity * vSlopeCoeff2;\n" +
            "  waves *= 1.0 - clamp(texture2D(sDust, vWindSpotsTexCoord).r * 5.0, 0.0, 1.0);\n" +
            "  gl_FragColor += waves * uWavesColor;\n" +
            "  gl_FragColor.rgb += mix(detail2, detail1, vSlopeCoeff2);\n" +
            "  gl_FragColor *= mix(uShadowColor, vec4(1.0, 1.0, 1.0, 1.0), textureData[" + DunesShader.lightmapIndex + "]);" +
            "  gl_FragColor = mix(gl_FragColor, uFogColor, vFogAmount);\n" +
            // "  gl_FragColor.r = vDetailFade;\n" + // detail distance visualization
            // "  gl_FragColor.r = texture2D(sDust, vWindSpotsTexCoord).r;\n" + // wind terrain spots visualization
            "}";
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.rm_Normal = this.getAttrib("rm_Normal");
        this.sDust = this.getUniform("sDust");
        this.uTime = this.getUniform("uTime");
        this.uDustOpacity = this.getUniform("uDustOpacity");
        this.sDetail1 = this.getUniform("sDetail1");
        this.uColor = this.getUniform("uColor");
        this.uFogColor = this.getUniform("uFogColor");
        this.uShadowColor = this.getUniform("uShadowColor");
        this.uWavesColor = this.getUniform("uWavesColor");
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
        this.detailStartDistance = this.getUniform("detailStartDistance");
        this.detailDistance = this.getUniform("detailDistance");
    }
}
DunesShader.lightmapIndex = 0;
//# sourceMappingURL=DunesShader.js.map

const particlesCoordinates = [
    [
        [3.797847, -6.286594, -7.197602],
        [3.257277, -7.911734, -6.909169],
        [2.434960, -9.520692, -6.680535],
        [1.537812, -10.600622, -6.578402],
        [1.095975, -11.738160, -6.499978],
        [0.327464, -13.221872, -6.359738],
        [0.136057, -15.155611, -6.520223],
        [0.402834, -16.198668, -6.532903],
        [1.516392, -17.189711, -6.495209],
        [-11.773868, -11.695264, -6.455437],
        [-13.204258, -10.992879, -6.607471],
        [-13.967643, -9.917362, -6.760038],
        [-13.576998, -8.467162, -6.636061],
        [-12.168928, -7.106575, -6.749729],
        [-10.473310, -5.867888, -6.739241],
        [-9.454960, -4.724994, -6.628104],
        [-9.239940, -0.640998, -6.744101],
        [-10.041563, 1.080194, -5.970007],
        [-9.797917, 2.903881, -6.014874],
        [-9.816783, 4.771972, -5.855431],
        [-10.719968, 6.510313, -5.586894],
        [-11.532514, 8.180022, -5.538589],
        [-12.306478, 10.042962, -5.626741],
        [-12.592357, 11.609372, -5.999370],
        [-11.636161, 13.976769, -6.255528],
        [-10.783170, 16.487112, -6.895906],
        [-11.892997, 18.238689, -6.908795],
        [-13.784470, 20.472527, -7.353825],
        [-16.344418, 22.429338, -7.701272],
        [-16.214247, 24.985479, -7.531041],
        [-15.582586, 26.783958, -7.479846],
        [-13.494443, 28.462156, -7.465666],
        [-11.091772, 30.380070, -7.121482],
        [-24.015993, 23.117214, -7.778510],
        [-23.426142, 21.482300, -7.811589],
        [-23.065290, 20.323423, -7.828486],
        [-24.772711, 18.825783, -7.291061],
        [-25.983522, 17.457598, -6.931326],
        [-27.532780, 17.045506, -6.780737],
        [-12.781576, 3.861169, -5.955958],
        [-14.767230, 5.113492, -6.390795],
        [-16.293585, 7.043332, -6.518155],
        [-18.581059, 9.066100, -6.664069],
        [-20.395561, 11.061415, -6.407583],
        [-22.181387, 12.940652, -6.421689],
        [-24.389889, 12.917274, -6.228668],
        [-25.524071, 11.112617, -6.374214],
        [-27.414509, 8.460627, -6.282979],
        [-30.940557, 8.928456, -6.238718],
        [-34.749722, 9.925959, -6.201010],
        [-38.143421, 11.905063, -6.997055],
        [-0.504851, 19.266747, -7.031710],
        [1.543244, 20.622246, -6.306358],
        [2.204661, 22.902372, -5.735254],
        [-8.775705, -28.394053, -6.013936],
        [-10.623506, -31.260582, -6.010919],
        [-12.400331, -33.381210, -6.062407],
        [-13.790028, -34.714314, -6.428557],
        [-14.939597, -36.714718, -6.535082],
        [-15.996234, -39.406456, -6.974948],
        [13.418262, -10.982242, -5.782156],
        [15.271839, -13.615969, -5.419602],
        [15.571353, -16.582842, -4.845881],
        [14.949120, -19.372881, -5.097161],
        [13.581828, -20.659119, -5.365977],
        [13.974709, -23.700359, -6.349177],
        [15.477549, -26.092430, -6.831174],
        [17.901516, -27.656570, -6.625923],
        [20.304560, -28.114456, -6.344109],
        [18.052546, -20.745586, -5.575726],
        [20.128071, -22.281090, -6.003333],
        [21.378214, -24.450111, -6.082936],
        [16.068005, 5.974547, -6.534090],
        [18.618551, 4.860611, -6.550029],
        [20.353714, 3.445243, -6.349627],
        [21.812181, 0.898544, -6.877178],
        [23.263376, -1.047728, -7.043772],
        [24.343250, -2.473955, -7.105092],
        [26.996326, -3.294457, -6.381234],
        [39.379471, -42.484283, -5.557773],
        [37.641476, -40.448425, -5.942012],
        [35.050461, -38.663509, -6.229217],
        [33.240929, -36.611977, -6.244487],
        [32.454700, -35.140968, -6.036536],
        [32.125698, -33.710964, -5.585669],
        [32.038967, -31.609367, -5.712609],
        [31.418110, -29.404728, -5.146559],
        [32.913330, -27.490213, -5.784925],
        [32.787357, -24.837265, -6.344480],
        [32.184589, -22.767290, -6.851623],
        [30.444052, -20.148623, -7.086167],
        [27.155426, -13.544806, -5.574348],
        [24.675375, -12.539523, -5.055146],
        [23.135242, -10.979891, -5.278596],
        [22.090630, -8.924817, -5.919033],
        [17.244547, 18.869747, -6.581208],
        [16.257538, 20.480131, -6.479290],
        [16.171835, 22.694475, -6.654986],
        [16.036203, 25.064747, -6.546235],
        [15.789038, 27.317671, -6.438390],
        [15.673842, 29.180683, -6.316485],
        [16.218796, 31.584372, -6.310058],
        [16.106825, 33.965702, -6.295755],
        [19.053200, 18.861626, -5.975521],
        [19.394009, 21.370308, -6.129910],
        [19.817186, 23.026613, -6.227627],
        [21.013525, 24.243294, -6.418154],
        [21.996265, 24.846678, -6.389295],
        [26.746769, 33.049301, -7.667660],
        [26.068115, 31.376324, -7.514818],
        [26.068115, 31.376324, -7.514818],
        [25.879719, 30.256744, -7.301705],
        [27.309278, 28.767933, -7.885481],
        [-22.567091, 42.290012, -6.409546],
        [-22.514784, 40.712036, -6.506201],
        [-22.323896, 38.928638, -6.350101],
        [-21.626043, 37.254383, -6.545244],
        [-20.370230, 35.904743, -6.985720],
        [-18.512285, 35.683197, -6.638375],
        [-19.812538, -33.726856, -5.912998],
        [-18.363031, -32.080524, -5.962108],
        [-17.968964, -30.152220, -6.282501],
        [-18.502249, -28.253357, -6.299263],
        [-19.857853, -26.581051, -6.413753],
        [-21.297569, -25.050074, -6.752588],
        [-18.716919, -4.029379, -6.339517],
        [-20.024269, -2.391857, -6.444502],
        [-21.637423, -0.949305, -6.561546],
        [-23.206278, -0.263939, -6.601428],
        [-0.812302, 10.684579, -7.216669],
        [-0.693966, 8.872724, -7.124901],
        [-0.570962, 6.816460, -7.305361],
        [-0.227357, 4.861264, -7.692311],
        [19.292822, 17.414349, -5.912505],
        [19.109339, 15.659279, -6.205120],
        [2.204661, 22.902372, -5.735254],
        [2.113003, 24.410294, -5.890166],
        [2.602419, 26.452446, -6.088997],
        [9.412998, 18.520315, -6.909956],
        [8.074727, 19.965702, -6.562678],
        [7.157160, 21.856012, -6.057847],
        [6.920478, 23.582886, -5.429749],
        [6.995556, 25.009964, -5.225165],
        [8.337574, 26.211798, -5.375374],
        [11.603891, 24.970663, -6.206645],
        [12.344122, 23.281786, -6.440074],
        [12.507367, 21.285116, -6.593583]
    ]
];
//# sourceMappingURL=DuneCapsParticles.js.map

class SoftDiffuseColoredShader extends DiffuseShader {
    fillCode() {
        this.vertexShaderCode = "uniform mat4 view_proj_matrix;\n" +
            "attribute vec4 rm_Vertex;\n" +
            "attribute vec2 rm_TexCoord0;\n" +
            "varying vec2 vTextureCoord;\n" +
            "\n" +
            "void main() {\n" +
            "  gl_Position = view_proj_matrix * rm_Vertex;\n" +
            "  vTextureCoord = rm_TexCoord0;\n" +
            "}";
        this.fragmentShaderCode = "precision highp float;\n" +
            "uniform vec2 uCameraRange;\n" +
            "uniform vec2 uInvViewportSize;\n" +
            "uniform float uTransitionSize;\n" +
            "float calc_depth(in float z)\n" +
            "{\n" +
            "  return (2.0 * uCameraRange.x) / (uCameraRange.y + uCameraRange.x - z*(uCameraRange.y - uCameraRange.x));\n" +
            "}\n" +
            "uniform sampler2D sDepth;\n" +
            "varying vec2 vTextureCoord;\n" +
            "uniform sampler2D sTexture;\n" +
            "uniform vec4 color;\n" +
            "\n" +
            "void main() {\n" +
            "   vec4 diffuse = texture2D(sTexture, vTextureCoord) * color;\n" + // particle base diffuse color
            // "   diffuse += vec4(0.0, 0.0, 1.0, 1.0);\n"+ // uncomment to visualize particle shape
            "   vec2 coords = gl_FragCoord.xy * uInvViewportSize;\n" + // calculate depth texture coordinates
            "   float geometryZ = calc_depth(texture2D(sDepth, coords).r);\n" + // lineriarize particle depth
            "   float sceneZ = calc_depth(gl_FragCoord.z);\n" + // lineriarize scene depth
            "   float a = clamp(geometryZ - sceneZ, 0.0, 1.0);\n" + // linear clamped diff between scene and particle depth
            "   float b = smoothstep(0.0, uTransitionSize, a);\n" + // apply smoothstep to make soft transition
            "   gl_FragColor = diffuse * b;\n" + // final color with soft edge
            "   gl_FragColor *= pow(1.0 - gl_FragCoord.z, 0.3);\n" +
            // "   gl_FragColor = vec4(a, a, a, 1.0);\n" + // uncomment to visualize raw Z difference
            // "   gl_FragColor = vec4(b, b, b, 1.0);\n" + // uncomment to visualize blending coefficient
            "}";
    }
    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.rm_TexCoord0 = this.getAttrib("rm_TexCoord0");
        this.sTexture = this.getUniform("sTexture");
        this.cameraRange = this.getUniform("uCameraRange");
        this.sDepth = this.getUniform("sDepth");
        this.invViewportSize = this.getUniform("uInvViewportSize");
        this.transitionSize = this.getUniform("uTransitionSize");
        this.color = this.getUniform("color");
    }
}
//# sourceMappingURL=SoftDiffuseColoredShader.js.map

class DiffuseColoredShader extends DiffuseShader {
    constructor() {
        super(...arguments);
        this._color = [1, 1, 0, 0];
    }
    // Attributes are numbers.
    // rm_Vertex: number | undefined;
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = `precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D sTexture;
            uniform vec4 color;

            void main() {
                gl_FragColor = texture2D(sTexture, vTextureCoord) * color;
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.color = this.getUniform("color");
    }
    setColor(r, g, b, a) {
        this._color = [r, g, b, a];
    }
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined || this.color === undefined) {
            return;
        }
        const gl = renderer.gl;
        gl.uniform4f(this.color, this._color[0], this._color[1], this._color[2], this._color[3]);
        super.drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz);
    }
}
//# sourceMappingURL=DiffuseColoredShader.js.map

class DiffuseColoredShaderAlpha extends DiffuseShader {
    constructor() {
        super(...arguments);
        this._color = [1, 1, 0, 0];
    }
    // Attributes are numbers.
    // rm_Vertex: number | undefined;
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = `precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D sTexture;
            uniform sampler2D sAlphaTexture;
            uniform vec4 color;

            void main() {
                gl_FragColor = texture2D(sTexture, vTextureCoord) * color;
                vec4 alpha = texture2D(sAlphaTexture, vTextureCoord);
                if (alpha.r < 0.5) discard;
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.color = this.getUniform("color");
        this.sAlphaTexture = this.getUniform("sAlphaTexture");
    }
    setColor(r, g, b, a) {
        this._color = [r, g, b, a];
    }
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined || this.color === undefined) {
            return;
        }
        const gl = renderer.gl;
        gl.uniform4f(this.color, this._color[0], this._color[1], this._color[2], this._color[3]);
        super.drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz);
    }
}
//# sourceMappingURL=DiffuseColoredShaderAlpha.js.map

class DiffuseAnimatedShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = "uniform highp mat4 uMVPMatrix;\n" +
            "attribute highp vec4 aPosition1;\n" +
            "attribute highp vec4 aPosition2;\n" +
            "uniform float m;\n" +
            "attribute highp vec2 aTextureCoord;\n" +
            "varying mediump vec2 vTextureCoord;\n" +
            "void main() {\n" +
            "  gl_Position = uMVPMatrix * mix(aPosition1, aPosition2, m);\n" +
            "  vTextureCoord = aTextureCoord;\n" +
            "}\n";
        this.fragmentShaderCode = "precision mediump float;\n" +
            "varying mediump vec2 vTextureCoord;\n" +
            "uniform sampler2D sTexture;\n" +
            "void main() {\n" +
            "  vec4 base = texture2D(sTexture, vTextureCoord);\n" +
            "  gl_FragColor = base;\n" +
            "}\n";
    }
    fillUniformsAttributes() {
        this.maPosition1Handle = this.getAttrib("aPosition1");
        this.maPosition2Handle = this.getAttrib("aPosition2");
        this.maTextureHandle = this.getAttrib("aTextureCoord");
        this.muMVPMatrixHandle = this.getUniform("uMVPMatrix");
        this.msTextureHandle = this.getUniform("sTexture");
        this.mMHandle = this.getUniform("m");
    }
    clamp(i, low, high) {
        return Math.max(Math.min(i, high), low);
    }
    drawModel(renderer, model, frames, frame1, frame2, m, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.muMVPMatrixHandle === undefined || this.msTextureHandle === undefined || this.mMHandle === undefined || this.maPosition1Handle === undefined || this.maPosition2Handle === undefined || this.maTextureHandle === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        const stride = (2 + frames * 3) * 4;
        const offsetUV = (frames * 3) * 4;
        gl.enableVertexAttribArray(this.maPosition1Handle);
        gl.enableVertexAttribArray(this.maPosition2Handle);
        gl.enableVertexAttribArray(this.maTextureHandle);
        gl.vertexAttribPointer(this.maPosition1Handle, 3, gl.FLOAT, false, stride, 3 * (frame1) * 4);
        gl.vertexAttribPointer(this.maPosition2Handle, 3, gl.FLOAT, false, stride, 3 * (frame2) * 4);
        gl.vertexAttribPointer(this.maTextureHandle, 2, gl.FLOAT, false, stride, offsetUV);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.muMVPMatrixHandle, false, renderer.getMVPMatrix());
        gl.uniform1f(this.mMHandle, this.clamp(m, 0.0, 1.0));
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("glDrawElements");
    }
}
//# sourceMappingURL=DiffuseAnimatedShader.js.map

class DiffuseATColoredAnimatedShader extends DiffuseAnimatedShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = "precision mediump float;\n" +
            "varying mediump vec2 vTextureCoord;\n" +
            "uniform sampler2D sTexture;\n" +
            "uniform vec4 color;\n" +
            "void main() {\n" +
            "  vec4 base = texture2D(sTexture, vTextureCoord);\n" +
            "  if (base.a < 0.95) {\n" +
            "    discard;\n" +
            "  } else {\n" +
            "    gl_FragColor = base * color;\n" +
            "  }\n" +
            "}\n";
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.color = this.getUniform("color");
    }
}
//# sourceMappingURL=DiffuseATColoredAnimatedShader.js.map

var CameraMode;
(function (CameraMode) {
    CameraMode[CameraMode["Rotating"] = 0] = "Rotating";
    CameraMode[CameraMode["Random"] = 1] = "Random";
})(CameraMode || (CameraMode = {}));
//# sourceMappingURL=CameraMode.js.map

/**
 * Renders geometries with dummy green color.
 */
class DepthRenderShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = "uniform mat4 view_proj_matrix;\n" +
            "attribute vec4 rm_Vertex;\n" +
            "\n" +
            "void main() {\n" +
            "  gl_Position = view_proj_matrix * rm_Vertex;\n" +
            "}";
        this.fragmentShaderCode = "precision mediump float;\n" +
            "void main() {\n" +
            "  gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);\n" +
            "}";
    }
    fillUniformsAttributes() {
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
    }
}
//# sourceMappingURL=DepthRenderShader.js.map

class DunesShadowShader extends DunesShader {
    static getInstance(gl, lightmapIndex) {
        DunesShadowShader.lightmapIndexShadow = lightmapIndex;
        return new DunesShadowShader(gl);
    }
    fillCode() {
        this.vertexShaderCode = "uniform mat4 view_proj_matrix;\n" +
            "attribute vec4 rm_Vertex;\n" +
            "attribute vec2 rm_TexCoord0;\n" +
            "attribute vec3 rm_Normal;\n" +
            "varying vec2 vTextureCoord;\n" +
            "varying vec2 vUpwindTexCoord;\n" +
            "varying vec2 vLeewardTexCoord2;\n" +
            "varying vec2 vWindSpotsTexCoord;\n" +
            "varying vec3 vNormal;\n" +
            "varying float vSlopeCoeff;\n" + // Windward slope coefficient
            "varying float vSlopeCoeff2;\n" + // Leeward slope coefficient
            "varying vec2 vDetailCoord1;\n" +
            "varying float vFogAmount;\n" +
            "varying float vDetailFade;\n" +
            "\n" +
            "uniform float fogDistance;\n" +
            "uniform float fogStartDistance;\n" +
            "uniform float detailDistance;\n" +
            "uniform float detailStartDistance;\n" +
            "uniform float uTime;\n" +
            "\n" +
            "varying vec2 vTextureCoordShadow;\n" +
            "uniform vec2 shadowDimensions;\n" + // x - half-size; y - size
            "uniform mat4 model_matrix;\n" +
            "\n" +
            "void main() {\n" +
            "  gl_Position = view_proj_matrix * rm_Vertex;\n" +
            "  vTextureCoord = rm_TexCoord0;\n" +
            "  vNormal = rm_Normal;\n" +
            "  vSlopeCoeff = clamp( 4.0*dot(vNormal, normalize(vec3(1.0, 0.0, 0.13))), 0.0, 1.0);\n" +
            "  vSlopeCoeff2 = clamp( 14.0*dot(vNormal, normalize(vec3(-1.0, 0.0, -0.2))), 0.0, 1.0);\n" +
            "  vUpwindTexCoord = vTextureCoord * vec2(100.0, 10.0);\n" +
            "  vUpwindTexCoord.y += uTime;\n" +
            "  vDetailCoord1 = rm_TexCoord0 * vec2(100.0, 100.0);\n" +
            "  vLeewardTexCoord2 = vTextureCoord * vec2(20.0, 30.0);\n" +
            "  vLeewardTexCoord2.y += uTime;\n" +
            "  vWindSpotsTexCoord = vTextureCoord * vec2(1.5, 1.5);\n" +
            "  vWindSpotsTexCoord.x += uTime * 0.1;\n" +
            "  vFogAmount = clamp((length(gl_Position) - fogStartDistance) / fogDistance, 0.0, 1.0);\n" +
            "  vDetailFade = 1.0 - clamp((length(gl_Position) - detailStartDistance) / detailDistance, 0.0, 1.0);\n" +
            "  vec4 pos = model_matrix * rm_Vertex;\n" +
            // "  vTextureCoordShadow = (pos.xy + shadowDimensions.x) / shadowDimensions.y;\n" +
            "  vTextureCoordShadow = pos.xy;\n" +
            "  vTextureCoordShadow *= shadowDimensions.y;\n" +
            "  vTextureCoordShadow.x += uTime / 20.;\n" +
            "}";
        this.fragmentShaderCode = "precision mediump float;\n" +
            "varying vec2 vTextureCoord;\n" +
            "varying vec3 vNormal;\n" +
            "varying float vSlopeCoeff;\n" +
            "varying float vSlopeCoeff2;\n" +
            "varying vec2 vUpwindTexCoord;\n" +
            "varying vec2 vLeewardTexCoord2;\n" +
            "varying vec2 vWindSpotsTexCoord;\n" +
            "varying vec2 vDetailCoord1;\n" +
            "varying float vFogAmount;\n" +
            "varying float vDetailFade;\n" +
            "uniform sampler2D sTexture;\n" +
            "uniform sampler2D sDust;\n" +
            "uniform sampler2D sDetail1;\n" +
            "uniform sampler2D sShadow;\n" +
            "uniform float uDustOpacity;\n" +
            "uniform vec4 uColor;\n" +
            "uniform vec4 uFogColor;\n" +
            "uniform vec4 uShadowColor;\n" +
            "uniform vec4 uWavesColor;\n" +
            "varying vec2 vTextureCoordShadow;\n" +
            "void main() {\n" +
            "  vec4 windward = texture2D(sDust, vUpwindTexCoord);\n" +
            "  vec4 leeward2 = texture2D(sDust, vLeewardTexCoord2);\n" +
            "  vec4 detailColor = texture2D(sDetail1, vDetailCoord1);" +
            "  float detail1 = detailColor.g - 0.5;\n" +
            "  float detail2 = detailColor.r - 0.5;\n" +
            "  detail1 *= vDetailFade;\n" +
            "  detail2 *= vDetailFade;\n" +
            "  vec4 shadow = texture2D(sShadow, vTextureCoordShadow);\n" +
            "  vec4 textureData = texture2D(sTexture, vTextureCoord);\n" +
            "  gl_FragColor = textureData.r * uColor;\n" +
            "  vec4 waves = windward * uDustOpacity * vSlopeCoeff;\n" +
            "  waves += leeward2 * uDustOpacity * vSlopeCoeff2;\n" +
            "  waves *= 1.0 - clamp(texture2D(sDust, vWindSpotsTexCoord).r * 5.0, 0.0, 1.0);\n" +
            "  gl_FragColor += waves * uWavesColor;\n" +
            "  gl_FragColor *= shadow;\n" +
            "  gl_FragColor.rgb += mix(detail2, detail1, vSlopeCoeff2);\n" +
            "  gl_FragColor *= mix(uShadowColor, vec4(1.0, 1.0, 1.0, 1.0), textureData[" + DunesShadowShader.lightmapIndexShadow + "]);" +
            "  gl_FragColor = mix(gl_FragColor, uFogColor, vFogAmount);\n" +
            "}";
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.sShadow = this.getUniform("sShadow");
        this.shadowDimensions = this.getUniform("shadowDimensions");
        this.model_matrix = this.getUniform("model_matrix");
    }
}
DunesShadowShader.lightmapIndexShadow = 0;

const FOV_LANDSCAPE = 70.0; // FOV for landscape
const FOV_PORTRAIT = 80.0; // FOV for portrait
const YAW_COEFF_NORMAL = 200.0; // camera rotation time
const DUST_TIMER = 3000.0; // sand movement speed
const TERRAIN_SCALE = 100;
class DunesRenderer extends BaseRenderer {
    constructor() {
        super();
        this.lastTime = 0;
        this.angleYaw = 0;
        this.dustTimer = 0;
        this.loaded = false;
        this.fmSky = new FullModel();
        this.fmPalms = new FullModel();
        this.fmDunes = new FullModel();
        this.fmSmoke = new FullModel();
        this.fmSun = new FullModel();
        this.fmBird = new FullModel();
        this.shaderDunesPermutations = [];
        this.shaderDunesShadowPermutations = [];
        this.Z_NEAR = 20.0;
        this.Z_FAR = 40000.0;
        this.SMOKE_SOFTNESS = 0.012;
        this.timerDustRotation = 0;
        this.DUST_ROTATION_SPEED = 903333;
        this.timerDustMovement = 0;
        this.DUST_MOVEMENT_SPEED = 2500;
        this.timerBirdAnimation1 = 0;
        this.timerBirdAnimation2 = 0;
        this.BIRD_ANIMATION_PERIOD1 = 2000;
        this.BIRD_ANIMATION_PERIOD2 = 800;
        this.timerBirdsFly = 0;
        this.BIRD_FLIGHT_PERIOD = 50000;
        this.timerRandomCamera = 0;
        this.RANDOM_CAMERA_PERIOD = 6000;
        this.timerCameraWobble = 0;
        this.CAMERA_WOBBLE_PERIOD = 40000;
        this.BIRD_FLIGHT_RADIUS = 2000;
        this.DUST_TRAVEL_X = -500;
        this.DUST_TRAVEL_Z = -200;
        this.DUST_MAX_SCALE = 7.0;
        this.PRESETS = [
            {
                SKY: "night_1",
                SAND_COLOR: {
                    r: 85 / 255 * 0.45,
                    g: 130 / 255 * 0.45,
                    b: 150 / 255 * 0.45
                },
                SHADOW_COLOR: {
                    r: -212 / 255 * 0.5,
                    g: -200 / 255 * 0.5,
                    b: -138 / 255 * 0.5
                },
                FOG_COLOR: {
                    r: 6 / 255 * 1.0,
                    g: 8 / 255 * 1.0,
                    b: 13 / 255 * 1.0
                },
                DECO_COLOR: {
                    r: 100 / 255 * 0.18,
                    g: 110 / 255 * 0.18,
                    b: 170 / 255 * 0.18
                },
                SUN_TRANSFORM: {
                    tx: 0,
                    ty: -22000,
                    tz: 8500,
                    sx: 0.0,
                    sy: 1,
                    sz: 1
                },
                DUNES_SHADER: 1,
                DUST_COLOR: {
                    r: 55 / 255 * 0.25,
                    g: 62 / 255 * 0.25,
                    b: 81 / 255 * 0.25
                },
                WAVES_COLOR: {
                    r: 143 / 255 * 1.0,
                    g: 152 / 255 * 1.0,
                    b: 182 / 255 * 1.0
                },
                FOG_START_DISTANCE: 200,
                FOG_DISTANCE: 12000
            },
            {
                SKY: "day_1",
                SAND_COLOR: {
                    r: 246 / 255,
                    g: 158 / 255,
                    b: 59 / 255
                },
                SHADOW_COLOR: {
                    r: 87 / 255,
                    g: 56 / 255,
                    b: 33 / 255
                },
                FOG_COLOR: {
                    r: 147 / 255,
                    g: 178 / 255,
                    b: 205 / 255
                },
                DECO_COLOR: {
                    r: 150 / 255 * 1.0,
                    g: 150 / 255 * 1.0,
                    b: 90 / 255 * 1.0
                },
                SUN_TRANSFORM: {
                    tx: 0,
                    ty: -22000,
                    tz: 8500,
                    sx: 300.0,
                    sy: 1,
                    sz: 1
                },
                DUNES_SHADER: 1,
                DUST_COLOR: {
                    r: 235 / 255 * 0.20,
                    g: 162 / 255 * 0.20,
                    b: 48 / 255 * 0.20
                },
                WAVES_COLOR: {
                    r: 255 / 255 * 0.99,
                    g: 226 / 255 * 0.99,
                    b: 171 / 255 * 0.99
                },
                FOG_START_DISTANCE: 1000,
                FOG_DISTANCE: 45000
            },
            {
                SKY: "sunset_1",
                SAND_COLOR: {
                    r: 255 / 255,
                    g: 131 / 255,
                    b: 44 / 255
                },
                SHADOW_COLOR: {
                    r: 64 / 255,
                    g: 52 / 255,
                    b: 100 / 255
                },
                FOG_COLOR: {
                    r: 109 / 255,
                    g: 113 / 255,
                    b: 137 / 255
                },
                DECO_COLOR: {
                    r: 200 / 255 * 0.7,
                    g: 150 / 255 * 0.7,
                    b: 90 / 255 * 0.7
                },
                SUN_TRANSFORM: {
                    tx: 0,
                    ty: 22000,
                    tz: 100,
                    sx: 200.0,
                    sy: 1,
                    sz: 1
                },
                DUNES_SHADER: 0,
                DUST_COLOR: {
                    r: 235 / 255 * 0.20,
                    g: 162 / 255 * 0.20,
                    b: 48 / 255 * 0.20
                },
                WAVES_COLOR: {
                    r: 255 / 255 * 0.99,
                    g: 226 / 255 * 0.99,
                    b: 171 / 255 * 0.99
                },
                FOG_START_DISTANCE: 1000,
                FOG_DISTANCE: 45000
            },
            {
                SKY: "sunrise_1",
                SAND_COLOR: {
                    r: 255 / 255,
                    g: 142 / 255,
                    b: 50 / 255
                },
                SHADOW_COLOR: {
                    r: 64 / 255,
                    g: 62 / 255,
                    b: 110 / 255
                },
                FOG_COLOR: {
                    r: 109 / 255,
                    g: 113 / 255,
                    b: 137 / 255
                },
                DECO_COLOR: {
                    r: 200 / 255 * 0.7,
                    g: 150 / 255 * 0.7,
                    b: 90 / 255 * 0.7
                },
                SUN_TRANSFORM: {
                    tx: 0,
                    ty: 22000,
                    tz: 100,
                    sx: 200.0,
                    sy: 1,
                    sz: 1
                },
                DUNES_SHADER: 0,
                DUST_COLOR: {
                    r: 235 / 255 * 0.20,
                    g: 162 / 255 * 0.20,
                    b: 48 / 255 * 0.20
                },
                WAVES_COLOR: {
                    r: 255 / 255 * 0.99,
                    g: 226 / 255 * 0.99,
                    b: 171 / 255 * 0.99
                },
                FOG_START_DISTANCE: 1000,
                FOG_DISTANCE: 45000
            }
        ];
        this.currentPreset = 1;
        this.PRESET = this.PRESETS[this.currentPreset];
        this.SUN_COLOR_FADE = 0.6;
        this.SUN_COLOR = {
            r: 255 * this.SUN_COLOR_FADE / 255,
            g: 229 * this.SUN_COLOR_FADE / 255,
            b: 159 * this.SUN_COLOR_FADE / 255
        };
        this.animationBird = new CombinedAnimation(5);
        this.cameraMode = CameraMode.Random;
        this.RANDOM_POSITIONS = [
            new Float32Array([-1165.3851318359375, 852.6128540039062, -465.50091552734375]),
            new Float32Array([-1004.7344970703125, -1210.149169921875, -496.7281799316406]),
            new Float32Array([-48.33189010620117, -1273.2711181640625, -544.5003662109375]),
            new Float32Array([705.2008056640625, -1375.755859375, -502.4747619628906]),
            new Float32Array([1627.428955078125, 550.0985107421875, -581.421630859375]),
            new Float32Array([-3481.816162109375, 1101.4439697265625, -487.1667175292969]),
            new Float32Array([-211.86111450195312, 87.45712280273438, -675.6991577148438]),
            new Float32Array([460.9388732910156, 630.7889404296875, -590.1151123046875]),
            new Float32Array([-1.3694673776626587, 3444.936767578125, -630.326416015625]),
            new Float32Array([1557.577392578125, 1292.7252197265625, -613.589111328125]),
            new Float32Array([-651.7662353515625, 166.9021759033203, -295.8658447265625]),
            new Float32Array([129.63272094726562, 1876.664306640625, -402.3246765136719])
        ];
        this.currentRandomCamera = 0;
        this.currentRandomLookat = new Float32Array(3);
        this.currentRandomFov = 0;
        this.tempVec3 = new Float32Array(3);
        this.randomizeCamera();
    }
    get shaderDunes() { return this.shaderDunesPermutations[this.PRESET.DUNES_SHADER]; }
    ;
    get shaderDunesShadow() { return this.shaderDunesShadowPermutations[this.PRESET.DUNES_SHADER]; }
    ;
    setCustomCamera(camera) {
        this.customCamera = camera;
    }
    resetCustomCamera() {
        this.customCamera = undefined;
    }
    onBeforeInit() {
    }
    onAfterInit() {
    }
    onInitError() {
        var _a, _b;
        (_a = document.getElementById("canvasGL")) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
        (_b = document.getElementById("alertError")) === null || _b === void 0 ? void 0 : _b.classList.remove("hidden");
    }
    initShaders() {
        this.shaderDiffuse = new DiffuseShader(this.gl);
        this.shaderSoftDiffuseColored = new SoftDiffuseColoredShader(this.gl);
        this.sunShader = new DiffuseColoredShader(this.gl);
        this.palmShader = new DiffuseColoredShaderAlpha(this.gl);
        this.shaderAnimated = new DiffuseATColoredAnimatedShader(this.gl);
        this.shaderDepthRender = new DepthRenderShader(this.gl);
        this.shaderDunesPermutations.push(DunesShader.getInstance(this.gl, 1));
        this.shaderDunesPermutations.push(DunesShader.getInstance(this.gl, 2));
        this.shaderDunesShadowPermutations.push(DunesShadowShader.getInstance(this.gl, 1));
        this.shaderDunesShadowPermutations.push(DunesShadowShader.getInstance(this.gl, 2));
    }
    async loadData() {
        var _a, _b;
        await Promise.all([
            this.fmSky.load("data/models/sky", this.gl),
            this.fmPalms.load("data/models/palms", this.gl),
            this.fmDunes.load("data/models/dunes", this.gl),
            this.fmSmoke.load("data/models/smoke100", this.gl),
            this.fmSun.load("data/models/sun_flare", this.gl),
            this.fmBird.load("data/models/bird-anim-uv", this.gl),
        ]);
        const textures = await Promise.all([
            await UncompressedTextureLoader.load("data/textures/" + this.PRESET.SKY + ".jpg", this.gl, undefined, undefined, true),
            await UncompressedTextureLoader.load("data/textures/dunes-diffuse.jpg", this.gl),
            await UncompressedTextureLoader.load("data/textures/upwind.png", this.gl),
            await UncompressedTextureLoader.load("data/textures/detail.png", this.gl),
            await UncompressedTextureLoader.load("data/textures/smoke.png", this.gl),
            await UncompressedTextureLoader.load("data/textures/sun_flare.png", this.gl),
            await UncompressedTextureLoader.load("data/textures/bird2.png", this.gl),
            await UncompressedTextureLoader.load("data/textures/clouds.png", this.gl)
        ]);
        this.skyTexture = textures[0];
        this.dunesDiffuseTexture = textures[1];
        this.dunesDustTexture = textures[2];
        this.dunesDetailTexture = textures[3];
        this.textureDustCloud = textures[4];
        this.textureSunFlare = textures[5];
        this.textureBird = textures[6];
        this.textureClouds = textures[7];
        this.palmTextureAlpha = await UncompressedTextureLoader.load("data/textures/palm-alpha.png", this.gl, undefined, undefined, true);
        this.palmTextureDiffuse = await UncompressedTextureLoader.load("data/textures/palm-diffuse.png", this.gl, undefined, undefined, true);
        this.initOffscreen();
        this.initVignette();
        this.loaded = true;
        console.log("Loaded all assets");
        (_a = document.getElementById("message")) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
        (_b = document.getElementById("canvasGL")) === null || _b === void 0 ? void 0 : _b.classList.remove("transparent");
        setTimeout(() => { var _a; return (_a = document.querySelector(".promo")) === null || _a === void 0 ? void 0 : _a.classList.remove("transparent"); }, 1800);
        setTimeout(() => { var _a; return (_a = document.querySelector("#toggleFullscreen")) === null || _a === void 0 ? void 0 : _a.classList.remove("transparent"); }, 1800);
    }
    async changeTimeOfDay() {
        const newPreset = ++this.currentPreset % 4;
        const texture = await UncompressedTextureLoader.load("data/textures/" + this.PRESETS[newPreset].SKY + ".jpg", this.gl, undefined, undefined, true);
        this.gl.deleteTexture(this.skyTexture);
        this.skyTexture = texture;
        this.PRESET = this.PRESETS[newPreset];
        this.currentPreset = newPreset;
    }
    animate() {
        const timeNow = new Date().getTime();
        if (this.lastTime != 0) {
            const elapsed = timeNow - this.lastTime;
            this.angleYaw += elapsed / YAW_COEFF_NORMAL;
            this.angleYaw %= 360.0;
            this.dustTimer += elapsed / DUST_TIMER;
            this.dustTimer %= 100.0;
            this.timerDustRotation = (timeNow % this.DUST_ROTATION_SPEED) / this.DUST_ROTATION_SPEED;
            this.timerDustMovement = (timeNow % this.DUST_MOVEMENT_SPEED) / this.DUST_MOVEMENT_SPEED;
            this.timerBirdAnimation1 = (timeNow % this.BIRD_ANIMATION_PERIOD1) / this.BIRD_ANIMATION_PERIOD1;
            this.timerBirdAnimation2 = (timeNow % this.BIRD_ANIMATION_PERIOD2) / this.BIRD_ANIMATION_PERIOD2;
            this.timerBirdsFly = (timeNow % this.BIRD_FLIGHT_PERIOD) / this.BIRD_FLIGHT_PERIOD;
            this.timerCameraWobble = (timeNow % this.CAMERA_WOBBLE_PERIOD) / this.CAMERA_WOBBLE_PERIOD;
            const previousTimerRandomCamera = this.timerRandomCamera;
            this.timerRandomCamera = (timeNow % this.RANDOM_CAMERA_PERIOD) / this.RANDOM_CAMERA_PERIOD;
            if (this.cameraMode === CameraMode.Random && this.timerRandomCamera < previousTimerRandomCamera) {
                this.randomizeCamera();
            }
        }
        this.lastTime = timeNow;
    }
    /** Calculates projection matrix */
    setCameraFOV(multiplier) {
        var ratio;
        if (this.gl.canvas.height > 0) {
            ratio = this.gl.canvas.width / this.gl.canvas.height;
        }
        else {
            ratio = 1.0;
        }
        let fov = 0;
        if (this.gl.canvas.width >= this.gl.canvas.height) {
            fov = FOV_LANDSCAPE * multiplier;
        }
        else {
            fov = FOV_PORTRAIT * multiplier;
        }
        if (this.cameraMode === CameraMode.Random && this.customCamera === undefined) {
            fov -= this.timerRandomCamera * this.currentRandomFov;
        }
        this.setFOV(this.mProjMatrix, fov, ratio, this.Z_NEAR, this.Z_FAR);
    }
    /**
     * Calculates camera matrix.
     *
     * @param a Position in [0...1] range
     */
    positionCamera(a) {
        if (this.customCamera !== undefined) {
            this.mVMatrix = this.customCamera;
            return;
        }
        if (this.cameraMode === CameraMode.Random) {
            this.tempVec3[0] = this.currentRandomLookat[0] + Math.sin(this.timerCameraWobble * 2 * Math.PI * 2) * 0.2;
            this.tempVec3[1] = this.currentRandomLookat[1];
            this.tempVec3[2] = this.currentRandomLookat[2] + Math.cos(this.timerCameraWobble * 3 * Math.PI * 2) * 0.05;
            lookAt(this.mVMatrix, this.RANDOM_POSITIONS[this.currentRandomCamera], this.tempVec3, [0, 0, 1]);
        }
        else {
            const cameraDistanceRate = 0.02;
            const cameraDistanceFactor = Math.sin(this.angleYaw * cameraDistanceRate) * 0.5 + 0.5;
            lookAt(this.mVMatrix, [0, 0, -400], // eye
            [1000, 0, -600], // center
            [0, 0.1, 1] // up vector
            );
            rotate(this.mVMatrix, this.mVMatrix, (this.angleYaw + 280) / 160.0 * 6.2831852, [0, 0, 1]);
        }
    }
    /** Issues actual draw calls */
    drawScene() {
        if (!this.loaded) {
            return;
        }
        this.positionCamera(0.0);
        this.setCameraFOV(1.0);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.colorMask(false, false, false, false);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreen.framebufferHandle);
        this.gl.viewport(0, 0, this.fboOffscreen.width, this.fboOffscreen.height);
        this.gl.depthMask(true);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.drawDepthObjects();
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.colorMask(true, true, true, true);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null); // This differs from OpenGL ES
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.drawSceneObjects();
        // this.drawTestDepth();
    }
    drawTestDepth() {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);
        this.shaderDiffuse.use();
        this.setTexture2D(0, this.textureOffscreenDepth, this.shaderDiffuse.sTexture);
        this.drawVignette(this.shaderDiffuse);
    }
    drawVignette(shader) {
        this.unbindBuffers();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.enableVertexAttribArray(shader.rm_Vertex);
        this.gl.vertexAttribPointer(shader.rm_Vertex, 3, this.gl.FLOAT, false, 20, 0);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0, 2, this.gl.FLOAT, false, 20, 4 * 3);
        this.gl.uniformMatrix4fv(shader.view_proj_matrix, false, this.getOrthoMatrix());
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
    drawDepthObjects() {
        if (this.shaderDunes === undefined || this.shaderDiffuse === undefined) {
            console.log("undefined shaders");
            return;
        }
        this.drawDunesDepth(this.fmDunes, 0, 0, 0, 0, 0, 0, TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
    }
    drawSceneObjects() {
        if (this.shaderDunes === undefined || this.shaderDiffuse === undefined) {
            console.log("undefined shaders");
            return;
        }
        this.gl.disable(this.gl.BLEND);
        const shader = this.shaderDunesShadow;
        shader.use();
        this.setTexture2D(0, this.dunesDiffuseTexture, shader.sTexture);
        this.setTexture2D(1, this.dunesDustTexture, shader.sDust);
        this.setTexture2D(2, this.dunesDetailTexture, shader.sDetail1);
        if (shader instanceof DunesShadowShader) {
            this.gl.uniform2f(shader.shadowDimensions, 2000, 0.0001);
            this.setTexture2D(3, this.textureClouds, shader.sShadow);
        }
        this.gl.uniform1f(shader.uDustOpacity, 0.075);
        this.gl.uniform1f(shader.uTime, this.dustTimer);
        this.gl.uniform4f(shader.uColor, this.PRESET.SAND_COLOR.r, this.PRESET.SAND_COLOR.g, this.PRESET.SAND_COLOR.b, 1.0);
        this.gl.uniform4f(shader.uFogColor, this.PRESET.FOG_COLOR.r, this.PRESET.FOG_COLOR.g, this.PRESET.FOG_COLOR.b, 1.0);
        this.gl.uniform4f(shader.uShadowColor, this.PRESET.SHADOW_COLOR.r, this.PRESET.SHADOW_COLOR.g, this.PRESET.SHADOW_COLOR.b, 1.0);
        this.gl.uniform4f(shader.uWavesColor, this.PRESET.WAVES_COLOR.r, this.PRESET.WAVES_COLOR.g, this.PRESET.WAVES_COLOR.b, 1.0);
        this.gl.uniform1f(shader.fogStartDistance, this.PRESET.FOG_START_DISTANCE);
        this.gl.uniform1f(shader.fogDistance, this.PRESET.FOG_DISTANCE);
        this.gl.uniform1f(shader.detailStartDistance, 400);
        this.gl.uniform1f(shader.detailDistance, 1200);
        this.drawDunes(shader, this.fmDunes, 0, 0, 0, 0, 0, 0, TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        // -45.15 * 2 = 90.3
        const SKIRT_SCALE = 1.5;
        const SKIRT_OFFSET = 9030 / 2 + (9030 / 2 * SKIRT_SCALE);
        this.gl.cullFace(this.gl.FRONT);
        this.drawDunes(shader, this.fmDunes, SKIRT_OFFSET, 0, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        this.drawDunes(shader, this.fmDunes, -SKIRT_OFFSET, 0, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        this.drawDunes(shader, this.fmDunes, 0, SKIRT_OFFSET, 0, 0, 0, 0, TERRAIN_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(shader, this.fmDunes, 0, -SKIRT_OFFSET, 0, 0, 0, 0, TERRAIN_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.gl.cullFace(this.gl.BACK);
        this.drawDunes(shader, this.fmDunes, SKIRT_OFFSET, SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(shader, this.fmDunes, -SKIRT_OFFSET, -SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(shader, this.fmDunes, SKIRT_OFFSET, -SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(shader, this.fmDunes, -SKIRT_OFFSET, SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawBirds();
        this.drawPalmTrees();
        this.shaderDiffuse.use();
        this.setTexture2D(0, this.skyTexture, this.shaderDiffuse.sTexture);
        this.shaderDiffuse.drawModel(this, this.fmSky, 0, 0, -1200, 0, 0, 0, 150, 150, 150);
        this.drawSoftSpriteParticles();
        this.drawSun();
    }
    drawPalmTrees() {
        var _a, _b, _c, _d, _e;
        this.gl.disable(this.gl.CULL_FACE);
        (_a = this.palmShader) === null || _a === void 0 ? void 0 : _a.use();
        this.setTexture2D(0, this.palmTextureDiffuse, (_b = this.palmShader) === null || _b === void 0 ? void 0 : _b.sTexture);
        this.setTexture2D(1, this.palmTextureAlpha, (_c = this.palmShader) === null || _c === void 0 ? void 0 : _c.sAlphaTexture);
        (_d = this.palmShader) === null || _d === void 0 ? void 0 : _d.setColor(this.PRESET.DECO_COLOR.r, this.PRESET.DECO_COLOR.g, this.PRESET.DECO_COLOR.b, 1.0);
        (_e = this.palmShader) === null || _e === void 0 ? void 0 : _e.drawModel(this, this.fmPalms, 0, 0, 0, 0, 0, 0, TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        this.gl.enable(this.gl.CULL_FACE);
    }
    drawBirds() {
        var _a, _b, _c;
        this.gl.disable(this.gl.CULL_FACE);
        (_a = this.shaderAnimated) === null || _a === void 0 ? void 0 : _a.use();
        this.setTexture2D(0, this.textureBird, this.shaderAnimated.msTextureHandle);
        this.gl.uniform4f(this.shaderAnimated.color, this.PRESET.DECO_COLOR.r, this.PRESET.DECO_COLOR.g, this.PRESET.DECO_COLOR.b, 1.0);
        const angle = this.timerBirdsFly * Math.PI * 2;
        const bird1 = this.getBirdPosition(angle, 1300, 0);
        const bird2 = this.getBirdPosition(-angle - Math.PI, -1300, 0);
        this.animationBird.animate(this.timerBirdAnimation1);
        (_b = this.shaderAnimated) === null || _b === void 0 ? void 0 : _b.drawModel(this, this.fmBird, this.animationBird.getFramesCount(), this.animationBird.getStart(), this.animationBird.getEnd(), this.animationBird.getCurrentCoeff(), bird1.x, bird1.y, 0, 0, 0, -angle - Math.PI * 0.5, 6, 6, 6);
        this.animationBird.animate(this.timerBirdAnimation2);
        (_c = this.shaderAnimated) === null || _c === void 0 ? void 0 : _c.drawModel(this, this.fmBird, this.animationBird.getFramesCount(), this.animationBird.getStart(), this.animationBird.getEnd(), this.animationBird.getCurrentCoeff(), bird2.x, bird2.y, 0, 0, 0, angle + Math.PI * 1.5, 5, 5, 5);
        this.gl.enable(this.gl.CULL_FACE);
    }
    getBirdPosition(angle, centerX, centerY) {
        const x = Math.sin(angle) * this.BIRD_FLIGHT_RADIUS + centerX;
        const y = Math.cos(angle) * this.BIRD_FLIGHT_RADIUS + centerY;
        return { x, y };
    }
    drawDunes(shader, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (shader === undefined || shader.rm_Vertex === undefined || shader.rm_TexCoord0 === undefined || shader.view_proj_matrix === undefined || shader.rm_Normal === undefined) {
            return;
        }
        const gl = this.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(shader.rm_Vertex);
        gl.enableVertexAttribArray(shader.rm_TexCoord0);
        gl.enableVertexAttribArray(shader.rm_Normal);
        gl.vertexAttribPointer(shader.rm_Vertex, 3, gl.FLOAT, false, 32, 0);
        gl.vertexAttribPointer(shader.rm_TexCoord0, 2, gl.FLOAT, false, 32, 12);
        gl.vertexAttribPointer(shader.rm_Normal, 3, gl.FLOAT, false, 32, 20);
        this.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(shader.view_proj_matrix, false, this.getMVPMatrix());
        if (shader instanceof DunesShadowShader) {
            gl.uniformMatrix4fv(shader.model_matrix, false, this.getModelMatrix());
        }
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        this.checkGlError("DiffuseShader glDrawElements");
    }
    drawDunesDepth(model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.shaderDepthRender === undefined || this.shaderDepthRender.rm_Vertex === undefined || this.shaderDepthRender.view_proj_matrix === undefined) {
            return;
        }
        this.shaderDepthRender.use();
        const gl = this.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.shaderDepthRender.rm_Vertex);
        gl.vertexAttribPointer(this.shaderDepthRender.rm_Vertex, 3, gl.FLOAT, false, 32, 0);
        this.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.shaderDepthRender.view_proj_matrix, false, this.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        this.checkGlError("DiffuseShader glDrawElements");
    }
    drawDiffuseVBOFacingCamera(shader, model, tx, ty, tz, sx, sy, sz, rotation) {
        model.bindBuffers(this.gl);
        this.gl.enableVertexAttribArray(shader.rm_Vertex);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0);
        this.gl.vertexAttribPointer(shader.rm_Vertex, 3, this.gl.FLOAT, false, 4 * (3 + 2), 0);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0, 2, this.gl.FLOAT, false, 4 * (3 + 2), 4 * 3);
        this.calculateMVPMatrixForSprite(tx, ty, tz, sx, sy, sz, rotation);
        this.gl.uniformMatrix4fv(shader.view_proj_matrix, false, this.mMVPMatrix);
        this.gl.drawElements(this.gl.TRIANGLES, model.getNumIndices() * 3, this.gl.UNSIGNED_SHORT, 0);
        this.checkGlError("glDrawElements");
    }
    calculateMVPMatrixForSprite(tx, ty, tz, sx, sy, sz, rotation) {
        identity(this.mMMatrix);
        translate(this.mMMatrix, this.mMMatrix, [tx, ty, tz]);
        scale(this.mMMatrix, this.mMMatrix, [sx, sy, sz]);
        multiply(this.mMVPMatrix, this.mVMatrix, this.mMMatrix);
        this.resetMatrixRotations(this.mMVPMatrix);
        rotateZ$1(this.mMVPMatrix, this.mMVPMatrix, rotation);
        multiply(this.mMVPMatrix, this.mProjMatrix, this.mMVPMatrix);
    }
    resetMatrixRotations(matrix) {
        const d = Math.sqrt(matrix[0] * matrix[0] + matrix[1] * matrix[1] + matrix[2] * matrix[2]);
        matrix[0] = d;
        matrix[4] = 0;
        matrix[8] = 0;
        matrix[1] = 0;
        matrix[5] = d;
        matrix[9] = 0;
        matrix[2] = 0;
        matrix[6] = 0;
        matrix[10] = d;
        matrix[3] = 0;
        matrix[7] = 0;
        matrix[11] = 0;
        matrix[15] = 1;
    }
    drawSun() {
        var _a;
        this.gl.enable(this.gl.BLEND);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.gl.depthMask(false);
        (_a = this.sunShader) === null || _a === void 0 ? void 0 : _a.use();
        this.setTexture2D(0, this.textureSunFlare, this.sunShader.sTexture);
        this.gl.uniform4f(this.sunShader.color, this.SUN_COLOR.r, this.SUN_COLOR.g, this.SUN_COLOR.b, 1.0);
        this.drawDiffuseVBOFacingCamera(this.sunShader, this.fmSun, this.PRESET.SUN_TRANSFORM.tx, this.PRESET.SUN_TRANSFORM.ty, this.PRESET.SUN_TRANSFORM.tz, this.PRESET.SUN_TRANSFORM.sx, this.PRESET.SUN_TRANSFORM.sy, this.PRESET.SUN_TRANSFORM.sz, this.timerDustRotation * Math.PI * 2);
        this.gl.disable(this.gl.BLEND);
        this.gl.depthMask(true);
    }
    clamp(i, low, high) {
        return Math.max(Math.min(i, high), low);
    }
    smoothstep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
    }
    smootherstep(edge0, edge1, x) {
        x = this.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return x * x * x * (x * (x * 6 - 15) + 10);
    }
    drawSoftSpriteParticles() {
        if (this.shaderSoftDiffuseColored === undefined) {
            return;
        }
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.gl.depthMask(false);
        // const cosa = Math.cos(this.timerDustRotation * Math.PI * 2);
        // const sina = Math.sin(this.timerDustRotation * Math.PI * 2);
        this.shaderSoftDiffuseColored.use();
        this.initDepthReadShader(this.shaderSoftDiffuseColored);
        this.setTexture2D(0, this.textureDustCloud, this.shaderSoftDiffuseColored.sTexture);
        for (const dune of particlesCoordinates) {
            for (let i = 0; i < dune.length; i++) {
                const timer = (this.timerDustMovement + i * 13.37) % 1.0;
                const coordinates = dune[i];
                const rotation = i * 35 + this.timerDustRotation * (i % 2 === 0 ? 360 : -360); // TODO check units
                const x = coordinates[0] * TERRAIN_SCALE + timer * this.DUST_TRAVEL_X;
                const y = coordinates[1] * TERRAIN_SCALE;
                const z = coordinates[2] * TERRAIN_SCALE + timer * this.DUST_TRAVEL_Z;
                const scale = timer * this.DUST_MAX_SCALE;
                const opacity = this.smootherstep(0.01, 0.1, timer) * (1 - this.smootherstep(0.7, 0.99, timer));
                this.gl.uniform4f(this.shaderSoftDiffuseColored.color, this.PRESET.DUST_COLOR.r * opacity, this.PRESET.DUST_COLOR.g * opacity, this.PRESET.DUST_COLOR.b * opacity, 1);
                this.drawDiffuseVBOFacingCamera(this.shaderSoftDiffuseColored, this.fmSmoke, x, y, z, scale, 1, 1, rotation);
            }
        }
        this.gl.disable(this.gl.BLEND);
        this.gl.depthMask(true);
    }
    initOffscreen() {
        if (this.canvas === undefined) {
            return;
        }
        this.textureOffscreenColor = TextureUtils.createNpotTexture(this.gl, this.canvas.width, this.canvas.height, false);
        this.checkGlError("color");
        this.textureOffscreenDepth = TextureUtils.createDepthTexture(this.gl, this.canvas.width, this.canvas.height);
        this.checkGlError("depth");
        this.fboOffscreen = new FrameBuffer(this.gl);
        this.fboOffscreen.textureHandle = this.textureOffscreenColor;
        this.fboOffscreen.depthTextureHandle = this.textureOffscreenDepth;
        this.fboOffscreen.width = this.canvas.width;
        this.fboOffscreen.height = this.canvas.height;
        this.fboOffscreen.createGLData(this.canvas.width, this.canvas.height);
        this.checkGlError("offscreen FBO");
        console.log("Initialized offscreen FBO.");
    }
    initVignette() {
        ortho(this.matOrtho, -1, 1, -1, 1, 2.0, 250);
        this.mQuadTriangles = new Float32Array([
            // X, Y, Z, U, V
            -1.0, -1.0, -5.0, 0.0, 0.0,
            1.0, -1.0, -5.0, 1.0, 0.0,
            -1.0, 1.0, -5.0, 0.0, 1.0,
            1.0, 1.0, -5.0, 1.0, 1.0,
        ]);
        this.mTriangleVerticesVignette = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.mQuadTriangles, this.gl.STATIC_DRAW);
    }
    initDepthReadShader(shader) {
        this.gl.uniform2f(shader.cameraRange, this.Z_NEAR, this.Z_FAR); // near and far clipping planes
        this.gl.uniform2f(shader.invViewportSize, 1.0 / this.gl.canvas.width, 1.0 / this.gl.canvas.height); // inverted screen size
        this.gl.uniform1f(shader.transitionSize, this.SMOKE_SOFTNESS);
        this.setTexture2D(2, this.textureOffscreenDepth, shader.sDepth);
    }
    randomizeCamera() {
        this.currentRandomCamera =
            (this.currentRandomCamera + 1 + Math.trunc(Math.random() * (this.RANDOM_POSITIONS.length - 2))) % this.RANDOM_POSITIONS.length;
        this.currentRandomLookat[0] = this.RANDOM_POSITIONS[this.currentRandomCamera][0] + this.minRandom(0.3);
        this.currentRandomLookat[1] = this.RANDOM_POSITIONS[this.currentRandomCamera][1] + this.minRandom(0.3);
        this.currentRandomLookat[2] = this.RANDOM_POSITIONS[this.currentRandomCamera][2] + this.minRandom(0.3) * 0.1;
        this.currentRandomFov = Math.random() * 30;
    }
    minRandom(threshold) {
        let random = (Math.random() - 0.5);
        if (random < 0 && random > -threshold) {
            random -= threshold;
        }
        else if (random > 0 && random < threshold) {
            random += threshold;
        }
        return random;
    }
}

/**
 * A Flying Camera allows free motion around the scene using FPS style controls (WASD + mouselook)
 * This type of camera is good for displaying large scenes
 */
class FpsCamera {
    constructor(options) {
        var _a, _b;
        this._dirty = true;
        this._angles = [0, 0, 0];
        this._position = create$1();
        this.speed = 100;
        this.rotationSpeed = 0.025;
        this._cameraMat = create();
        this._viewMat = create();
        this.projectionMat = create();
        this.pressedKeys = new Array();
        this.canvas = options.canvas;
        this.speed = (_a = options.movementSpeed) !== null && _a !== void 0 ? _a : 100;
        this.rotationSpeed = (_b = options.rotationSpeed) !== null && _b !== void 0 ? _b : 0.025;
        // Set up the appropriate event hooks
        let moving = false;
        let lastX, lastY;
        window.addEventListener("keydown", event => this.pressedKeys[event.keyCode] = true);
        window.addEventListener("keyup", event => this.pressedKeys[event.keyCode] = false);
        this.canvas.addEventListener('contextmenu', event => event.preventDefault());
        this.canvas.addEventListener('mousedown', event => {
            if (event.which === 3) {
                moving = true;
            }
            lastX = event.pageX;
            lastY = event.pageY;
        });
        this.canvas.addEventListener('mousemove', event => {
            if (moving) {
                let xDelta = event.pageX - lastX;
                let yDelta = event.pageY - lastY;
                lastX = event.pageX;
                lastY = event.pageY;
                this.angles[1] += xDelta * this.rotationSpeed;
                while (this.angles[1] < 0) {
                    this.angles[1] += Math.PI * 2;
                }
                while (this.angles[1] >= Math.PI * 2) {
                    this.angles[1] -= Math.PI * 2;
                }
                this.angles[0] += yDelta * this.rotationSpeed;
                while (this.angles[0] < -Math.PI * 0.5) {
                    this.angles[0] = -Math.PI * 0.5;
                }
                while (this.angles[0] > Math.PI * 0.5) {
                    this.angles[0] = Math.PI * 0.5;
                }
                this._dirty = true;
            }
        });
        this.canvas.addEventListener('mouseup', event => moving = false);
    }
    get angles() {
        return this._angles;
    }
    set angles(value) {
        this._angles = value;
        this._dirty = true;
    }
    get position() {
        return this._position;
    }
    set position(value) {
        this._position = value;
        this._dirty = true;
    }
    get viewMat() {
        if (this._dirty) {
            var mv = this._viewMat;
            identity(mv);
            rotateX$1(mv, mv, this.angles[0] - Math.PI / 2.0);
            rotateZ$1(mv, mv, this.angles[1]);
            rotateY$1(mv, mv, this.angles[2]);
            translate(mv, mv, [-this.position[0], -this.position[1], -this.position[2]]);
            this._dirty = false;
        }
        return this._viewMat;
    }
    update(frameTime) {
        const dir = create$1();
        let speed = (this.speed / 1000) * frameTime;
        if (this.pressedKeys[16]) { // Shift, speed up
            speed *= 5;
        }
        // This is our first person movement code. It's not really pretty, but it works
        if (this.pressedKeys['W'.charCodeAt(0)]) {
            dir[1] += speed;
        }
        if (this.pressedKeys['S'.charCodeAt(0)]) {
            dir[1] -= speed;
        }
        if (this.pressedKeys['A'.charCodeAt(0)]) {
            dir[0] -= speed;
        }
        if (this.pressedKeys['D'.charCodeAt(0)]) {
            dir[0] += speed;
        }
        if (this.pressedKeys[32]) { // Space, moves up
            dir[2] += speed;
        }
        if (this.pressedKeys['C'.charCodeAt(0)]) { // C, moves down
            dir[2] -= speed;
        }
        if (dir[0] !== 0 || dir[1] !== 0 || dir[2] !== 0) {
            let cam = this._cameraMat;
            identity(cam);
            rotateX$1(cam, cam, this.angles[0]);
            rotateZ$1(cam, cam, this.angles[1]);
            invert(cam, cam);
            transformMat4(dir, dir, cam);
            // Move the camera in the direction we are facing
            add(this.position, this.position, dir);
            this._dirty = true;
        }
    }
}
//# sourceMappingURL=FpsCamera.js.map

var MovementMode;
(function (MovementMode) {
    MovementMode[MovementMode["Free"] = 0] = "Free";
    MovementMode[MovementMode["Predefined"] = 1] = "Predefined";
})(MovementMode || (MovementMode = {}));
class FreeMovement {
    constructor(renderer, options) {
        this.renderer = renderer;
        this.options = options;
        this.matCamera = create();
        this.matInvCamera = new Float32Array(16);
        this.vec3Eye = new Float32Array(3);
        this.vec3Rotation = new Float32Array(3);
        this.mode = MovementMode.Predefined;
        this.setupControls();
    }
    setupControls() {
        document.addEventListener("keypress", (event) => {
            var _a;
            if (event.code === "Enter") {
                if (this.mode === MovementMode.Predefined) {
                    this.matCamera = clone(this.renderer.getViewMatrix());
                    this.renderer.setCustomCamera(this.matCamera);
                    this.mode = MovementMode.Free;
                    invert(this.matInvCamera, this.matCamera);
                    getTranslation(this.vec3Eye, this.matInvCamera);
                    normalize$3(this.vec3Rotation, this.vec3Eye);
                    scale$1(this.vec3Rotation, this.vec3Rotation, -1);
                    this.fpsCamera = (_a = this.fpsCamera) !== null && _a !== void 0 ? _a : new FpsCamera(this.options);
                    this.fpsCamera.position = this.vec3Eye;
                    const callback = (time) => {
                        if (this.mode !== MovementMode.Free) {
                            return;
                        }
                        this.fpsCamera.update(16);
                        this.matCamera = this.fpsCamera.viewMat;
                        this.renderer.setCustomCamera(this.matCamera);
                        requestAnimationFrame(callback);
                    };
                    callback();
                }
                else {
                    this.renderer.resetCustomCamera();
                    this.mode = MovementMode.Predefined;
                }
            }
        });
    }
    ;
}
//# sourceMappingURL=FreeMovement.js.map

function ready(fn) {
    if (document.readyState !== "loading") {
        fn();
    }
    else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}
ready(() => {
    const renderer = new DunesRenderer();
    renderer.init("canvasGL", true);
    const canvas = document.getElementById("canvasGL");
    new FreeMovement(renderer, {
        canvas,
        movementSpeed: 1200,
        rotationSpeed: 0.006
    });
    const fullScreenUtils = new FullScreenUtils();
    const toggleFullscreenElement = document.getElementById("toggleFullscreen");
    toggleFullscreenElement.addEventListener("click", () => {
        if (document.body.classList.contains("fs")) {
            fullScreenUtils.exitFullScreen();
        }
        else {
            fullScreenUtils.enterFullScreen();
        }
        fullScreenUtils.addFullScreenListener(function () {
            if (fullScreenUtils.isFullScreen()) {
                document.body.classList.add("fs");
            }
            else {
                document.body.classList.remove("fs");
            }
        });
    });
    canvas.addEventListener("click", () => renderer.changeTimeOfDay());
});
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
