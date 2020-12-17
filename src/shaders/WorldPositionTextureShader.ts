import { BaseShader, FullModel, DiffuseShader } from "webgl-framework";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";

export class WorldPositionTextureShader extends BaseShader implements DrawableShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    sTexture: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;

    fillCode() {
        this.vertexShaderCode = "uniform mat4 view_proj_matrix;\n" +
            "uniform mat4 model_matrix;\n" + // Model matrix
            "attribute vec4 rm_Vertex;\n" +
            "varying vec2 vTexCoord;\n" +
            "\n" +
            "void main() {\n" +
            "  gl_Position = view_proj_matrix * rm_Vertex;\n" +
            "  vTexCoord = (model_matrix * rm_Vertex).xy;\n" +
            "}";

        this.fragmentShaderCode = "precision mediump float;\n" +
            "varying vec2 vTexCoord;\n" +
            'uniform sampler2D sTexture;\n' +
            "void main() {\n" +
            "  vec2 coords = vec2( 0.5 + vTexCoord.x / 9030.0, 1.0 - (0.5 + vTexCoord.y / 9030.0) );\n" +
            // "  float a = 0.5 + vTexCoord.x / 4515.0;\n" +
            // "  gl_FragColor = vec4(a, 0.0, 0.0, 1.0);\n" +
            "  gl_FragColor = texture2D(sTexture, coords);\n" +
            "}";
    }

    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.model_matrix = this.getUniform("model_matrix");
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.sTexture = this.getUniform("sTexture");
    }

    /** @inheritdoc */
    drawModel(
        renderer: RendererWithExposedMethods,
        model: FullModel,
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number,
        sx: number, sy: number, sz: number
    ): void {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined || this.model_matrix === undefined) {
            return;
        }

        const gl = renderer.gl;

        model.bindBuffers(gl);

        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2 + 3), 0);

        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);

        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.uniformMatrix4fv(this.model_matrix, false, renderer.getModelMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);

        renderer.checkGlError("DiffuseShader glDrawElements");
    }
}
