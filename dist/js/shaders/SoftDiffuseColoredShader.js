"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoftDiffuseColoredShader = void 0;
const webgl_framework_1 = require("webgl-framework");
class SoftDiffuseColoredShader extends webgl_framework_1.DiffuseShader {
    fillCode() {
        this.vertexShaderCode = "uniform mat4 view_proj_matrix;\n" +
            "attribute vec4 rm_Vertex;\n" +
            "attribute vec2 rm_TexCoord0;\n" +
            "varying vec2 vTextureCoord;\n" +
            "\n" +
            "void main() {\n" +
            "  gl_Position = view_proj_matrix * rm_Vertex;\n" +
            "  vTextureCoord = rm_TexCoord0;\n" +
            "}";
        this.fragmentShaderCode = "precision highp float;\n" +
            "uniform vec2 uCameraRange;\n" +
            "uniform vec2 uInvViewportSize;\n" +
            "uniform float uTransitionSize;\n" +
            "float calc_depth(in float z)\n" +
            "{\n" +
            "  return (2.0 * uCameraRange.x) / (uCameraRange.y + uCameraRange.x - z*(uCameraRange.y - uCameraRange.x));\n" +
            "}\n" +
            "uniform sampler2D sDepth;\n" +
            "varying vec2 vTextureCoord;\n" +
            "uniform sampler2D sTexture;\n" +
            "uniform vec4 color;\n" +
            "\n" +
            "void main() {\n" +
            "   vec4 diffuse = texture2D(sTexture, vTextureCoord) * color;\n" + // particle base diffuse color
            // "   diffuse += vec4(0.0, 0.0, 1.0, 1.0);\n"+ // uncomment to visualize particle shape
            "   vec2 coords = gl_FragCoord.xy * uInvViewportSize;\n" + // calculate depth texture coordinates
            "   float geometryZ = calc_depth(texture2D(sDepth, coords).r);\n" + // lineriarize particle depth
            "   float sceneZ = calc_depth(gl_FragCoord.z);\n" + // lineriarize scene depth
            "   float a = clamp(geometryZ - sceneZ, 0.0, 1.0);\n" + // linear clamped diff between scene and particle depth
            "   float b = smoothstep(0.0, uTransitionSize, a);\n" + // apply smoothstep to make soft transition
            "   gl_FragColor = diffuse * b;\n" + // final color with soft edge
            "   gl_FragColor *= pow(1.0 - gl_FragCoord.z, 0.3);\n" +
            // "   gl_FragColor = vec4(a, a, a, 1.0);\n" + // uncomment to visualize raw Z difference
            // "   gl_FragColor = vec4(b, b, b, 1.0);\n" + // uncomment to visualize blending coefficient
            "}";
    }
    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.rm_TexCoord0 = this.getAttrib("rm_TexCoord0");
        this.sTexture = this.getUniform("sTexture");
        this.cameraRange = this.getUniform("uCameraRange");
        this.sDepth = this.getUniform("sDepth");
        this.invViewportSize = this.getUniform("uInvViewportSize");
        this.transitionSize = this.getUniform("uTransitionSize");
        this.color = this.getUniform("color");
    }
}
exports.SoftDiffuseColoredShader = SoftDiffuseColoredShader;
//# sourceMappingURL=SoftDiffuseColoredShader.js.map