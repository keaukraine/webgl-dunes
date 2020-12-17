import { DiffuseAnimatedShader } from "./DiffuseAnimatedShader";
export declare class DiffuseATColoredAnimatedShader extends DiffuseAnimatedShader {
    color: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
