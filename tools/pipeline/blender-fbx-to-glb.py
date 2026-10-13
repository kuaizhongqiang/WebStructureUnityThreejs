# -*- coding: utf-8 -*-
"""在 Blender 里把 FBX 转成 GLB（P1-4 步骤 3，驱动脚本 tools/pipeline/fbx-to-glb.mjs）。

用法：
    blender --background --factory-startup --python blender-fbx-to-glb.py -- \
        <输入.fbx> <输出.glb> [贴图搜索目录 ...]

设计要点（都是"踩过才知道"的）：
1. **贴图要自己接**：来源工程的 FBX 是 Unity 导出的，材质引用的是自制 ShaderGraph，
   在 Blender 里既没有节点也不会自动连图。所以导入后按**文件名约定**接三张 PBR 图
   （`*Base Color*` / `*Normal*` / `*M_AO_G*`），并只认"与 FBX 同名的前缀"，避免
   同一目录里两代模型（`ACContactor` / `NewACContactor`）互相串图。
2. **`*M_AO_G*` 不能直连**：Unity/HDRP 的 mask map 是 R=金属度 / G=环境光遮蔽(AO) / A=光泽度，
   而 glTF 的 occlusion 读的是 **R** 通道、roughness 读的是 metallicRoughness 的 **G** 通道 ——
   通道语义对不上。本脚本**不硬塞**（硬塞出来的画面是错的，而且很难查），
   只把它记进摘要的 `unmapped`，金属度/粗糙度用常数兜底。要做对需要离屏重排通道（后续批次）。
3. **轴与缩放交给导出器**：`export_yup=True`（glTF 是 Y-up，Unity 是 Y-up 但 FBX 走的是 Z-up 导出约定），
   `export_apply=True` 把修改器烘进去。
4. 最后一行 stdout 是 **JSON 摘要**，驱动脚本靠它记账（不要在这行前后打印别的东西）。
"""

import glob
import json
import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(argv) < 2:
    print("用法：blender --background --python blender-fbx-to-glb.py -- <in.fbx> <out.glb> [texdir ...]")
    sys.exit(2)

fbx_path, out_path = argv[0], argv[1]
texture_dirs = argv[2:] or [os.path.dirname(fbx_path)]
stem = os.path.splitext(os.path.basename(fbx_path))[0].lower()

warnings = []
unmapped = []

# --------------------------------------------------------------------------
# 1. 干净场景 + 导入
# --------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx_path, use_image_search=True, automatic_bone_orientation=True)

# --------------------------------------------------------------------------
# 1b. 清掉 FBX 带来的贴图节点与图片
# --------------------------------------------------------------------------
# 它们指向**来源工程的绝对路径**（本机恰好存在，换台机器就失效），会让产物取决于"来源工程在不在"，
# 而不是取决于我们搬进来的那份资产。统一清掉，下面从**我们的**贴图目录按文件名重接 —— 结果可复现。
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    for node in list(material.node_tree.nodes):
        if node.type in {"TEX_IMAGE", "NORMAL_MAP"}:
            material.node_tree.nodes.remove(node)
for image in list(bpy.data.images):
    bpy.data.images.remove(image)

# --------------------------------------------------------------------------
# 2. 收集候选贴图：只认"与 FBX 同名前缀"，按通道关键字分类
# --------------------------------------------------------------------------
def classify(path):
    name = os.path.basename(path).lower()
    if not name.startswith(stem):
        return None
    if "base color" in name or name.endswith("_d.png") or "_albedo" in name:
        return "baseColor"
    if "normal" in name:
        return "normal"
    if "ao_g" in name or "_m_ao" in name:
        return "aoGloss"
    return None


candidates = {}
for directory in texture_dirs:
    for path in glob.glob(os.path.join(directory, "*.png")) + glob.glob(os.path.join(directory, "*.jpg")):
        kind = classify(path)
        if kind and kind not in candidates:
            candidates[kind] = path

if not candidates:
    warnings.append("没有找到与模型同名前缀的贴图（模型可能是纯色/无贴图）")

