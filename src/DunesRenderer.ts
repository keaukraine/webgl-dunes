import { BaseRenderer, FullModel, UncompressedTextureLoader, DiffuseShader, BaseShader, TextureUtils, FrameBuffer, CombinedAnimation } from "webgl-framework";
import { mat4 } from "gl-matrix";
import { DunesShader } from "./shaders/DunesShader";
import { particlesCoordinates } from "./DuneCapsParticles";
import { SoftDiffuseColoredShader } from "./shaders/SoftDiffuseColoredShader";
import { DiffuseColoredShader } from "./shaders/DiffuseColoredShader";
import { DiffuseColoredShaderAlpha } from "./shaders/DiffuseColoredShaderAlpha";
import { DiffuseATColoredAnimatedShader } from "./shaders/DiffuseATColoredAnimatedShader";
import { CameraMode } from "./CameraMode";
import { DepthRenderShader } from "./shaders/DepthRenderShader";
import { DunesPlsShader } from "./shaders/DunesPlsShader";
import { SoftDiffuseColoredPlsShader } from "./shaders/SoftDiffuseColoredPlsShader";

const FOV_LANDSCAPE = 70.0; // FOV for landscape
const FOV_PORTRAIT = 80.0; // FOV for portrait
const YAW_COEFF_NORMAL = 200.0; // camera rotation time
const DUST_TIMER = 3000.0; // sand movement speed
const TERRAIN_SCALE = 100;

export class DunesRenderer extends BaseRenderer {
    private lastTime = 0;
    private angleYaw = 0;
    private dustTimer = 0;

    private loaded = false;

    private fmSky = new FullModel();
    private fmPalms = new FullModel();
    private fmDunes = new FullModel();
    private fmSmoke = new FullModel();
    private fmSun = new FullModel();
    private fmBird = new FullModel();

    private skyTexture: WebGLTexture | undefined;
    private palmTextureAlpha: WebGLTexture | undefined;
    private palmTextureDiffuse: WebGLTexture | undefined;
    private dunesDiffuseTexture: WebGLTexture | undefined;
    private dunesDustTexture: WebGLTexture | undefined;
    private dunesDetailTexture: WebGLTexture | undefined;
    private textureDustCloud: WebGLTexture | undefined;
    private textureSunFlare: WebGLTexture | undefined;
    private textureBird: WebGLTexture | undefined;

    private shaderDiffuse: DiffuseShader | undefined;
    private shaderDunesPermutations: DunesShader[] = [];
    private get shaderDunes(): DunesShader { return this.shaderDunesPermutations![this.PRESET.DUNES_SHADER]; };
    private shaderDunesPlsPermutations: DunesPlsShader[] = [];
    private get shaderDunesPls(): DunesPlsShader { return this.shaderDunesPlsPermutations![this.PRESET.DUNES_SHADER]; };
    private shaderSoftDiffuseColored: SoftDiffuseColoredShader | undefined;
    private shaderSoftDiffuseColoredPls: SoftDiffuseColoredPlsShader | undefined;
    private sunShader: DiffuseColoredShader | undefined;
    private palmShader: DiffuseColoredShaderAlpha | undefined;
    private shaderAnimated: DiffuseATColoredAnimatedShader | undefined;
    private shaderDepthRender: DepthRenderShader | undefined;

    private textureOffscreenColor: WebGLTexture | undefined
    private textureOffscreenDepth: WebGLTexture | undefined;
    private fboOffscreen: FrameBuffer | undefined;

    private pls: any;

    private customCamera: mat4 | undefined;

    private Z_NEAR = 20.0;
    private Z_FAR = 40000.0;
    private SMOKE_SOFTNESS = 0.012;

    private timerDustRotation = 0;
    private DUST_ROTATION_SPEED = 903333;
    private timerDustMovement = 0;
    private DUST_MOVEMENT_SPEED = 2500;
    private timerBirdAnimation1 = 0;
    private timerBirdAnimation2 = 0;
    private BIRD_ANIMATION_PERIOD1 = 2000;
    private BIRD_ANIMATION_PERIOD2 = 800;
    private timerBirdsFly = 0;
    private BIRD_FLIGHT_PERIOD = 50000;
    private timerRandomCamera = 0;
    private RANDOM_CAMERA_PERIOD = 6000;
    private timerCameraWobble = 0;
    private CAMERA_WOBBLE_PERIOD = 40000;

    private BIRD_FLIGHT_RADIUS = 2000;

    private DUST_TRAVEL_X = -500;
    private DUST_TRAVEL_Z = -200;
    private DUST_MAX_SCALE = 7.0;

    private mQuadTriangles: Float32Array | undefined;
    private mTriangleVerticesVignette: WebGLBuffer | undefined;

