import { DunesShader } from "./DunesShader";

export class DunesPlsShader extends DunesShader {
    private static lightmapIndexPls = 0;

    static getInstance(gl: WebGLRenderingContext | WebGL2RenderingContext, lightmapIndex: number) {
        DunesPlsShader.lightmapIndexPls = lightmapIndex;
        return new DunesPlsShader(gl);
    }

    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;
            uniform mat4 view_proj_matrix;

            in vec4 rm_Vertex;
            in vec2 rm_TexCoord0;
            in vec3 rm_Normal;

            out vec2 vTextureCoord;
            out vec2 vUpwindTexCoord;
            out vec2 vLeewardTexCoord2;
            out vec2 vWindSpotsTexCoord;
            out vec3 vNormal;
            out float vSlopeCoeff; // Windward slope coefficient
            out float vSlopeCoeff2; // Leeward slope coefficient
            out vec2 vDetailCoord1;
            out float vFogAmount;
            out float vDetailFade;

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

        this.fragmentShaderCode = `#version 300 es
            #extension GL_ANGLE_shader_pixel_local_storage : require
            precision mediump float;

            in vec2 vTextureCoord;
            in vec3 vNormal;
            in float vSlopeCoeff;
            in float vSlopeCoeff2;
            in vec2 vUpwindTexCoord;
            in vec2 vLeewardTexCoord2;
            in vec2 vWindSpotsTexCoord;
            in vec2 vDetailCoord1;
            in float vFogAmount;
            in float vDetailFade;

            out vec4 fragColor;

            layout(binding=0, r32f) uniform highp pixelLocalANGLE pls;

            uniform sampler2D sTexture;
            uniform sampler2D sDust;
            uniform sampler2D sDetail1;
            uniform float uDustOpacity;
            uniform vec4 uColor;
            uniform vec4 uFogColor;
            uniform vec4 uShadowColor;
            uniform vec4 uWavesColor;

            void main() {
              vec4 windward = texture(sDust, vUpwindTexCoord);
              vec4 leeward2 = texture(sDust, vLeewardTexCoord2);
              vec4 detailColor = texture(sDetail1, vDetailCoord1);
              float detail1 = detailColor.g - 0.5;
              float detail2 = detailColor.r - 0.5;

              detail1 *= vDetailFade;
              detail2 *= vDetailFade;

              vec4 textureData = texture(sTexture, vTextureCoord);
              fragColor = textureData.r * uColor;
              // fragColor.b += vSlopeCoeff; // windward slopes visualization
              // fragColor.g += vSlopeCoeff2; // leeward slopes visualization
              vec4 waves = windward * uDustOpacity * vSlopeCoeff;
              waves += leeward2 * uDustOpacity * vSlopeCoeff2;
              waves *= 1.0 - clamp(texture(sDust, vWindSpotsTexCoord).r * 5.0, 0.0, 1.0);
              fragColor += waves * uWavesColor;
              fragColor.rgb += mix(detail2, detail1, vSlopeCoeff2);
              fragColor *= mix(uShadowColor, vec4(1.0, 1.0, 1.0, 1.0), textureData[${DunesPlsShader.lightmapIndexPls}]);
              fragColor = mix(fragColor, uFogColor, vFogAmount);
              // fragColor.r = vDetailFade; // detail distance visualization
              // fragColor.r = texture(sDust, vWindSpotsTexCoord).r; // wind terrain spots visualization

            //   pixelLocalStoreANGLE(pls, vec4(gl_FragCoord.z));
              pixelLocalStoreANGLE(pls, vec4(1.,1.,1.,1.));
            //   fragColor *= 0.00001;
            //   fragColor += vec4(gl_FragCoord.z);
            }`;
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();
    }
}
