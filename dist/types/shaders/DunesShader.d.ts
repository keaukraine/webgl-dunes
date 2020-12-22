import { DiffuseShader } from "webgl-framework";
export declare class DunesShader extends DiffuseShader {
    /** Uniforms are of type `WebGLUniformLocation` */
    uTime: WebGLUniformLocation | undefined;
    sDust: WebGLUniformLocation | undefined;
    uDustOpacity: WebGLUniformLocation | undefined;
    sDetail1: WebGLUniformLocation | undefined;
    uColor: WebGLUniformLocation | undefined;
    uFogColor: WebGLUniformLocation | undefined;
    uShadowColor: WebGLUniformLocation | undefined;
    uWavesColor: WebGLUniformLocation | undefined;
    fogStartDistance: WebGLUniformLocation | undefined;
    fogDistance: WebGLUniformLocation | undefined;
    detailStartDistance: WebGLUniformLocation | undefined;
    detailDistance: WebGLUniformLocation | undefined;
    private static lightmapIndex;
    rm_Normal: number | undefined;
    static getInstance(gl: WebGLRenderingContext | WebGL2RenderingContext, lightmapIndex: number): DunesShader;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