    private PRESETS = [
        {
            SKY: "night_1",
            SAND_COLOR: {
                r: 85 / 255 * 0.45, // night
                g: 130 / 255 * 0.45,
                b: 150 / 255 * 0.45
            },
            SHADOW_COLOR: {
                r: -212 / 255 * 0.5, // night
                g: -200 / 255 * 0.5,
                b: -138 / 255 * 0.5
            },
            FOG_COLOR: {
                r: 6 / 255 * 1.0, // night
                g: 8 / 255 * 1.0,
                b: 13 / 255 * 1.0
            },
            DECO_COLOR: {
                r: 100 / 255 * 0.18, // night
                g: 110 / 255 * 0.18,
                b: 170 / 255 * 0.18
            },
            SUN_TRANSFORM: {
                tx: 0, // night
                ty: -22000,
                tz: 8500,
                sx: 0.0,
                sy: 1,
                sz: 1
            },
            DUNES_SHADER: 1,
            DUST_COLOR: {
                r: 55 / 255 * 0.25, //night
                g: 62 / 255 * 0.25,
                b: 81 / 255 * 0.25
            },
            WAVES_COLOR: {
                r: 143 / 255 * 1.0, //night
                g: 152 / 255 * 1.0,
                b: 182 / 255 * 1.0
            },
            FOG_START_DISTANCE: 200,
            FOG_DISTANCE: 12000
        },
        {
            SKY: "day_1",
            SAND_COLOR: {
                r: 246 / 255, //day
                g: 158 / 255,
                b: 59 / 255
            },
            SHADOW_COLOR: {
                r: 87 / 255, // day
                g: 56 / 255,
                b: 33 / 255
            },
            FOG_COLOR: {
                r: 147 / 255, // day
                g: 178 / 255,
                b: 205 / 255
            },
            DECO_COLOR: {
                r: 150 / 255 * 1.0, // day
                g: 150 / 255 * 1.0,
                b: 90 / 255 * 1.0
            },
            SUN_TRANSFORM: {
                tx: 0, // day
                ty: -22000,
                tz: 8500,
                sx: 300.0,
                sy: 1,
                sz: 1
            },
            DUNES_SHADER: 1,
            DUST_COLOR: {
                r: 235 / 255 * 0.20, //day, sunset
                g: 162 / 255 * 0.20,
                b: 48 / 255 * 0.20
            },
            WAVES_COLOR: {
                r: 255 / 255 * 0.99, //day, sunset
                g: 226 / 255 * 0.99,
                b: 171 / 255 * 0.99
            },
            FOG_START_DISTANCE: 1000,
            FOG_DISTANCE: 45000
        },
        {
            SKY: "sunset_1",
            SAND_COLOR: {
                r: 255 / 255, // sunset
                g: 131 / 255,
                b: 44 / 255
            }, // sunset
            SHADOW_COLOR: {
                r: 64 / 255, // sunset
                g: 52 / 255,
                b: 100 / 255
            },
            FOG_COLOR: {
                r: 109 / 255, // sunset
                g: 113 / 255,
                b: 137 / 255
            },
            DECO_COLOR: {
                r: 200 / 255 * 0.7, // sunset
                g: 150 / 255 * 0.7,
                b: 90 / 255 * 0.7
            },
            SUN_TRANSFORM: {
                tx: 0, // sunset
                ty: 22000,
                tz: 100,
                sx: 200.0,
                sy: 1,
                sz: 1
            },
            DUNES_SHADER: 0,
            DUST_COLOR: {
                r: 235 / 255 * 0.20, //day, sunset
                g: 162 / 255 * 0.20,
                b: 48 / 255 * 0.20
            },
            WAVES_COLOR: {
                r: 255 / 255 * 0.99, //day, sunset
                g: 226 / 255 * 0.99,
                b: 171 / 255 * 0.99
            },
            FOG_START_DISTANCE: 1000,
            FOG_DISTANCE: 45000
        },
        {
            SKY: "sunrise_1",
            SAND_COLOR: {
                r: 255 / 255, // sunrise
                g: 142 / 255,
                b: 50 / 255
            }, // sunrise
            SHADOW_COLOR: {
                r: 64 / 255, // sunrise
                g: 62 / 255,
                b: 110 / 255
            },
            FOG_COLOR: {
                r: 109 / 255, // sunset
                g: 113 / 255,
                b: 137 / 255
            },
            DECO_COLOR: {
                r: 200 / 255 * 0.7, // sunset
                g: 150 / 255 * 0.7,
                b: 90 / 255 * 0.7
            },
            SUN_TRANSFORM: {
                tx: 0, // sunset
                ty: 22000,
                tz: 100,
                sx: 200.0,
                sy: 1,
                sz: 1
            },
            DUNES_SHADER: 0,
            DUST_COLOR: {
                r: 235 / 255 * 0.20, //day, sunset
                g: 162 / 255 * 0.20,
                b: 48 / 255 * 0.20
            },
            WAVES_COLOR: {
                r: 255 / 255 * 0.99, //day, sunset
                g: 226 / 255 * 0.99,
                b: 171 / 255 * 0.99
            },
            FOG_START_DISTANCE: 1000,
            FOG_DISTANCE: 45000
        }
    ];

