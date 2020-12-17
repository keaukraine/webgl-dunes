import { BaseShader } from "webgl-framework";
/**
 * Renders geometries with dummy green color.
 */
export declare class DepthRenderShader extends BaseShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
