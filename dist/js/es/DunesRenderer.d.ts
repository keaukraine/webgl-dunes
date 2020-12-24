import { BaseRenderer, FullModel, DiffuseShader } from "webgl-framework";
import { mat4 } from "gl-matrix";
export declare class DunesRenderer extends BaseRenderer {
    private lastTime;
    private angleYaw;
    private dustTimer;
    private loaded;
    private fmSky;
    private fmPalms;
    private fmDunes;
    private fmSmoke;
    private fmSun;
    private fmBird;
    private skyTexture;
    private palmTextureAlpha;
    private palmTextureDiffuse;
    private dunesDiffuseTexture;
    private dunesDustTexture;
    private dunesDetailTexture;
    private textureDustCloud;
    private textureSunFlare;
    private textureBird;
    private shaderDiffuse;
    private shaderDunesPermutations;
    private get shaderDunes();
    private shaderSoftDiffuseColored;
    private sunShader;
    private palmShader;
    private shaderAnimated;
    private shaderDepthRender;
    private textureOffscreenColor;
    private textureOffscreenDepth;
    private fboOffscreen;
    private customCamera;
    private Z_NEAR;
    private Z_FAR;
    private SMOKE_SOFTNESS;
    private timerDustRotation;
    private DUST_ROTATION_SPEED;
    private timerDustMovement;
    private DUST_MOVEMENT_SPEED;
    private timerBirdAnimation1;
    private timerBirdAnimation2;
    private BIRD_ANIMATION_PERIOD1;
    private BIRD_ANIMATION_PERIOD2;
    private timerBirdsFly;
    private BIRD_FLIGHT_PERIOD;
    private timerRandomCamera;
    private RANDOM_CAMERA_PERIOD;
    private timerCameraWobble;
    private CAMERA_WOBBLE_PERIOD;
    private BIRD_FLIGHT_RADIUS;
    private DUST_TRAVEL_X;
    private DUST_TRAVEL_Z;
    private DUST_MAX_SCALE;
    private mQuadTriangles;
    private mTriangleVerticesVignette;
    private PRESETS;
    private currentPreset;
    private PRESET;
    private SUN_COLOR_FADE;
    private SUN_COLOR;
    private animationBird;
    private cameraMode;
    private readonly RANDOM_POSITIONS;
    private currentRandomCamera;
    private currentRandomLookat;
    private currentRandomFov;
    private tempVec3;
    constructor();
    setCustomCamera(camera: mat4 | undefined): void;
    resetCustomCamera(): void;
    onBeforeInit(): void;
    onAfterInit(): void;
    onInitError(): void;
    initShaders(): void;
    loadData(): Promise<void>;
    changeTimeOfDay(): Promise<void>;
    animate(): void;
    /** Calculates projection matrix */
    setCameraFOV(multiplier: number): void;
    /**
     * Calculates camera matrix.
     *
     * @param a Position in [0...1] range
     */
    private positionCamera;
    /** Issues actual draw calls */
    drawScene(): void;
    drawTestDepth(): void;
    drawVignette(shader: DiffuseShader): void;
    private drawDepthObjects;
    private drawSceneObjects;
    drawPalmTrees(): void;
    drawBirds(): void;
    private getBirdPosition;
    drawDunes(model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
    drawDunesDepth(model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
    private drawDiffuseVBOFacingCamera;
    private calculateMVPMatrixForSprite;
    private resetMatrixRotations;
    private drawSun;
    private clamp;
    private smoothstep;
    private smootherstep;
    private drawSoftSpriteParticles;
    protected initOffscreen(): void;
    private initVignette;
    private initDepthReadShader;
    private randomizeCamera;
    private minRandom;
}
