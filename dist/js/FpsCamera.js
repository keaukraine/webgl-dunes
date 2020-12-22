"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FpsCamera = void 0;
const gl_matrix_1 = require("gl-matrix");
/**
 * A Flying Camera allows free motion around the scene using FPS style controls (WASD + mouselook)
 * This type of camera is good for displaying large scenes
 */
class FpsCamera {
    constructor(options) {
        var _a, _b;
        this._dirty = true;
        this._angles = [0, 0, 0];
        this._position = gl_matrix_1.vec3.create();
        this.speed = 100;
        this.rotationSpeed = 0.025;
        this._cameraMat = gl_matrix_1.mat4.create();
        this._viewMat = gl_matrix_1.mat4.create();
        this.projectionMat = gl_matrix_1.mat4.create();
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
            gl_matrix_1.mat4.identity(mv);
            gl_matrix_1.mat4.rotateX(mv, mv, this.angles[0] - Math.PI / 2.0);
            gl_matrix_1.mat4.rotateZ(mv, mv, this.angles[1]);
            gl_matrix_1.mat4.rotateY(mv, mv, this.angles[2]);
            gl_matrix_1.mat4.translate(mv, mv, [-this.position[0], -this.position[1], -this.position[2]]);
            this._dirty = false;
        }
        return this._viewMat;
    }
    update(frameTime) {
        const dir = gl_matrix_1.vec3.create();
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
            gl_matrix_1.mat4.identity(cam);
            gl_matrix_1.mat4.rotateX(cam, cam, this.angles[0]);
            gl_matrix_1.mat4.rotateZ(cam, cam, this.angles[1]);
            gl_matrix_1.mat4.invert(cam, cam);
            gl_matrix_1.vec3.transformMat4(dir, dir, cam);
            // Move the camera in the direction we are facing
            gl_matrix_1.vec3.add(this.position, this.position, dir);
            this._dirty = true;
        }
    }
}
exports.FpsCamera = FpsCamera;
//# sourceMappingURL=FpsCamera.js.map