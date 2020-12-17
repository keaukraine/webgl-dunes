import { BaseShader, DiffuseShader, FullModel } from "webgl-framework";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";

export class DiffuseAnimatedShader extends BaseShader {
    // Uniforms are of type `WebGLUniformLocation`
    muMVPMatrixHandle: WebGLUniformLocation | undefined;
    msTextureHandle: WebGLUniformLocation | undefined;
    mMHandle: WebGLUniformLocation | undefined;

    // Attributes are numbers.
    maPosition1Handle: number | undefined;
    maPosition2Handle: number | undefined;
    maTextureHandle: number | undefined;

    fillCode() {
        this.vertexShaderCode = "uniform highp mat4 uMVPMatrix;\n" +
            "attribute highp vec4 aPosition1;\n" +
            "attribute highp vec4 aPosition2;\n" +
            "uniform float m;\n" +
            "attribute highp vec2 aTextureCoord;\n" +
            "varying mediump vec2 vTextureCoord;\n" +
            "void main() {\n" +
            "  gl_Position = uMVPMatrix * mix(aPosition1, aPosition2, m);\n" +
            "  vTextureCoord = aTextureCoord;\n" +
            "}\n";

        this.fragmentShaderCode = "precision mediump float;\n" +
            "varying mediump vec2 vTextureCoord;\n" +
            "uniform sampler2D sTexture;\n" +
            "void main() {\n" +
            "  vec4 base = texture2D(sTexture, vTextureCoord);\n" +
            "  gl_FragColor = base;\n" +
            "}\n";
    }

    fillUniformsAttributes() {
        this.maPosition1Handle = this.getAttrib("aPosition1");
        this.maPosition2Handle = this.getAttrib("aPosition2");
        this.maTextureHandle = this.getAttrib("aTextureCoord");
        this.muMVPMatrixHandle = this.getUniform("uMVPMatrix");
        this.msTextureHandle = this.getUniform("sTexture");
        this.mMHandle = this.getUniform("m");
    }

    private clamp(i: number, low: number, high: number): number {
        return Math.max(Math.min(i, high), low);
    }

    drawModel(renderer: RendererWithExposedMethods, model: FullModel, frames: number, frame1: number, frame2: number, m: number, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void {
        if (this.muMVPMatrixHandle === undefined || this.msTextureHandle === undefined || this.mMHandle === undefined || this.maPosition1Handle === undefined || this.maPosition2Handle === undefined || this.maTextureHandle === undefined) {
            return;
        }

        const gl = renderer.gl;

        model.bindBuffers(gl);

        const stride = (2 + frames * 3) * 4;
        const offsetUV = (frames * 3) * 4;

        gl.enableVertexAttribArray(this.maPosition1Handle);
        gl.enableVertexAttribArray(this.maPosition2Handle);
        gl.enableVertexAttribArray(this.maTextureHandle);

        gl.vertexAttribPointer(this.maPosition1Handle, 3, gl.FLOAT, false, stride, 3 * (frame1) * 4);
        gl.vertexAttribPointer(this.maPosition2Handle, 3, gl.FLOAT, false, stride, 3 * (frame2) * 4);
        gl.vertexAttribPointer(this.maTextureHandle, 2, gl.FLOAT, false, stride, offsetUV);

        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.muMVPMatrixHandle, false, renderer.getMVPMatrix());

        gl.uniform1f(this.mMHandle, this.clamp(m, 0.0, 1.0));

        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("glDrawElements");
    }
}
