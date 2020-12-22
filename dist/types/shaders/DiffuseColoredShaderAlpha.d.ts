import { DiffuseShader, FullModel } from "webgl-framework";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
export declare class DiffuseColoredShaderAlpha extends DiffuseShader implements DrawableShader {
    /** Uniforms are of type `WebGLUniformLocation` */
    color: WebGLUniformLocation | undefined;
    sAlphaTexture: WebGLUniformLocation | undefined;
    private _color;
    fillCode(): void;
    fillUniformsAttributes(): void;
    setColor(r: number, g: number, b: number, a: number): void;
    drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
}