    private currentPreset = 1;
    private PRESET = this.PRESETS[this.currentPreset];

    private SUN_COLOR_FADE = 0.6;
    private SUN_COLOR = {
        r: 255 * this.SUN_COLOR_FADE / 255,
        g: 229 * this.SUN_COLOR_FADE / 255,
        b: 159 * this.SUN_COLOR_FADE / 255
    };

    private animationBird = new CombinedAnimation(5);

    private cameraMode = CameraMode.Random;

    private readonly RANDOM_POSITIONS = [
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
    private currentRandomCamera = 0;
    private currentRandomLookat = new Float32Array(3);
    private currentRandomFov = 0;
    private tempVec3 = new Float32Array(3);

    constructor() {
        super();
        this.randomizeCamera();
    }

    setCustomCamera(camera: mat4 | undefined) {
        this.customCamera = camera;
    }

    resetCustomCamera() {
        this.customCamera = undefined;
    }

    onBeforeInit(): void {
    }

    onAfterInit(): void {
    }

    onInitError(): void {
        document.getElementById("canvasGL")?.classList.add("hidden");
        document.getElementById("alertError")?.classList.remove("hidden");
    }

    initShaders(): void {
        this.initPls();

        if (this.pls) {
            this.shaderDunesPlsPermutations.push(DunesPlsShader.getInstance(this.gl, 1));
            this.shaderDunesPlsPermutations.push(DunesPlsShader.getInstance(this.gl, 2));
            this.shaderSoftDiffuseColoredPls = new SoftDiffuseColoredPlsShader(this.gl);
        }

        this.shaderDiffuse = new DiffuseShader(this.gl);
        this.shaderSoftDiffuseColored = new SoftDiffuseColoredShader(this.gl);
        this.sunShader = new DiffuseColoredShader(this.gl);
        this.palmShader = new DiffuseColoredShaderAlpha(this.gl);
        this.shaderAnimated = new DiffuseATColoredAnimatedShader(this.gl);
        this.shaderDepthRender = new DepthRenderShader(this.gl);
        this.shaderDunesPermutations.push(DunesShader.getInstance(this.gl, 1));
        this.shaderDunesPermutations.push(DunesShader.getInstance(this.gl, 2));
    }

    async loadData(): Promise<void> {
        const modelsPromise = Promise.all([
            this.fmSky.load("data/models/sky", this.gl),
            this.fmPalms.load("data/models/palms", this.gl),
            this.fmDunes.load("data/models/dunes", this.gl),
            this.fmSmoke.load("data/models/smoke100", this.gl),
            this.fmSun.load("data/models/sun_flare", this.gl),
            this.fmBird.load("data/models/bird-anim-uv", this.gl),
        ]);
        const texturesPromise = Promise.all([
            UncompressedTextureLoader.load("data/textures/" + this.PRESET.SKY + ".jpg", this.gl, undefined, undefined, true),
            UncompressedTextureLoader.load("data/textures/dunes-diffuse.jpg", this.gl),
            UncompressedTextureLoader.load("data/textures/upwind.png", this.gl),
            UncompressedTextureLoader.load("data/textures/detail.png", this.gl),
            UncompressedTextureLoader.load("data/textures/smoke.png", this.gl),
            UncompressedTextureLoader.load("data/textures/sun_flare.png", this.gl),
            UncompressedTextureLoader.load("data/textures/bird2.png", this.gl),
            UncompressedTextureLoader.load("data/textures/palm-alpha.png", this.gl, undefined, undefined, true),
            UncompressedTextureLoader.load("data/textures/palm-diffuse.png", this.gl, undefined, undefined, true)
        ]);

        const [models, textures] = await Promise.all([modelsPromise, texturesPromise]);

        this.skyTexture = textures[0];
        this.dunesDiffuseTexture = textures[1];
        this.dunesDustTexture = textures[2];
        this.dunesDetailTexture = textures[3];
        this.textureDustCloud = textures[4];
        this.textureSunFlare = textures[5];
        this.textureBird = textures[6];

        this.palmTextureAlpha = textures[7];
        this.palmTextureDiffuse = textures[8];

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.dunesDiffuseTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.dunesDetailTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);

        this.initOffscreen();
        this.initVignette();

        this.loaded = true;
        console.log("Loaded all assets");

        document.getElementById("message")?.classList.add("hidden");
        document.getElementById("canvasGL")?.classList.remove("transparent");
        setTimeout(() => document.querySelector(".promo")?.classList.remove("transparent"), 1800);
        setTimeout(() => document.querySelector("#toggleFullscreen")?.classList.remove("transparent"), 1800);
    }

