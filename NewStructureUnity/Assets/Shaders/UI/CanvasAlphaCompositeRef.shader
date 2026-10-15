// 结构站画布透明：**参照工程 `ColorAlphaUIShader` 的原样复刻**（负责人 2026-10-15 点名要的这一版）。
//
// 与主用 shader（`WSU3/UI/CanvasAlphaComposite`）的唯一差别在混合与输出形态：
//   · 本 shader：`Blend SrcAlpha OneMinusSrcAlpha` + **非预乘**输出 `(color.rgb, alpha.a)`；
//     背景处 `alpha=0` 等于"**什么都不写**" ⇒ 背景像素取决于**显示端本来是什么**。
//   · 主用 shader：`Blend One Zero` + **预乘**输出；背景由它自己写 `(0,0,0,0)`，不看显示端脸色。
//
// ⚠️ 已知代价（2026-10-15 实测）：本工程两台相机都渲染到 RT、没有相机渲染到屏幕，
//    显示端**保不住**透明黑 ⇒ 用本 shader 时网页上背景是黑块。要切到它请先确认显示端问题已解决。
//    切法：把合成 RawImage 上材质的 shader 换成 `WSU3/UI/CanvasAlphaCompositeRef` 即可（材质/贴图都在场景里手工挂）。

Shader "WSU3/UI/CanvasAlphaCompositeRef"
{
    Properties
    {
        _ColorTex ("Color Source (RGB)", 2D) = "white" {}
        _AlphaTex ("Alpha Source (A)", 2D) = "white" {}
        [PerRendererData] _MainTex ("RawImage Texture (unused)", 2D) = "white" {}

        _AlphaScale ("Alpha Scale", Range(0, 1)) = 1
        _AlphaDebug ("Alpha Debug (0=off)", Range(0, 1)) = 0

        _Color ("Tint", Color) = (1,1,1,1)
        _StencilComp ("Stencil Comparison", Float) = 8
        _Stencil ("Stencil ID", Float) = 0
        _StencilOp ("Stencil Operation", Float) = 0
        _StencilWriteMask ("Stencil Write Mask", Float) = 255
        _StencilReadMask ("Stencil Read Mask", Float) = 255
        _ColorMask ("Color Mask", Float) = 15
        [Toggle(UNITY_UI_ALPHACLIP)] _UseUIAlphaClip ("Use Alpha Clip", Float) = 0
    }

    SubShader
    {
        Tags
        {
            "Queue" = "Transparent"
            "IgnoreProjector" = "True"
            "RenderType" = "Transparent"
            "PreviewType" = "Plane"
            "CanUseSpriteAtlas" = "True"
        }

        Stencil
        {
            Ref [_Stencil]
            Comp [_StencilComp]
            Pass [_StencilOp]
            ReadMask [_StencilReadMask]
            WriteMask [_StencilWriteMask]
        }

        Cull Off
        Lighting Off
        ZWrite Off
        ZTest [unity_GUIZTestMode]
        Blend SrcAlpha OneMinusSrcAlpha
        ColorMask [_ColorMask]

        Pass
        {
            Name "Default"

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 2.0

            #include "UnityCG.cginc"
            #include "UnityUI.cginc"

            #pragma multi_compile_local _ UNITY_UI_CLIP_RECT
            #pragma multi_compile_local _ UNITY_UI_ALPHACLIP

            struct appdata_t
            {
                float4 vertex : POSITION;
                float4 color : COLOR;
                float2 texcoord : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f
            {
                float4 vertex : SV_POSITION;
                fixed4 color : COLOR;
                float2 texcoord : TEXCOORD0;
                float4 worldPosition : TEXCOORD1;
                UNITY_VERTEX_OUTPUT_STEREO
            };

            sampler2D _ColorTex;
            float4 _ColorTex_ST;
            sampler2D _AlphaTex;
            sampler2D _MainTex;

            fixed4 _Color;
            float4 _ClipRect;
            float _AlphaScale;
            float _AlphaDebug;
            float _UseUIAlphaClip;

            v2f vert(appdata_t v)
            {
                v2f o;
                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);
                o.worldPosition = v.vertex;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.texcoord = TRANSFORM_TEX(v.texcoord, _ColorTex);
                o.color = v.color * _Color;
                return o;
            }

            fixed4 frag(v2f i) : SV_Target
            {
                half3 color = tex2D(_ColorTex, i.texcoord).rgb;
                half alpha = tex2D(_AlphaTex, i.texcoord).a * _AlphaScale;

                fixed4 finalColor = fixed4(color, alpha);
                finalColor *= i.color;

                #ifdef UNITY_UI_CLIP_RECT
                finalColor.a *= UnityGet2DClipping(i.worldPosition.xy, _ClipRect);
                #endif

                #ifdef UNITY_UI_ALPHACLIP
                clip(finalColor.a - 0.001);
                #endif

                if (_AlphaDebug > 0.5)
                {
                    return fixed4(finalColor.a, 1.0 - finalColor.a, 0.0, 1.0);
                }

                return finalColor;
            }
            ENDCG
        }
    }

    Fallback Off
}
