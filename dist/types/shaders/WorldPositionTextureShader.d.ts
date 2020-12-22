import { BaseShader, FullModel } from "webgl-framework";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
export declare class WorldPositionTextureShader extends BaseShader implements DrawableShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    sTexture: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
    /** @inheritdoc */
    drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
}