    async changeTimeOfDay(): Promise<void> {
        const newPreset = ++this.currentPreset % 4;
        const texture = await UncompressedTextureLoader.load("data/textures/" + this.PRESETS[newPreset].SKY + ".jpg", this.gl, undefined, undefined, true);
        this.gl.deleteTexture(this.skyTexture!);
        this.skyTexture = texture;
        this.PRESET = this.PRESETS[newPreset];
        this.currentPreset = newPreset;
    }

    animate(): void {
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
    setCameraFOV(multiplier: number): void {
        var ratio;

        if (this.gl.canvas.height > 0) {
            ratio = this.gl.canvas.width / this.gl.canvas.height;
        } else {
            ratio = 1.0;
        }

        let fov = 0;
        if (this.gl.canvas.width >= this.gl.canvas.height) {
            fov = FOV_LANDSCAPE * multiplier;
        } else {
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
    private positionCamera(a: number) {
        if (this.customCamera !== undefined) {
            this.mVMatrix = this.customCamera;
            return;
        }

        if (this.cameraMode === CameraMode.Random) {
            this.tempVec3[0] = this.currentRandomLookat[0] + Math.sin(this.timerCameraWobble * 2 * Math.PI * 2) * 0.2;
            this.tempVec3[1] = this.currentRandomLookat[1];
            this.tempVec3[2] = this.currentRandomLookat[2] + Math.cos(this.timerCameraWobble * 3 * Math.PI * 2) * 0.05;

            mat4.lookAt(this.mVMatrix,
                this.RANDOM_POSITIONS[this.currentRandomCamera],
                this.tempVec3,
                [0, 0, 1]
            );
        } else {
            const cameraDistances = { min: 250, max: 3000 };
            const cameraHeights = { min: 80, max: 600 };

            const cameraDistanceRate = 0.02;
            const cameraDistanceFactor = Math.sin(this.angleYaw * cameraDistanceRate) * 0.5 + 0.5;

            const cameraDistance = cameraDistances.min + (cameraDistances.max - cameraDistances.min) * cameraDistanceFactor;
            const cameraHeight = cameraHeights.min + (cameraHeights.max - cameraHeights.min) * cameraDistanceFactor;

            mat4.lookAt(this.mVMatrix,
                [0, 0, -400], // eye
                [1000, 0, -600], // center
                [0, 0.1, 1] // up vector
            );
            mat4.rotate(this.mVMatrix, this.mVMatrix, (this.angleYaw + 280) / 160.0 * 6.2831852, [0, 0, 1]);
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
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreen!.framebufferHandle);
        this.gl.viewport(0, 0, this.fboOffscreen!.width!, this.fboOffscreen!.height!);
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

        // this.drawSceneObjects();
        this.drawSceneObjectsPls();

        // this.drawTestDepth();
    }

    drawTestDepth() {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);

        this.shaderDiffuse!.use();

        this.setTexture2D(0, this.textureOffscreenDepth!, this.shaderDiffuse!.sTexture!);
        this.drawVignette(this.shaderDiffuse!);
    }

    drawVignette(shader: DiffuseShader) {
        this.unbindBuffers();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette!);

        this.gl.enableVertexAttribArray(shader.rm_Vertex!);
        this.gl.vertexAttribPointer(shader.rm_Vertex!, 3, this.gl.FLOAT, false, 20, 0);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0!);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0!, 2, this.gl.FLOAT, false, 20, 4 * 3);

