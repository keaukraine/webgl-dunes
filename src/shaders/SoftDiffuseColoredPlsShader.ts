import { FullModel, DiffuseShader } from "webgl-framework";

export class SoftDiffuseColoredPlsShader extends DiffuseShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    sTexture: WebGLUniformLocation | undefined;
    cameraRange: WebGLUniformLocation | undefined;
    sDepth: WebGLUniformLocation | undefined;
    invViewportSize: WebGLUniformLocation | undefined;
    transitionSize: WebGLUniformLocation | undefined;
    color: WebGLUniformLocation | undefined;

    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;

    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;
            uniform mat4 view_proj_matrix;
            in vec4 rm_Vertex;
            in vec2 rm_TexCoord0;
            out vec2 vTextureCoord;

            void main() {
              gl_Position = view_proj_matrix * rm_Vertex;
              vTextureCoord = rm_TexCoord0;
            }`;

        this.fragmentShaderCode = `#version 300 es
            #extension GL_ANGLE_shader_pixel_local_storage : require
            precision highp float;

            uniform vec2 uCameraRange;
            uniform vec2 uInvViewportSize;
            uniform float uTransitionSize;
            float calc_depth(in float z)
            {
              return (2.0 * uCameraRange.x) / (uCameraRange.y + uCameraRange.x - z*(uCameraRange.y - uCameraRange.x));
            }
            uniform sampler2D sDepth;
            in vec2 vTextureCoord;
            uniform sampler2D sTexture;
            uniform vec4 color;

            out vec4 fragColor;

            layout(binding=0, r32f) uniform highp pixelLocalANGLE pls;

            void main() {
               vec4 diffuse = texture(sTexture, vTextureCoord) * color; // particle base diffuse color
            //    diffuse += vec4(0.0, 0.0, 1.0, 1.0); // uncomment to visualize particle shape
               vec2 coords = gl_FragCoord.xy * uInvViewportSize; // calculate depth texture coordinates
               float geometryZ = calc_depth(texture(sDepth, coords).r); // lineriarize particle depth
               float sceneZ = calc_depth(gl_FragCoord.z); // lineriarize scene depth
               float a = clamp(geometryZ - sceneZ, 0.0, 1.0); // linear clamped diff between scene and particle depth
               float b = smoothstep(0.0, uTransitionSize, a); // apply smoothstep to make soft transition
               fragColor = diffuse * b; // final color with soft edge
               fragColor *= pow(1.0 - gl_FragCoord.z, 0.3);

               float z_pls = calc_depth(pixelLocalLoadANGLE(pls).x);
               fragColor.r = z_pls * 3.;

            //    fragColor = vec4(a, a, a, 1.0); // uncomment to visualize raw Z difference
            //    fragColor = vec4(b, b, b, 1.0); // uncomment to visualize blending coefficient
            }`;
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
