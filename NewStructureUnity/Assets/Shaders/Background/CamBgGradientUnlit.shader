// 相机背景板：UV 空间径向渐变（不透明、无光照）。
//
// 与 `CameraBg` 的配合方式：板子是主相机的子物体，`CameraBg` 按 FOV / 宽高比把它缩放到
// "刚好铺满视锥截面"，因此这里的 UV 就是屏幕的横向 / 纵向归一化坐标。
Shader "WSU3/Background/CamBgGradientUnlit"
{
    Properties
    {
        // 注：ShaderLab 的属性显示名与装饰器必须是 ASCII（写成非 ASCII 会报
        //     "Parse error: syntax error, unexpected $undefined"），中文说明只放注释。
        [Header(Radial Gradient)]
        _CenterColor ("Center Color", Color) = (0.11, 0.14, 0.20, 1)
        _EdgeColor ("Edge Color", Color) = (0.02, 0.03, 0.05, 1)
        _GradientStrength ("Gradient Strength", Range(0.02, 8)) = 1.6
    }

    SubShader
    {
        Tags
        {
            "RenderType" = "Opaque"
            "RenderPipeline" = "UniversalPipeline"
            "IgnoreProjector" = "True"
            "Queue" = "Geometry"
        }
        LOD 100

        Pass
        {
            Name "Unlit"
            Tags { "LightMode" = "UniversalForward" }

            // 两面都画：这是块背景板，四边形的法线朝向不参与任何计算，被背面剔除掉只会让人白查半天。
            Cull Off
            ZWrite On
            ZTest LEqual
            Blend Off

            HLSLPROGRAM
            #pragma target 2.0
            #pragma vertex CamBgGradientVertex
            #pragma fragment CamBgGradientFragment

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            CBUFFER_START(UnityPerMaterial)
                half4 _CenterColor;
                half4 _EdgeColor;
                float _GradientStrength;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
            };

            Varyings CamBgGradientVertex(Attributes input)
            {
                Varyings output;
                output.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                output.uv = input.uv;
                return output;
            }

            half4 CamBgGradientFragment(Varyings input) : SV_Target
            {
                // UV 空间里到中心 (0.5, 0.5) 的距离：中心 = 0、四个角 = 1（1 / √0.5 = √2）。
                half fromCenter = saturate(length(input.uv - half2(0.5, 0.5)) * 1.41421356);

                // 渐变强度当幂次用：> 1 中心色占得更多（过渡收在边缘），< 1 边缘色更早铺开。
                half blend = pow(fromCenter, max(_GradientStrength, 0.0001));

                return half4(lerp(_CenterColor.rgb, _EdgeColor.rgb, blend), 1.0);
            }
            ENDHLSL
        }
    }

    FallBack Off
}
