"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DunesRenderer = void 0;
const webgl_framework_1 = require("webgl-framework");
const gl_matrix_1 = require("gl-matrix");
const DunesShader_1 = require("./shaders/DunesShader");
const DuneCapsParticles_1 = require("./DuneCapsParticles");
const SoftDiffuseColoredShader_1 = require("./shaders/SoftDiffuseColoredShader");
const DiffuseColoredShader_1 = require("./shaders/DiffuseColoredShader");
const DiffuseColoredShaderAlpha_1 = require("./shaders/DiffuseColoredShaderAlpha");
const DiffuseATColoredAnimatedShader_1 = require("./shaders/DiffuseATColoredAnimatedShader");
const CameraMode_1 = require("./CameraMode");
const DepthRenderShader_1 = require("./shaders/DepthRenderShader");
const FOV_LANDSCAPE = 70.0; // FOV for landscape
const FOV_PORTRAIT = 80.0; // FOV for portrait
const YAW_COEFF_NORMAL = 200.0; // camera rotation time
const DUST_TIMER = 3000.0; // sand movement speed
const TERRAIN_SCALE = 100;
class DunesRenderer extends webgl_framework_1.BaseRenderer {
    constructor() {
        super();
        this.lastTime = 0;
        this.angleYaw = 0;
        this.dustTimer = 0;
        this.loaded = false;
        this.fmSky = new webgl_framework_1.FullModel();
        this.fmPalms = new webgl_framework_1.FullModel();
        this.fmDunes = new webgl_framework_1.FullModel();
        this.fmSmoke = new webgl_framework_1.FullModel();
        this.fmSun = new webgl_framework_1.FullModel();
        this.fmBird = new webgl_framework_1.FullModel();
        this.shaderDunesPermutations = [];
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
        this.animationBird = new webgl_framework_1.CombinedAnimation(5);
        this.cameraMode = CameraMode_1.CameraMode.Random;
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
        this.tempVec3 = new Float32Array(3);
        this.randomizeCamera();
    }
    get shaderDunes() { return this.shaderDunesPermutations[this.PRESET.DUNES_SHADER]; }
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
        this.shaderDiffuse = new webgl_framework_1.DiffuseShader(this.gl);
        this.shaderSoftDiffuseColored = new SoftDiffuseColoredShader_1.SoftDiffuseColoredShader(this.gl);
        this.sunShader = new DiffuseColoredShader_1.DiffuseColoredShader(this.gl);
        this.palmShader = new DiffuseColoredShaderAlpha_1.DiffuseColoredShaderAlpha(this.gl);
        this.shaderAnimated = new DiffuseATColoredAnimatedShader_1.DiffuseATColoredAnimatedShader(this.gl);
        this.shaderDepthRender = new DepthRenderShader_1.DepthRenderShader(this.gl);
        this.shaderDunesPermutations.push(DunesShader_1.DunesShader.getInstance(this.gl, 1));
        this.shaderDunesPermutations.push(DunesShader_1.DunesShader.getInstance(this.gl, 2));
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
            await webgl_framework_1.UncompressedTextureLoader.load("data/textures/" + this.PRESET.SKY + ".jpg", this.gl, undefined, undefined, true),
            await webgl_framework_1.UncompressedTextureLoader.load("data/textures/dunes-diffuse.jpg", this.gl),
            await webgl_framework_1.UncompressedTextureLoader.load("data/textures/upwind.png", this.gl),
            await webgl_framework_1.UncompressedTextureLoader.load("data/textures/detail.png", this.gl),
            await webgl_framework_1.UncompressedTextureLoader.load("data/textures/smoke.png", this.gl),
            await webgl_framework_1.UncompressedTextureLoader.load("data/textures/sun_flare.png", this.gl),
            await webgl_framework_1.UncompressedTextureLoader.load("data/textures/bird2.png", this.gl)
        ]);
        this.skyTexture = textures[0];
        this.dunesDiffuseTexture = textures[1];
        this.dunesDustTexture = textures[2];
        this.dunesDetailTexture = textures[3];
        this.textureDustCloud = textures[4];
        this.textureSunFlare = textures[5];
        this.textureBird = textures[6];
        this.palmTextureAlpha = await webgl_framework_1.UncompressedTextureLoader.load("data/textures/palm-alpha.png", this.gl, undefined, undefined, true);
        this.palmTextureDiffuse = await webgl_framework_1.UncompressedTextureLoader.load("data/textures/palm-diffuse.png", this.gl, undefined, undefined, true);
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
        const texture = await webgl_framework_1.UncompressedTextureLoader.load("data/textures/" + this.PRESETS[newPreset].SKY + ".jpg", this.gl, undefined, undefined, true);
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
            if (this.cameraMode === CameraMode_1.CameraMode.Random && this.timerRandomCamera < previousTimerRandomCamera) {
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
        if (this.gl.canvas.width >= this.gl.canvas.height) {
            this.setFOV(this.mProjMatrix, FOV_LANDSCAPE * multiplier, ratio, this.Z_NEAR, this.Z_FAR);
        }
        else {
            this.setFOV(this.mProjMatrix, FOV_PORTRAIT * multiplier, ratio, this.Z_NEAR, this.Z_FAR);
        }
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
        if (this.cameraMode === CameraMode_1.CameraMode.Random) {
            this.tempVec3[0] = this.currentRandomLookat[0] + Math.sin(this.timerCameraWobble * 2 * Math.PI * 2) * 0.2;
            this.tempVec3[1] = this.currentRandomLookat[1];
            this.tempVec3[2] = this.currentRandomLookat[2] + Math.cos(this.timerCameraWobble * 3 * Math.PI * 2) * 0.05;
            gl_matrix_1.mat4.lookAt(this.mVMatrix, this.RANDOM_POSITIONS[this.currentRandomCamera], this.tempVec3, [0, 0, 1]);
        }
        else {
            const cameraDistances = { min: 250, max: 3000 };
            const cameraHeights = { min: 80, max: 600 };
            const cameraDistanceRate = 0.02;
            const cameraDistanceFactor = Math.sin(this.angleYaw * cameraDistanceRate) * 0.5 + 0.5;
            const cameraDistance = cameraDistances.min + (cameraDistances.max - cameraDistances.min) * cameraDistanceFactor;
            const cameraHeight = cameraHeights.min + (cameraHeights.max - cameraHeights.min) * cameraDistanceFactor;
            gl_matrix_1.mat4.lookAt(this.mVMatrix, [0, 0, -400], // eye
            [1000, 0, -600], // center
            [0, 0.1, 1] // up vector
            );
            gl_matrix_1.mat4.rotate(this.mVMatrix, this.mVMatrix, (this.angleYaw + 280) / 160.0 * 6.2831852, [0, 0, 1]);
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
        this.shaderDunes.use();
        this.setTexture2D(0, this.dunesDiffuseTexture, this.shaderDunes.sTexture);
        this.setTexture2D(1, this.dunesDustTexture, this.shaderDunes.sDust);
        this.setTexture2D(2, this.dunesDetailTexture, this.shaderDunes.sDetail1);
        this.gl.uniform1f(this.shaderDunes.uDustOpacity, 0.075);
        this.gl.uniform1f(this.shaderDunes.uTime, this.dustTimer);
        this.gl.uniform4f(this.shaderDunes.uColor, this.PRESET.SAND_COLOR.r, this.PRESET.SAND_COLOR.g, this.PRESET.SAND_COLOR.b, 1.0);
        this.gl.uniform4f(this.shaderDunes.uFogColor, this.PRESET.FOG_COLOR.r, this.PRESET.FOG_COLOR.g, this.PRESET.FOG_COLOR.b, 1.0);
        this.gl.uniform4f(this.shaderDunes.uShadowColor, this.PRESET.SHADOW_COLOR.r, this.PRESET.SHADOW_COLOR.g, this.PRESET.SHADOW_COLOR.b, 1.0);
        this.gl.uniform4f(this.shaderDunes.uWavesColor, this.PRESET.WAVES_COLOR.r, this.PRESET.WAVES_COLOR.g, this.PRESET.WAVES_COLOR.b, 1.0);
        this.gl.uniform1f(this.shaderDunes.fogStartDistance, this.PRESET.FOG_START_DISTANCE);
        this.gl.uniform1f(this.shaderDunes.fogDistance, this.PRESET.FOG_DISTANCE);
        this.gl.uniform1f(this.shaderDunes.detailStartDistance, 400);
        this.gl.uniform1f(this.shaderDunes.detailDistance, 1200);
        this.drawDunes(this.fmDunes, 0, 0, 0, 0, 0, 0, TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        // -45.15 * 2 = 90.3
        const SKIRT_SCALE = 1.5;
        const SKIRT_OFFSET = 9030 / 2 + (9030 / 2 * SKIRT_SCALE);
        this.gl.cullFace(this.gl.FRONT);
        this.drawDunes(this.fmDunes, SKIRT_OFFSET, 0, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, -SKIRT_OFFSET, 0, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, 0, SKIRT_OFFSET, 0, 0, 0, 0, TERRAIN_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, 0, -SKIRT_OFFSET, 0, 0, 0, 0, TERRAIN_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.gl.cullFace(this.gl.BACK);
        this.drawDunes(this.fmDunes, SKIRT_OFFSET, SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, -SKIRT_OFFSET, -SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, SKIRT_OFFSET, -SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, -SKIRT_OFFSET, SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
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
    drawDunes(model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.shaderDunes === undefined || this.shaderDunes.rm_Vertex === undefined || this.shaderDunes.rm_TexCoord0 === undefined || this.shaderDunes.view_proj_matrix === undefined || this.shaderDunes.rm_Normal === undefined) {
            return;
        }
        const gl = this.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.shaderDunes.rm_Vertex);
        gl.enableVertexAttribArray(this.shaderDunes.rm_TexCoord0);
        gl.enableVertexAttribArray(this.shaderDunes.rm_Normal);
        gl.vertexAttribPointer(this.shaderDunes.rm_Vertex, 3, gl.FLOAT, false, 32, 0);
        gl.vertexAttribPointer(this.shaderDunes.rm_TexCoord0, 2, gl.FLOAT, false, 32, 12);
        gl.vertexAttribPointer(this.shaderDunes.rm_Normal, 3, gl.FLOAT, false, 32, 20);
        this.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.shaderDunes.view_proj_matrix, false, this.getMVPMatrix());
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
        gl_matrix_1.mat4.identity(this.mMMatrix);
        gl_matrix_1.mat4.translate(this.mMMatrix, this.mMMatrix, [tx, ty, tz]);
        gl_matrix_1.mat4.scale(this.mMMatrix, this.mMMatrix, [sx, sy, sz]);
        gl_matrix_1.mat4.multiply(this.mMVPMatrix, this.mVMatrix, this.mMMatrix);
        this.resetMatrixRotations(this.mMVPMatrix);
        gl_matrix_1.mat4.rotateZ(this.mMVPMatrix, this.mMVPMatrix, rotation);
        gl_matrix_1.mat4.multiply(this.mMVPMatrix, this.mProjMatrix, this.mMVPMatrix);
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
        for (const dune of DuneCapsParticles_1.particlesCoordinates) {
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
        this.textureOffscreenColor = webgl_framework_1.TextureUtils.createNpotTexture(this.gl, this.canvas.width, this.canvas.height, false);
        this.checkGlError("color");
        this.textureOffscreenDepth = webgl_framework_1.TextureUtils.createDepthTexture(this.gl, this.canvas.width, this.canvas.height);
        this.checkGlError("depth");
        this.fboOffscreen = new webgl_framework_1.FrameBuffer(this.gl);
        this.fboOffscreen.textureHandle = this.textureOffscreenColor;
        this.fboOffscreen.depthTextureHandle = this.textureOffscreenDepth;
        this.fboOffscreen.width = this.canvas.width;
        this.fboOffscreen.height = this.canvas.height;
        this.fboOffscreen.createGLData(this.canvas.width, this.canvas.height);
        this.checkGlError("offscreen FBO");
        console.log("Initialized offscreen FBO.");
    }
    initVignette() {
        gl_matrix_1.mat4.ortho(this.matOrtho, -1, 1, -1, 1, 2.0, 250);
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
exports.DunesRenderer = DunesRenderer;
//# sourceMappingURL=DunesRenderer.js.map