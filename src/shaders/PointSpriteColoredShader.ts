import { FullModel, BaseShader } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";

export class PointSpriteColoredShader extends BaseShader {
    uMvp: WebGLUniformLocation | undefined;
    uThickness: WebGLUniformLocation | undefined;
    tex0: WebGLUniformLocation | undefined;
    color: WebGLUniformLocation | undefined;

    aPosition: number | undefined;

    fillCode() {
        this.vertexShaderCode = "uniform mat4 uMvp;\n" +
            "uniform float uThickness;\n" +
            "\n" +
            "attribute vec4 aPosition;\n" +
            "\n" +
            "void main() {\n" +
            // "    vec4 position = uMvp * vec4(aPosition.xyz, 1.0);\n" +
            "    vec4 position = uMvp * aPosition;\n" +
            // "    vec3 ndc = position.xyz / position.w; // perspective divide.\n" +
            // "    float zDist = 1.0 - ndc.z; // 1 is close (right up in your face,)\n" +
            // "    gl_PointSize = uThickness * zDist;\n" +
            "    gl_PointSize = uThickness;\n" +
            "    gl_Position =  position;\n" +
            "}";

        this.fragmentShaderCode = "precision mediump float;\n" +
            "uniform sampler2D tex0;\n" +
            "uniform vec4 color;\n" +
            "\n" +
            "void main() \n" +
            "{\n" +
            "   gl_FragColor = texture2D(tex0, gl_PointCoord) * color;\n" +
            "}";
    }

    fillUniformsAttributes() {
        this.uMvp = this.getUniform("uMvp");
        this.uThickness = this.getUniform("uThickness");
        this.aPosition = this.getAttrib("aPosition");
        this.tex0 = this.getUniform("tex0");
        this.color = this.getUniform("color");
    }
}
