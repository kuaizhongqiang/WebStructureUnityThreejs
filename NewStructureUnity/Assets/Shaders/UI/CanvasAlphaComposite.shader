// 结构站画布透明：合成用的 UI shader（DEC-151 / DEC-153，方案见 docs/design/13）
//
// 做什么：把「颜色路」与「alpha 路」两张图合到一起 ——
//   · RGB 取颜色路（主相机渲染的 RT）；
//   · A   取 alpha 路（alpha 相机渲染的 RT，它不走后处理，所以 alpha 是干净的）。
//
// 取样结构与参照工程（`ColorAlphaUIShader`）一致：`_ColorTex` 取 RGB、`_AlphaTex` 取 A、UV 走 `TRANSFORM_TEX`。
//
// 混合方式**故意与参照工程不同**（2026-10-15 有实测依据，别改回去）：
//   · 参照工程用 `Blend SrcAlpha OneMinusSrcAlpha` + 非预乘输出，背景处 `a=0` 等于"**什么都不写**"，
//     因此它**依赖显示端一开始是透明黑**；
//   · 实测我们的显示端保不住这个透明黑（清屏相机的 alpha=0 到不了画布），于是背景保留 backbuffer 的不透明黑；
//   · 所以这里改成 **覆盖式**：`Blend One Zero` + **预乘**输出 `(rgb*a, a)` ——
//     背景由我们自己写 `(0,0,0,0)`，**不看显示端的脸色**；
//     而"预乘"正是网页 `premultipliedAlpha: true` 要的形态。
//   （alpha 源本身已实测正确：诊断模式下 95% 背景 a≈0、5% 模型轮廓 a≈1。）
//
// 用法（2026-10-15 口径）：**接线全部在场景里手工挂好，代码不再动材质/贴图/RawImage** ——
//   · 两张 RT（颜色路 / alpha 路）作为资产，直接引用到材质的 `_ColorTex` / `_AlphaTex` 槽；
//   · 材质挂在合成 RawImage 上；`RawImage.texture` 会被喂给 `_MainTex`（本 shader 不用它）。

Shader "WSU3/UI/CanvasAlphaComposite"
{
    Properties
    {
        _ColorTex ("Color Source (RGB)", 2D) = "white" {}
        _AlphaTex ("Alpha Source (A)", 2D) = "white" {}
        [PerRendererData] _MainTex ("RawImage Texture (unused)", 2D) = "white" {}

        // 兜底系数：alpha 路异常时可以把整体透明度压下来（默认 1，不压）
        _AlphaScale ("Alpha Scale", Range(0, 1)) = 1
        // 诊断开关（URL 上带 wsu3_alphaDebug=1 时由代码置 1）：
        // 把 alpha 直接画成颜色 —— 绿=透(a≈0)、红=不透(a≈1)，并强制不透明输出，
        // 于是**不受网页合成影响**，可以直接判读"alpha 到底在哪一段丢的"。
        _AlphaDebug ("Alpha Debug (0=off)", Range(0, 1)) = 0

        // —— 与内置 UI/Default 同形的常规属性位（顶点色 / 遮罩 / 剔除）——
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
        // 覆盖式：背景由我们写 (0,0,0,0)，不依赖显示端是否被清成透明（理由见文件头）
        Blend One Zero
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
                // 两张图都按同一套 UV 采样（两张 RT 同尺寸、同机位，所以逐像素对齐）
                half3 color = tex2D(_ColorTex, i.texcoord).rgb;
                half alpha = tex2D(_AlphaTex, i.texcoord).a * _AlphaScale;

                // 最终输出：颜色路的 RGB + alpha 路的 A（与参照工程同一句）
                fixed4 finalColor = fixed4(color, alpha);
                finalColor *= i.color;

                #ifdef UNITY_UI_CLIP_RECT
                finalColor.a *= UnityGet2DClipping(i.worldPosition.xy, _ClipRect);
                #endif

                #ifdef UNITY_UI_ALPHACLIP
                clip(finalColor.a - 0.001);
                #endif

                // 诊断模式：把 alpha 画成颜色（绿=透、红=不透），强制不透明 —— 直接看"alpha 在哪丢的"
                if (_AlphaDebug > 0.5)
                {
                    return fixed4(finalColor.a, 1.0 - finalColor.a, 0.0, 1.0);
                }

                // 输出**预乘**颜色（背景 ⇒ (0,0,0,0)，网页按 premultipliedAlpha 合成时可透出去）
                finalColor.rgb *= finalColor.a;
                return finalColor;
            }
            ENDCG
        }
    }

    Fallback Off
}
