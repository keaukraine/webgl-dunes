import { mat4, vec3 } from "gl-matrix";
/**
 * `FpsCamera` configuration options.
 */
export interface FpsCameraOptions {
    /** Canvas element to bind events to. */
    canvas: HTMLElement;
    /** Movement speed. */
    movementSpeed?: number;
    /** Rotation speed. */
    rotationSpeed?: number;
}
/**
 * A Flying Camera allows free motion around the scene using FPS style controls (WASD + mouselook)
 * This type of camera is good for displaying large scenes
 */
export declare class FpsCamera {
    private _dirty;
    private _angles;
    get angles(): number[];
    set angles(value: number[]);
    private _position;
    get position(): vec3;
    set position(value: vec3);
    speed: number;
    rotationSpeed: number;
    private _cameraMat;
    private _viewMat;
    private projectionMat;
    private pressedKeys;
    private canvas;
    get viewMat(): mat4;
    constructor(options: FpsCameraOptions);
    update(frameTime: number): void;
}
