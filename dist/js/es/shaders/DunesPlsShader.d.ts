import { DunesShader } from "./DunesShader";
export declare class DunesPlsShader extends DunesShader {
    private static lightmapIndexPls;
    static getInstance(gl: WebGLRenderingContext | WebGL2RenderingContext, lightmapIndex: number): DunesPlsShader;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
