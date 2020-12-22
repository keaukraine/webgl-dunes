"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FreeMovement = void 0;
const gl_matrix_1 = require("gl-matrix");
const FpsCamera_1 = require("./FpsCamera");
var MovementMode;
(function (MovementMode) {
    MovementMode[MovementMode["Free"] = 0] = "Free";
    MovementMode[MovementMode["Predefined"] = 1] = "Predefined";
})(MovementMode || (MovementMode = {}));
;
class FreeMovement {
    constructor(renderer, options) {
        this.renderer = renderer;
        this.options = options;
        this.matCamera = gl_matrix_1.mat4.create();
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
                    this.matCamera = gl_matrix_1.mat4.clone(this.renderer.getViewMatrix());
                    this.renderer.setCustomCamera(this.matCamera);
                    this.mode = MovementMode.Free;
                    gl_matrix_1.mat4.invert(this.matInvCamera, this.matCamera);
                    gl_matrix_1.mat4.getTranslation(this.vec3Eye, this.matInvCamera);
                    gl_matrix_1.vec3.normalize(this.vec3Rotation, this.vec3Eye);
                    gl_matrix_1.vec3.scale(this.vec3Rotation, this.vec3Rotation, -1);
                    this.fpsCamera = (_a = this.fpsCamera) !== null && _a !== void 0 ? _a : new FpsCamera_1.FpsCamera(this.options);
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
                    callback(16);
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
exports.FreeMovement = FreeMovement;
//# sourceMappingURL=FreeMovement.js.map