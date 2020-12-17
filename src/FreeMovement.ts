import { DunesRenderer } from "./DunesRenderer";
import { mat4, vec3 } from "gl-matrix";
import { FpsCamera, FpsCameraOptions } from "./FpsCamera";

enum MovementMode {
    Free,
    Predefined
};

export class FreeMovement {
    private mode: MovementMode;
    private matCamera = mat4.create();
    private matInvCamera = new Float32Array(16);
    private vec3Eye = new Float32Array(3);
    private vec3Rotation = new Float32Array(3);

    private fpsCamera: FpsCamera | undefined;

    constructor(private renderer: DunesRenderer, private options: FpsCameraOptions) {
        this.mode = MovementMode.Predefined;
        this.setupControls();
    }

    private setupControls() {
        document.addEventListener("keypress", (event) => {
            if (event.code === "Enter") {
                if (this.mode === MovementMode.Predefined) {
                    this.matCamera = mat4.clone(this.renderer.getViewMatrix());
                    this.renderer.setCustomCamera(this.matCamera);
                    this.mode = MovementMode.Free;

                    mat4.invert(this.matInvCamera, this.matCamera);
                    mat4.getTranslation(this.vec3Eye, this.matInvCamera);
                    vec3.normalize(this.vec3Rotation, this.vec3Eye);
                    vec3.scale(this.vec3Rotation, this.vec3Rotation, -1);

                    this.fpsCamera = this.fpsCamera ?? new FpsCamera(this.options);
                    this.fpsCamera.position = this.vec3Eye;

                    const callback = (time: number) => {
                        if (this.mode !== MovementMode.Free) {
                            return;
                        }

                        this.fpsCamera!.update(16);
                        this.matCamera = this.fpsCamera!.viewMat;
                        this.renderer.setCustomCamera(this.matCamera);

                        requestAnimationFrame(callback);
                    }
                    callback(16);
                } else {
                    this.renderer.resetCustomCamera();
                    this.mode = MovementMode.Predefined;
                }
            }
        });
    };
}
