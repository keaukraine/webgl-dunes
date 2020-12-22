import { DiffuseShader } from "webgl-framework";
export declare class SoftDiffuseColoredShader extends DiffuseShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    sTexture: WebGLUniformLocation | undefined;
    cameraRange: WebGLUniformLocation | undefined;
    sDepth: WebGLUniformLocation | undefined;
    invViewportSize: WebGLUniformLocation | undefined;
    transitionSize: WebGLUniformLocation | undefined;
    color: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