# --------------------------------------------------------------------------
# 3. 补上缺失的图片路径（FBX 里记的是来源工程的绝对路径，本机不存在）
# --------------------------------------------------------------------------
all_files = {}
for directory in texture_dirs:
    for path in glob.glob(os.path.join(directory, "*")):
        all_files[os.path.basename(path).lower()] = path

for image in list(bpy.data.images):
    if image.packed_file is not None:
        continue
    current = bpy.path.abspath(image.filepath) if image.filepath else ""
    if current and os.path.exists(current):
        continue
    replacement = all_files.get(os.path.basename(image.filepath).lower()) if image.filepath else None
    if replacement:
        image.filepath = replacement
        image.reload()
    else:
        warnings.append(f"图片缺失且找不到替代：{image.filepath or image.name}")

# --------------------------------------------------------------------------
# 4. 接材质：只有"没有连图"的材质才动，避免覆盖 FBX 自带的正确连接
# --------------------------------------------------------------------------
hooked = {"baseColor": 0, "normal": 0}
touched = []


def first_principled(material):
    if not material.use_nodes:
        return None
    for node in material.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            return node
    return None


def has_image_input(bsdf, socket_name):
    socket = bsdf.inputs.get(socket_name)
    return bool(socket and socket.is_linked)


for material in bpy.data.materials:
    bsdf = first_principled(material)
    if bsdf is None:
        continue
    touched.append(material.name)

    nodes, links = material.node_tree.nodes, material.node_tree.links

    if "baseColor" in candidates and not has_image_input(bsdf, "Base Color"):
        image = bpy.data.images.load(candidates["baseColor"], check_existing=True)
        texture = nodes.new("ShaderNodeTexImage")
        texture.image = image
        texture.label = "Base Color"
        links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
        hooked["baseColor"] += 1

    if "normal" in candidates and not has_image_input(bsdf, "Normal"):
        image = bpy.data.images.load(candidates["normal"], check_existing=True)
        texture = nodes.new("ShaderNodeTexImage")
        texture.image = image
        texture.label = "Normal"
        texture.image.colorspace_settings.name = "Non-Color"
        normal_map = nodes.new("ShaderNodeNormalMap")
        links.new(texture.outputs["Color"], normal_map.inputs["Color"])
        links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
        hooked["normal"] += 1

    # 金属度/粗糙度：AO_G 的通道语义与 glTF 不符，用常数兜底（见文件头第 2 条）
    if not has_image_input(bsdf, "Metallic"):
        bsdf.inputs["Metallic"].default_value = 0.0
    if not has_image_input(bsdf, "Roughness"):
        bsdf.inputs["Roughness"].default_value = 0.5

if "aoGloss" in candidates:
    unmapped.append(
        {
            "file": os.path.basename(candidates["aoGloss"]),
            "reason": "HDRP mask map（R=金属度/G=AO/A=光泽度）与 glTF（occlusion 读 R、roughness 读 G）通道语义不符",
        }
    )

# --------------------------------------------------------------------------
# 5. 导出 + 摘要
# --------------------------------------------------------------------------
os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format="GLB",
    export_apply=True,
    export_yup=True,
    export_image_format="AUTO",
    use_selection=False,
)

triangles = 0
for mesh in bpy.data.meshes:
    mesh.calc_loop_triangles()
    triangles += len(mesh.loop_triangles)

summary = {
    "fbx": fbx_path,
    "glb": out_path,
    "bytes": os.path.getsize(out_path) if os.path.exists(out_path) else 0,
    "objects": len(bpy.data.objects),
    "meshes": len(bpy.data.meshes),
    "materials": len(touched),
    "images": [os.path.basename(image.filepath or image.name) for image in bpy.data.images],
    "triangles": triangles,
    "hooked": hooked,
    "unmapped": unmapped,
    "warnings": warnings,
}
print("WSU3_GLB_SUMMARY " + json.dumps(summary, ensure_ascii=False))