        this.gl.uniformMatrix4fv(shader.view_proj_matrix!, false, this.getOrthoMatrix());
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    private drawDepthObjects(): void {
        if (this.shaderDunes === undefined || this.shaderDiffuse === undefined) {
            console.log("undefined shaders");
            return;
        }

        this.drawDunesDepth(this.fmDunes, 0, 0, 0, 0, 0, 0, TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
    }

    private drawSceneObjects(): void {
        if (this.shaderDunes === undefined || this.shaderDiffuse === undefined) {
            console.log("undefined shaders");
            return;
        }

        this.gl.disable(this.gl.BLEND);

        this.shaderDunes.use();
        this.setTexture2D(0, this.dunesDiffuseTexture!, this.shaderDunes.sTexture!);
        this.setTexture2D(1, this.dunesDustTexture!, this.shaderDunes.sDust!);
        this.setTexture2D(2, this.dunesDetailTexture!, this.shaderDunes.sDetail1!);

        this.gl.uniform1f(this.shaderDunes.uDustOpacity!, 0.075);
        this.gl.uniform1f(this.shaderDunes.uTime!, this.dustTimer);
        this.gl.uniform4f(this.shaderDunes.uColor!, this.PRESET.SAND_COLOR.r, this.PRESET.SAND_COLOR.g, this.PRESET.SAND_COLOR.b, 1.0);
        this.gl.uniform4f(this.shaderDunes.uFogColor!, this.PRESET.FOG_COLOR.r, this.PRESET.FOG_COLOR.g, this.PRESET.FOG_COLOR.b, 1.0);
        this.gl.uniform4f(this.shaderDunes.uShadowColor!, this.PRESET.SHADOW_COLOR.r, this.PRESET.SHADOW_COLOR.g, this.PRESET.SHADOW_COLOR.b, 1.0);
        this.gl.uniform4f(this.shaderDunes.uWavesColor!, this.PRESET.WAVES_COLOR.r, this.PRESET.WAVES_COLOR.g, this.PRESET.WAVES_COLOR.b, 1.0);

        this.gl.uniform1f(this.shaderDunes.fogStartDistance!, this.PRESET.FOG_START_DISTANCE);
        this.gl.uniform1f(this.shaderDunes.fogDistance!, this.PRESET.FOG_DISTANCE);

        this.gl.uniform1f(this.shaderDunes.detailStartDistance!, 400);
        this.gl.uniform1f(this.shaderDunes.detailDistance!, 1200);

        this.drawDunes(this.fmDunes, this.shaderDunes, 0, 0, 0, 0, 0, 0, TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);

        // -45.15 * 2 = 90.3
        const SKIRT_SCALE = 1.5;
        const SKIRT_OFFSET = 9030 / 2 + (9030 / 2 * SKIRT_SCALE);

        this.gl.cullFace(this.gl.FRONT);
        this.drawDunes(this.fmDunes, this.shaderDunes, SKIRT_OFFSET, 0, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, this.shaderDunes, -SKIRT_OFFSET, 0, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, this.shaderDunes, 0, SKIRT_OFFSET, 0, 0, 0, 0, TERRAIN_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, this.shaderDunes, 0, -SKIRT_OFFSET, 0, 0, 0, 0, TERRAIN_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);

        this.gl.cullFace(this.gl.BACK);

        this.drawDunes(this.fmDunes, this.shaderDunes, SKIRT_OFFSET, SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, this.shaderDunes, -SKIRT_OFFSET, -SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, this.shaderDunes, SKIRT_OFFSET, -SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, this.shaderDunes, -SKIRT_OFFSET, SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);

        this.drawBirds();
        this.drawPalmTrees();

        this.shaderDiffuse.use();
        this.setTexture2D(0, this.skyTexture!, this.shaderDiffuse.sTexture!);
        this.shaderDiffuse.drawModel(this, this.fmSky, 0, 0, -1200, 0, 0, 0, 150, 150, 150);

        this.drawSoftSpriteParticles();

        this.drawSun();
    }

    private drawSceneObjectsPls(): void {
        if (this.shaderDiffuse === undefined) {
            console.log("undefined shaders");
            return;
        }

        this.pls.beginPixelLocalStorageWEBGL([this.pls.LOAD_OP_CLEAR_WEBGL]);

        this.gl.disable(this.gl.BLEND);

        this.shaderDunesPls.use();
        this.setTexture2D(0, this.dunesDiffuseTexture!, this.shaderDunesPls.sTexture!);
        this.setTexture2D(1, this.dunesDustTexture!, this.shaderDunesPls.sDust!);
        this.setTexture2D(2, this.dunesDetailTexture!, this.shaderDunesPls.sDetail1!);

        this.gl.uniform1f(this.shaderDunesPls.uDustOpacity!, 0.075);
        this.gl.uniform1f(this.shaderDunesPls.uTime!, this.dustTimer);
        this.gl.uniform4f(this.shaderDunesPls.uColor!, this.PRESET.SAND_COLOR.r, this.PRESET.SAND_COLOR.g, this.PRESET.SAND_COLOR.b, 1.0);
        this.gl.uniform4f(this.shaderDunesPls.uFogColor!, this.PRESET.FOG_COLOR.r, this.PRESET.FOG_COLOR.g, this.PRESET.FOG_COLOR.b, 1.0);
        this.gl.uniform4f(this.shaderDunesPls.uShadowColor!, this.PRESET.SHADOW_COLOR.r, this.PRESET.SHADOW_COLOR.g, this.PRESET.SHADOW_COLOR.b, 1.0);
        this.gl.uniform4f(this.shaderDunesPls.uWavesColor!, this.PRESET.WAVES_COLOR.r, this.PRESET.WAVES_COLOR.g, this.PRESET.WAVES_COLOR.b, 1.0);

        this.gl.uniform1f(this.shaderDunesPls.fogStartDistance!, this.PRESET.FOG_START_DISTANCE);
        this.gl.uniform1f(this.shaderDunesPls.fogDistance!, this.PRESET.FOG_DISTANCE);

        this.gl.uniform1f(this.shaderDunesPls.detailStartDistance!, 400);
        this.gl.uniform1f(this.shaderDunesPls.detailDistance!, 1200);

        this.drawDunes(this.fmDunes, this.shaderDunesPls, 0, 0, 0, 0, 0, 0, TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);

        // -45.15 * 2 = 90.3
        const SKIRT_SCALE = 1.5;
        const SKIRT_OFFSET = 9030 / 2 + (9030 / 2 * SKIRT_SCALE);

        this.gl.cullFace(this.gl.FRONT);
        this.drawDunes(this.fmDunes, this.shaderDunesPls, SKIRT_OFFSET, 0, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, this.shaderDunesPls, -SKIRT_OFFSET, 0, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, this.shaderDunesPls, 0, SKIRT_OFFSET, 0, 0, 0, 0, TERRAIN_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, this.shaderDunesPls, 0, -SKIRT_OFFSET, 0, 0, 0, 0, TERRAIN_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);

        this.gl.cullFace(this.gl.BACK);

        this.drawDunes(this.fmDunes, this.shaderDunesPls, SKIRT_OFFSET, SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, this.shaderDunesPls, -SKIRT_OFFSET, -SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, this.shaderDunesPls, SKIRT_OFFSET, -SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);
        this.drawDunes(this.fmDunes, this.shaderDunesPls, -SKIRT_OFFSET, SKIRT_OFFSET, 0, 0, 0, 0, -TERRAIN_SCALE * SKIRT_SCALE, -TERRAIN_SCALE * SKIRT_SCALE, TERRAIN_SCALE);

        this.drawBirds();
        this.drawPalmTrees();

        this.shaderDiffuse.use();
        this.setTexture2D(0, this.skyTexture!, this.shaderDiffuse.sTexture!);
        this.shaderDiffuse.drawModel(this, this.fmSky, 0, 0, -1200, 0, 0, 0, 150, 150, 150);

        this.drawSoftSpriteParticlesPls();

        this.pls.endPixelLocalStorageWEBGL([this.pls.STORE_OP_STORE_WEBGL]);

        this.drawSun();
    }

    drawPalmTrees() {
        this.gl.disable(this.gl.CULL_FACE);

        this.palmShader?.use();
        this.setTexture2D(0, this.palmTextureDiffuse!, this.palmShader?.sTexture!);
        this.setTexture2D(1, this.palmTextureAlpha!, this.palmShader?.sAlphaTexture!);
        this.palmShader?.setColor(this.PRESET.DECO_COLOR.r, this.PRESET.DECO_COLOR.g, this.PRESET.DECO_COLOR.b, 1.0);
        this.palmShader?.drawModel(this, this.fmPalms, 0, 0, 0, 0, 0, 0, TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE);

        this.gl.enable(this.gl.CULL_FACE);
    }

    drawBirds(): void {
        this.gl.disable(this.gl.CULL_FACE);

        this.shaderAnimated?.use();
        this.setTexture2D(0, this.textureBird!, this.shaderAnimated!.msTextureHandle!);
        this.gl.uniform4f(this.shaderAnimated!.color!, this.PRESET.DECO_COLOR.r, this.PRESET.DECO_COLOR.g, this.PRESET.DECO_COLOR.b, 1.0);

        const angle = this.timerBirdsFly * Math.PI * 2;
        const bird1 = this.getBirdPosition(angle, 1300, 0);
        const bird2 = this.getBirdPosition(-angle - Math.PI, -1300, 0);

        this.animationBird.animate(this.timerBirdAnimation1);
        this.shaderAnimated?.drawModel(
            this,
            this.fmBird,
            this.animationBird.getFramesCount(), this.animationBird.getStart(), this.animationBird.getEnd(), this.animationBird.getCurrentCoeff(),
            bird1.x, bird1.y, 0,
            0, 0, -angle - Math.PI * 0.5,
            6, 6, 6
        );

        this.animationBird.animate(this.timerBirdAnimation2);
        this.shaderAnimated?.drawModel(
            this,
            this.fmBird,
            this.animationBird.getFramesCount(), this.animationBird.getStart(), this.animationBird.getEnd(), this.animationBird.getCurrentCoeff(),
            bird2.x, bird2.y, 0,
            0, 0, angle + Math.PI * 1.5,
            5, 5, 5
        );

        this.gl.enable(this.gl.CULL_FACE);
    }

    private getBirdPosition(angle: number, centerX: number, centerY: number): { x: number, y: number } {
        const x = Math.sin(angle) * this.BIRD_FLIGHT_RADIUS + centerX;
        const y = Math.cos(angle) * this.BIRD_FLIGHT_RADIUS + centerY;

        return { x, y };
    }

    drawDunes(
        model: FullModel,
        shader: DunesShader,
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number,
        sx: number, sy: number, sz: number
    ): void {
        if (shader.rm_Vertex === undefined || shader.rm_TexCoord0 === undefined || shader.view_proj_matrix === undefined || shader.rm_Normal === undefined) {
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

        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        this.checkGlError("DiffuseShader glDrawElements");
    }

    drawDunesDepth(
        model: FullModel,
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number,
        sx: number, sy: number, sz: number
    ): void {
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

    private drawDiffuseVBOFacingCamera(shader: DiffuseShader, model: FullModel, tx: number, ty: number, tz: number, sx: number, sy: number, sz: number, rotation: number) {
        model.bindBuffers(this.gl);

        this.gl.enableVertexAttribArray(shader.rm_Vertex!);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0!);
        this.gl.vertexAttribPointer(shader.rm_Vertex!, 3, this.gl.FLOAT, false, 4 * (3 + 2), 0);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0!, 2, this.gl.FLOAT, false, 4 * (3 + 2), 4 * 3);

        this.calculateMVPMatrixForSprite(tx, ty, tz, sx, sy, sz, rotation);

        this.gl.uniformMatrix4fv(shader.view_proj_matrix!, false, this.mMVPMatrix);
        this.gl.drawElements(this.gl.TRIANGLES, model.getNumIndices() * 3, this.gl.UNSIGNED_SHORT, 0);
        this.checkGlError("glDrawElements");
    }

    private calculateMVPMatrixForSprite(tx: number, ty: number, tz: number, sx: number, sy: number, sz: number, rotation: number) {
        mat4.identity(this.mMMatrix);
        mat4.translate(this.mMMatrix, this.mMMatrix, [tx, ty, tz]);
        mat4.scale(this.mMMatrix, this.mMMatrix, [sx, sy, sz]);
        mat4.multiply(this.mMVPMatrix, this.mVMatrix, this.mMMatrix);
        this.resetMatrixRotations(this.mMVPMatrix);
        mat4.rotateZ(this.mMVPMatrix, this.mMVPMatrix, rotation);
        mat4.multiply(this.mMVPMatrix, this.mProjMatrix, this.mMVPMatrix);
    }

    private resetMatrixRotations(matrix: mat4) {
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

    private drawSun() {
        this.gl.enable(this.gl.BLEND);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.gl.depthMask(false);

        this.sunShader?.use();
        this.setTexture2D(0, this.textureSunFlare!, this.sunShader!.sTexture!);

        this.gl.uniform4f(this.sunShader!.color!, this.SUN_COLOR.r, this.SUN_COLOR.g, this.SUN_COLOR.b, 1.0);

        this.drawDiffuseVBOFacingCamera(
            this.sunShader!,
            this.fmSun,
            this.PRESET.SUN_TRANSFORM.tx, this.PRESET.SUN_TRANSFORM.ty, this.PRESET.SUN_TRANSFORM.tz,
            this.PRESET.SUN_TRANSFORM.sx, this.PRESET.SUN_TRANSFORM.sy, this.PRESET.SUN_TRANSFORM.sz,
            this.timerDustRotation * Math.PI * 2
        );

        this.gl.disable(this.gl.BLEND);
        this.gl.depthMask(true);
    }

    private clamp(i: number, low: number, high: number): number {
        return Math.max(Math.min(i, high), low);
    }

    private smoothstep(edge0: number, edge1: number, x: number): number {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
    }

    private smootherstep(edge0: number, edge1: number, x: number): number {
        x = this.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return x * x * x * (x * (x * 6 - 15) + 10);
    }

    private drawSoftSpriteParticles() {
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
        this.setTexture2D(0, this.textureDustCloud!, this.shaderSoftDiffuseColored.sTexture!);

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

                this.gl.uniform4f(
                    this.shaderSoftDiffuseColored.color!,
                    this.PRESET.DUST_COLOR.r * opacity, this.PRESET.DUST_COLOR.g * opacity, this.PRESET.DUST_COLOR.b * opacity, 1
                );

                this.drawDiffuseVBOFacingCamera(
                    this.shaderSoftDiffuseColored!,
                    this.fmSmoke,
                    x, y, z,
                    scale, 1, 1,
                    rotation
                );
            }
        }

        this.gl.disable(this.gl.BLEND);
        this.gl.depthMask(true);
    }

