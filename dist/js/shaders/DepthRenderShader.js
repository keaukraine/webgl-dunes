"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepthRenderShader = void 0;
const webgl_framework_1 = require("webgl-framework");
/**
 * Renders geometries with dummy green color.
 */
class DepthRenderShader extends webgl_framework_1.BaseShader {
    fillCode() {
        this.vertexShaderCode = "uniform mat4 view_proj_matrix;\n" +
            "attribute vec4 rm_Vertex;\n" +
            "\n" +
            "void main() {\n" +
            "  gl_Position = view_proj_matrix * rm_Vertex;\n" +
            "}";
        this.fragmentShaderCode = "precision mediump float;\n" +
            "void main() {\n" +
            "  gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);\n" +
            "}";
    }
    fillUniformsAttributes() {
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
    }
}
exports.DepthRenderShader = DepthRenderShader;
//# sourceMappingURL=DepthRenderShader.js.map