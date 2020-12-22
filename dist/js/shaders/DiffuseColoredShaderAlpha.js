"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffuseColoredShaderAlpha = void 0;
const webgl_framework_1 = require("webgl-framework");
class DiffuseColoredShaderAlpha extends webgl_framework_1.DiffuseShader {
    constructor() {
        super(...arguments);
        this._color = [1, 1, 0, 0];
    }
    // Attributes are numbers.
    // rm_Vertex: number | undefined;
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = `precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D sTexture;
            uniform sampler2D sAlphaTexture;
            uniform vec4 color;

            void main() {
                gl_FragColor = texture2D(sTexture, vTextureCoord) * color;
                vec4 alpha = texture2D(sAlphaTexture, vTextureCoord);
                if (alpha.r < 0.5) discard;
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.color = this.getUniform("color");
        this.sAlphaTexture = this.getUniform("sAlphaTexture");
    }
    setColor(r, g, b, a) {
        this._color = [r, g, b, a];
    }
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined || this.color === undefined) {
            return;
        }
        const gl = renderer.gl;
        gl.uniform4f(this.color, this._color[0], this._color[1], this._color[2], this._color[3]);
        super.drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz);
    }
}
exports.DiffuseColoredShaderAlpha = DiffuseColoredShaderAlpha;
//# sourceMappingURL=DiffuseColoredShaderAlpha.js.map