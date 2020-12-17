import { BaseShader } from "webgl-framework";

/**
 * Renders geometries with dummy green color.
 */
export class DepthRenderShader extends BaseShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;

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