    private drawSoftSpriteParticlesPls() {
        if (this.shaderSoftDiffuseColoredPls === undefined) {
            return;
        }

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.gl.depthMask(false);

        // const cosa = Math.cos(this.timerDustRotation * Math.PI * 2);
        // const sina = Math.sin(this.timerDustRotation * Math.PI * 2);

        this.shaderSoftDiffuseColoredPls.use();
        this.initDepthReadShader(this.shaderSoftDiffuseColoredPls);
        this.setTexture2D(0, this.textureDustCloud!, this.shaderSoftDiffuseColoredPls.sTexture!);

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

                this.gl.uniform4f(
                    this.shaderSoftDiffuseColoredPls.color!,
                    this.PRESET.DUST_COLOR.r * opacity, this.PRESET.DUST_COLOR.g * opacity, this.PRESET.DUST_COLOR.b * opacity, 1
                );

                this.drawDiffuseVBOFacingCamera(
                    this.shaderSoftDiffuseColoredPls!,
                    this.fmSmoke,
                    x, y, z,
                    scale, 1, 1,
                    rotation
                );
            }
        }

        this.gl.disable(this.gl.BLEND);
        this.gl.depthMask(true);
    }

    protected initOffscreen() {
        if (this.canvas === undefined) {
            return;
        }

        this.textureOffscreenColor = TextureUtils.createNpotTexture(this.gl, this.canvas.width, this.canvas.height, false)!;
        this.checkGlError("color");
        this.textureOffscreenDepth = TextureUtils.createDepthTexture(this.gl, this.canvas.width, this.canvas.height)!;
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

    private initPls(): void {
        if (this.canvas === undefined) {
            return;
        }
        const gl = this.gl as WebGL2RenderingContext;

        this.pls = gl.getExtension("WEBGL_shader_pixel_local_storage");
        console.log("pls", this.pls);

        const blitFBO = gl.createFramebuffer();
        const renderFBO = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderFBO);
        this.pls.framebufferPixelLocalClearValuefvWEBGL(0, [0, 0, 0, 1]);

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        // gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, this.canvas.width, this.canvas.height);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, this.canvas.width, this.canvas.height);

        gl.bindFramebuffer(gl.FRAMEBUFFER, blitFBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, renderFBO);
        this.pls.framebufferTexturePixelLocalStorageWEBGL(0, tex, 0, 0);
    }

    private initVignette() {
        mat4.ortho(this.matOrtho, -1, 1, -1, 1, 2.0, 250);

        this.mQuadTriangles = new Float32Array([
            // X, Y, Z, U, V
            -1.0, -1.0, -5.0, 0.0, 0.0, // 0. left-bottom
            1.0, -1.0, -5.0, 1.0, 0.0, // 1. right-bottom
            -1.0, 1.0, -5.0, 0.0, 1.0, // 2. left-top
            1.0, 1.0, -5.0, 1.0, 1.0, // 3. right-top
        ]);
        this.mTriangleVerticesVignette = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.mQuadTriangles, this.gl.STATIC_DRAW);
    }

    private initDepthReadShader(shader: SoftDiffuseColoredShader) {
        this.gl.uniform2f(shader.cameraRange!, this.Z_NEAR, this.Z_FAR); // near and far clipping planes
        this.gl.uniform2f(shader.invViewportSize!, 1.0 / this.gl.canvas.width, 1.0 / this.gl.canvas.height); // inverted screen size
        this.gl.uniform1f(shader.transitionSize!, this.SMOKE_SOFTNESS);
        this.setTexture2D(2, this.textureOffscreenDepth!, shader.sDepth!);
    }

    private randomizeCamera(): void {
        this.currentRandomCamera =
            (this.currentRandomCamera + 1 + Math.trunc(Math.random() * (this.RANDOM_POSITIONS.length - 2))) % this.RANDOM_POSITIONS.length;

        this.currentRandomLookat[0] = this.RANDOM_POSITIONS[this.currentRandomCamera][0] + this.minRandom(0.3);
        this.currentRandomLookat[1] = this.RANDOM_POSITIONS[this.currentRandomCamera][1] + this.minRandom(0.3);
        this.currentRandomLookat[2] = this.RANDOM_POSITIONS[this.currentRandomCamera][2] + this.minRandom(0.3) * 0.1;

        this.currentRandomFov = Math.random() * 30;
    }

    private minRandom(threshold: number) {
        let random = (Math.random() - 0.5);
        if (random < 0 && random > -threshold) {
            random -= threshold;
        } else if (random > 0 && random < threshold) {
            random += threshold;
        }
        return random;
    }
}
