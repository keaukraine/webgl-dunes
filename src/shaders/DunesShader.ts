import { BaseShader, FullModel, DiffuseShader } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";

export class DunesShader extends DiffuseShader {
    /** Uniforms are of type `WebGLUniformLocation` */
    uTime: WebGLUniformLocation | undefined;
    sDust: WebGLUniformLocation | undefined;
    uDustOpacity: WebGLUniformLocation | undefined;
    sDetail1: WebGLUniformLocation | undefined;
    uColor: WebGLUniformLocation | undefined;
    uFogColor: WebGLUniformLocation | undefined;
    uShadowColor: WebGLUniformLocation | undefined;
    uWavesColor: WebGLUniformLocation | undefined;
    fogStartDistance: WebGLUniformLocation | undefined;
    fogDistance: WebGLUniformLocation | undefined;
    detailStartDistance: WebGLUniformLocation | undefined;
    detailDistance: WebGLUniformLocation | undefined;

    private static lightmapIndex = 0;

    // Attributes are numbers.
    rm_Normal: number | undefined;

    static getInstance(gl: WebGLRenderingContext | WebGL2RenderingContext, lightmapIndex: number) {
        DunesShader.lightmapIndex = lightmapIndex;
        return new DunesShader(gl);
    }

    fillCode() {
        this.vertexShaderCode = `uniform mat4 view_proj_matrix;
            attribute vec4 rm_Vertex;
            attribute vec2 rm_TexCoord0;
            attribute vec3 rm_Normal;
            varying vec2 vTextureCoord;
            varying vec2 vUpwindTexCoord;
            varying vec2 vLeewardTexCoord2;
            varying vec2 vWindSpotsTexCoord;
            varying vec3 vNormal;
            varying float vSlopeCoeff; // Windward slope coefficient
            varying float vSlopeCoeff2; // Leeward slope coefficient
            varying vec2 vDetailCoord1;
            varying float vFogAmount;
            varying float vDetailFade;

            uniform float fogDistance;
            uniform float fogStartDistance;
            uniform float detailDistance;
            uniform float detailStartDistance;
            uniform float uTime;

            void main() {
              gl_Position = view_proj_matrix * rm_Vertex;
              vTextureCoord = rm_TexCoord0;
              vNormal = rm_Normal;
              vSlopeCoeff = clamp( 4.0*dot(vNormal, normalize(vec3(1.0, 0.0, 0.13))), 0.0, 1.0);
              vSlopeCoeff2 = clamp( 14.0*dot(vNormal, normalize(vec3(-1.0, 0.0, -0.2))), 0.0, 1.0);
              vUpwindTexCoord = vTextureCoord * vec2(100.0, 10.0);
              vUpwindTexCoord.y += uTime;

              vDetailCoord1 = rm_TexCoord0 * vec2(100.0, 100.0);

              vLeewardTexCoord2 = vTextureCoord * vec2(20.0, 30.0);
              vLeewardTexCoord2.y += uTime;

              vWindSpotsTexCoord = vTextureCoord * vec2(1.5, 1.5);
              vWindSpotsTexCoord.x += uTime * 0.1;
              vFogAmount = clamp((length(gl_Position) - fogStartDistance) / fogDistance, 0.0, 1.0);
              vDetailFade = 1.0 - clamp((length(gl_Position) - detailStartDistance) / detailDistance, 0.0, 1.0);
            }`;

        this.fragmentShaderCode = `precision mediump float;
            varying vec2 vTextureCoord;
            varying vec3 vNormal;
            varying float vSlopeCoeff;
            varying float vSlopeCoeff2;
            varying vec2 vUpwindTexCoord;
            varying vec2 vLeewardTexCoord2;
            varying vec2 vWindSpotsTexCoord;
            varying vec2 vDetailCoord1;
            varying float vFogAmount;
            varying float vDetailFade;

            uniform sampler2D sTexture;
            uniform sampler2D sDust;
            uniform sampler2D sDetail1;
            uniform float uDustOpacity;
            uniform vec4 uColor;
            uniform vec4 uFogColor;
            uniform vec4 uShadowColor;
            uniform vec4 uWavesColor;

            void main() {
              vec4 windward = texture2D(sDust, vUpwindTexCoord);
              vec4 leeward2 = texture2D(sDust, vLeewardTexCoord2);
              vec4 detailColor = texture2D(sDetail1, vDetailCoord1);
              float detail1 = detailColor.g - 0.5;
              float detail2 = detailColor.r - 0.5;

              detail1 *= vDetailFade;
              detail2 *= vDetailFade;

              vec4 textureData = texture2D(sTexture, vTextureCoord);
              gl_FragColor = textureData.r * uColor;
              // gl_FragColor.b += vSlopeCoeff; // windward slopes visualization
              // gl_FragColor.g += vSlopeCoeff2; // leeward slopes visualization
              vec4 waves = windward * uDustOpacity * vSlopeCoeff;
              waves += leeward2 * uDustOpacity * vSlopeCoeff2;
              waves *= 1.0 - clamp(texture2D(sDust, vWindSpotsTexCoord).r * 5.0, 0.0, 1.0);
              gl_FragColor += waves * uWavesColor;
              gl_FragColor.rgb += mix(detail2, detail1, vSlopeCoeff2);
              gl_FragColor *= mix(uShadowColor, vec4(1.0, 1.0, 1.0, 1.0), textureData[${DunesShader.lightmapIndex}]);
              gl_FragColor = mix(gl_FragColor, uFogColor, vFogAmount);
              // gl_FragColor.r = vDetailFade; // detail distance visualization
              // gl_FragColor.r = texture2D(sDust, vWindSpotsTexCoord).r; // wind terrain spots visualization
            }`;
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();

        this.rm_Normal = this.getAttrib("rm_Normal");
        this.sDust = this.getUniform("sDust");
        this.uTime = this.getUniform("uTime");
        this.uDustOpacity = this.getUniform("uDustOpacity");
        this.sDetail1 = this.getUniform("sDetail1");
        this.uColor = this.getUniform("uColor");
        this.uFogColor = this.getUniform("uFogColor");
        this.uShadowColor = this.getUniform("uShadowColor");
        this.uWavesColor = this.getUniform("uWavesColor");
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
        this.detailStartDistance = this.getUniform("detailStartDistance");
        this.detailDistance = this.getUniform("detailDistance");
    }
}
