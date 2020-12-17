import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
export declare class DiffuseAnimatedShader extends BaseShader {
    muMVPMatrixHandle: WebGLUniformLocation | undefined;
    msTextureHandle: WebGLUniformLocation | undefined;
    mMHandle: WebGLUniformLocation | undefined;
    maPosition1Handle: number | undefined;
    maPosition2Handle: number | undefined;
    maTextureHandle: number | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
    private clamp;
    drawModel(renderer: RendererWithExposedMethods, model: FullModel, frames: number, frame1: number, frame2: number, m: number, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
}
