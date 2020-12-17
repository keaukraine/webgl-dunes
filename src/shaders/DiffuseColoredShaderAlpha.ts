import { DiffuseShader, FullModel } from "webgl-framework";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";

export class DiffuseColoredShaderAlpha extends DiffuseShader implements DrawableShader {
    /** Uniforms are of type `WebGLUniformLocation` */
    color: WebGLUniformLocation | undefined;
    sAlphaTexture: WebGLUniformLocation | undefined;

    private _color: number[] = [1, 1, 0, 0];

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

    public setColor(r: number, g: number, b: number, a: number) {
        this._color = [r, g, b, a];
    }

    drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined || this.color === undefined) {
            return;
        }

        const gl = renderer.gl;
        gl.uniform4f(this.color, this._color[0], this._color[1], this._color[2], this._color[3]);

        super.drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz);
    }
}
