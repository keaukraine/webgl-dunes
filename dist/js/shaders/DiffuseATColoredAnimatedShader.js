"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffuseATColoredAnimatedShader = void 0;
const DiffuseAnimatedShader_1 = require("./DiffuseAnimatedShader");
class DiffuseATColoredAnimatedShader extends DiffuseAnimatedShader_1.DiffuseAnimatedShader {
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
}
exports.DiffuseATColoredAnimatedShader = DiffuseATColoredAnimatedShader;
//# sourceMappingURL=DiffuseATColoredAnimatedShader.js.map