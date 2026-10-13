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
    print("      [--spec <材质规格.json> --model-key <器件>/<名字>]  # 带这两项才应用预制体覆写层")
    sys.exit(2)

# 选项先摘出来，剩下的位置参数才是贴图搜索目录（不传 --spec 时行为与以前完全一致）
spec_path = None
model_key = None
positional = []
index = 0
while index < len(argv):
    if argv[index] == "--spec" and index + 1 < len(argv):
        spec_path = argv[index + 1]
        index += 2
    elif argv[index] == "--model-key" and index + 1 < len(argv):
        model_key = argv[index + 1]
        index += 2
    else:
        positional.append(argv[index])
        index += 1

fbx_path, out_path = positional[0], positional[1]
texture_dirs = positional[2:] or [os.path.dirname(fbx_path)]
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
# 4b. 预制体覆写层：**哪个 mesh 用哪个材质**（这一层只在预制体里，按 FBX 转必丢）
# --------------------------------------------------------------------------
# 规律（`docs/DECISIONS.md` §19.4，从原工程 prefab 数据直接读出）：
#   · 结构件 prefab 的 MeshRenderer 节点名与 **FBX 节点名逐字对应**，给出全量材质分配；
#   · `*_info_model` 用嵌套实例 + `m_Modifications`（按 FBX 内部 fileID）覆写其中几个，是**子集**。
# 所以规格里 `devices[<器件>].prefabOverrides` 就是"末段名 → 材质名"。
overrides_applied = {"applied": 0, "missing": [], "materials": [], "created": []}

if spec_path and model_key:
    with open(spec_path, "r", encoding="utf-8") as handle:
        spec = json.load(handle)
    device_key, _, stem = model_key.partition("/")
    device_entry = spec.get("devices", {}).get(device_key, {})
    mapping = device_entry.get("prefabOverrides", {})
    materials_spec = spec.get("materials", {})

    def object_by_node(name):
        """按节点名找对象（Blender 对重名会加 `.001` 后缀，所以退化到前缀匹配）。"""
        if name in bpy.data.objects:
            return bpy.data.objects[name]
        for obj in bpy.data.objects:
            if obj.name.split(".")[0] == name:
                return obj
        return None

    # ⚠️ 同名覆写材质**只建一次**并复用：`material.copy()` 会自动改名成 `X.001`/`X.002`，
    # 而渲染期是按**材质名**对规格的 —— 名字带后缀就会全部落空（实测踩过）。
    override_cache = {}

    def override_material(target, name):
        """覆写材质：能克隆就克隆（外观与主干一致，身份正确），`Alpha` 这类自己造。"""
        if name in override_cache:
            return override_cache[name], False
        entry = materials_spec.get(name, {})
        source = target.material_slots[0].material if len(target.material_slots) else None
        base_color = entry.get("baseColor") or [1, 1, 1, 1]
        has_base_texture = bool(entry.get("textures", {}).get("baseColor"))
        if source is not None and has_base_texture:
            clone = source.copy()
            clone.name = name
            override_cache[name] = clone
            return clone, False
        # 没有基色贴图的（如 `Alpha`：无贴图 + 基色 α=0 ⇒ 原工程里就是"看不见"）
        material = bpy.data.materials.new(name)
        material.use_nodes = True
        bsdf = first_principled(material)
        bsdf.inputs["Base Color"].default_value = (base_color[0], base_color[1], base_color[2], 1.0)
        bsdf.inputs["Alpha"].default_value = base_color[3]
        bsdf.inputs["Metallic"].default_value = (entry.get("scalars") or {}).get("metallic", 0.0)
        bsdf.inputs["Roughness"].default_value = 1.0 - (entry.get("scalars") or {}).get("smoothness", 0.5)
        if entry.get("surfaceMode") == "MASK":
            material.blend_method = "CLIP"
            material.alpha_threshold = entry.get("alphaCutoff", 0.5)
        elif entry.get("surfaceMode") == "BLEND":
            material.blend_method = "BLEND"
        override_cache[name] = material
        return material, True

    for node_name, names in mapping.items():
        target = object_by_node(node_name)
        if target is None:
            overrides_applied["missing"].append(node_name)
            continue
        for slot_index, material_name in enumerate(names):
            if slot_index >= len(target.material_slots):
                continue
            current = target.material_slots[slot_index].material
            if current is not None and current.name == material_name:
                continue
            material, created = override_material(target, material_name)
            target.material_slots[slot_index].material = material
            overrides_applied["applied"] += 1
            overrides_applied["materials"].append(f"{node_name}[{slot_index}]={material_name}")
            if created:
                overrides_applied["created"].append(material_name)

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
    # 预制体覆写层：applied=真正换掉的材质槽数；missing=prefab 里有但 FBX 里没有的节点（如内置 Cube 触点）
    "overrides": overrides_applied,
}
print("WSU3_GLB_SUMMARY " + json.dumps(summary, ensure_ascii=False))
