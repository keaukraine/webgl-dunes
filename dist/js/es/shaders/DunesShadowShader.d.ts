import { DunesShader } from "./DunesShader";
export declare class DunesShadowShader extends DunesShader {
    /** Uniforms are of type `WebGLUniformLocation` */
    sShadow: WebGLUniformLocation | undefined;
    shadowDimensions: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    private static lightmapIndexShadow;
    static getInstance(gl: WebGLRenderingContext | WebGL2RenderingContext, lightmapIndex: number): DunesShadowShader;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
