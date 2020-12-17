import { BaseShader } from "webgl-framework";
export declare class PointSpriteColoredShader extends BaseShader {
    uMvp: WebGLUniformLocation | undefined;
    uThickness: WebGLUniformLocation | undefined;
    tex0: WebGLUniformLocation | undefined;
    color: WebGLUniformLocation | undefined;
    aPosition: number | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
