import { BaseShader, DiffuseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { DiffuseAnimatedShader } from "./DiffuseAnimatedShader";

export class DiffuseATColoredAnimatedShader extends DiffuseAnimatedShader {
    // Uniforms are of type `WebGLUniformLocation`
    color: WebGLUniformLocation | undefined;

    fillCode() {
        super.fillCode();

        this.fragmentShaderCode = "precision mediump float;\n" +
            "varying mediump vec2 vTextureCoord;\n" +
            "uniform sampler2D sTexture;\n" +
            "uniform vec4 color;\n" +
            "void main() {\n" +
            "  vec4 base = texture2D(sTexture, vTextureCoord);\n" +
            "  if (base.a < 0.95) {\n" +
            "    discard;\n" +
            "  } else {\n" +
            "    gl_FragColor = base * color;\n" +
            "  }\n" +
            "}\n";
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();

        this.color = this.getUniform("color");
    }

    // drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void {
    // }
}
