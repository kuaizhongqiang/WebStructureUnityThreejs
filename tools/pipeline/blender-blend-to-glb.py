# -*- coding: utf-8 -*-
"""从 .blend 中间内容仓导出 GLB（负责人在 Blender 里手工调完之后的那一份）。

为什么单独一个脚本：`blender-fbx-to-glb.py` 每次都**从 FBX 重新导入**，会把负责人在 Blender 里的
手工调整整个覆盖掉。所以"手工调整过的资产"必须从**已保存的 .blend** 走 —— 本脚本只做三件事：
打开、导出、记账。

用法：
    blender --background --python blender-blend-to-glb.py -- <输入.blend> <输出.glb>

与"一条龙"路径的一致性：导出参数与 `blender-fbx-to-glb.py` 第 5 段**逐字相同**
（GLB / export_apply / export_yup / AUTO / 不按选择导出）。否则中间仓导出与一条龙导出会产出两种
不同的东西，两边的对比就失去意义了。

最后一行 stdout 是 JSON 摘要（与一条龙路径同一种形状，多两个字段）：
    · `materialDetail`：每个材质**实际接的贴图文件名**（"贴图接没接上"的真相，手工改完最该看这个）；
    · `materialUsage`：材质 → 被几个槽用到。
"""

import json
import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(argv) < 2:
    print("用法：blender --background --python blender-blend-to-glb.py -- <输入.blend> <输出.glb>")
    sys.exit(2)

blend_path, out_path = argv[0], argv[1]

warnings = []
MASK_REASON = (
    "HDRP mask map（R=金属度/G=AO/A=光泽度）与 glTF（occlusion 读 R、roughness 读 G）通道语义不符"
)

bpy.ops.wm.open_mainfile(filepath=blend_path)

# --------------------------------------------------------------------------
# 按规格烘"表面模式"：中间仓里存的是**内容**（网格 + 材质 + 贴图接线），
# 而"这个材质该怎么用"（MASK 裁剪 / BLEND 半透 / 双面）是**规格**里的事（源工程 .mat 的真值）。
# 放在导出这一层做有两个好处：① 不回头改负责人的 .blend（他的调整不会被覆盖）；
# ② 无论 .blend 是哪一版生成的，导出结果都一致。
# --------------------------------------------------------------------------
spec_materials = {}
spec_path = None
index = 2
while index < len(argv):
    if argv[index] == "--spec" and index + 1 < len(argv):
        spec_path = argv[index + 1]
        index += 2
    else:
        index += 1
if spec_path:
    try:
        with open(spec_path, encoding="utf-8") as handle:
            spec_materials = json.load(handle).get("materials") or {}
    except (OSError, ValueError) as error:
        warnings.append(f"材质规格读不出来（{error}）—— 表面模式退回 .blend 里的设置")


def first_principled(material):
    if not material.use_nodes:
        return None
    for node in material.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            return node
    return None


def apply_surface_modes():
    """
    · MASK → `blend_method='CLIP'` + `alpha_threshold` ⇒ glTF `alphaMode: MASK` + `alphaCutoff`
    · BLEND → `'BLEND'` ⇒ glTF `alphaMode: BLEND`（半透明）

    Alpha 必须**接线**（贴图的 Alpha → BSDF 的 Alpha）：只设 CLIP 而不接 alpha，贴图的透明区
    裁不出来（贴花会是一整块）；只设 BLEND 而不接 alpha，也只是整块均匀半透。
    负责人手工做的正是这件事，这里按规格自动做，免得每换一版 .blend 都要靠人记得。
    """
    applied = []
    for material in bpy.data.materials:
        entry = spec_materials.get(material.name)
        if not entry:
            continue
        mode = entry.get("surfaceMode")
        bsdf = first_principled(material)
        if mode in ("MASK", "BLEND") and bsdf is not None:
            alpha = bsdf.inputs.get("Alpha")
            if alpha is not None and not alpha.is_linked:
                base = bsdf.inputs.get("Base Color")
                source = base.links[0].from_node if base is not None and base.is_linked else None
                if source is not None and source.type == "TEX_IMAGE":
                    material.node_tree.links.new(source.outputs["Alpha"], alpha)
                else:
                    alpha.default_value = (entry.get("baseColor") or [1, 1, 1, 1])[3]
        if mode == "MASK":
            material.blend_method = "CLIP"
            material.alpha_threshold = float(entry.get("alphaCutoff") or 0.5)
        elif mode == "BLEND":
            material.blend_method = "BLEND"
        elif mode == "OPAQUE":
            # 显式置回不透明，并把 Alpha 常量摆到 1：源工程有材质写着 BLEND（`CombinationSwitch2`
            # = 白 0.6），但负责人定过"这一片是实心白件"（见 content/material-overrides.json）。
            material.blend_method = "OPAQUE"
            if bsdf is not None:
                alpha = bsdf.inputs.get("Alpha")
                if alpha is not None and not alpha.is_linked:
                    alpha.default_value = 1.0
        applied.append(
            {"name": material.name, "surfaceMode": mode, "blend": material.blend_method}
        )
    return applied


surface_modes = apply_surface_modes()


def strip_vertex_colors():
    """
    丢掉顶点色（`COLOR_0`）。

    为什么必须丢：FBX 里有些网格带顶点色且**整片是 (0,0,0,0)**（实测 `SpeedRelay01` / `SpeedRelay04`）。
    源工程的 Shader 不读顶点色，所以 Unity 里看不出来；但 glTF 的 `COLOR_0` 会被**乘进基色** ——
    这两块于是在 three 里**全黑**。glTF 没有"声明本材质不用顶点色"的开关（顶点色是网格属性），
    只能干脆不导出这一层属性。
    """
    removed = []
    for mesh in bpy.data.meshes:
        attributes = getattr(mesh, "color_attributes", None)
        if attributes is None:
            attributes = getattr(mesh, "vertex_colors", [])
        for attribute in list(attributes):
            name = getattr(attribute, "name", "?")
            attributes.remove(attribute)
            removed.append(f"{mesh.name}.{name}")
    return removed


stripped_vertex_colors = strip_vertex_colors()


def strip_textures():
    """
    **GLB 只出网格 + 材质，不出贴图**（负责人 2026-10-13 定的口径）。

    理由：贴图正是要反复调的东西，烘进 GLB 就意味着"改一张图 = 重导 8 个模型"；而且 mask 是
    HDRP 通道语义（R=Metallic / G=AO / A=Smoothness），glTF 表达不了，最终**还是要**在渲染期重排 ——
    那就别烘。所以：材质里的贴图节点全部摘掉、保留材质名与方法，贴图交给渲染期按
    `content/asset-material-textures.json` 查找表加载（见 docs/model-preview/src/materials.mjs）。

    摘掉后把规格里的基色/α 写回 BSDF：这样 GLB 里的 `baseColorFactor` 仍是有意义的常量
    （而不是"贴图没了就变成默认灰"）。
    """
    removed = []
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        nodes = material.node_tree.nodes
        for node in [item for item in nodes if item.type in {"TEX_IMAGE", "NORMAL_MAP"}]:
            # 先把名字取出来：`nodes.remove()` 之后这个 RNA 就失效了，再读 .name 会抛
            # "StructRNA of type ShaderNodeTexImage has been removed"（踩过）
            label = f"{material.name}.{node.name}"
            nodes.remove(node)
            removed.append(label)
        entry = spec_materials.get(material.name)
        bsdf = first_principled(material)
        if entry is not None and bsdf is not None:
            # ⚠️ 基色**置白**（不是写规格里的 `baseColor`）：`baseColorFactor` 是贴图的**乘数**，
            # 写 0.79 会把后加载的贴图整体压暗 —— 而"贴图还没进来"的时候（一个纯 GLB 查看器）
            # 白 × 无贴图 也比灰 × 无贴图更接近原意。染色交给渲染期（`White.png` 那类）。
            bsdf.inputs["Base Color"].default_value = (1.0, 1.0, 1.0, 1.0)
            base = entry.get("baseColor") or [1, 1, 1, 1]
            alpha = bsdf.inputs.get("Alpha")
            if alpha is not None:
                # α 例外：BLEND 材质（玻璃 / 白色件）的 α 必须带出去，否则 GLB 里的
                # `baseColorFactor.a` 会是 1，玻璃变实心（贴图后加载没有 α 可兜底）
                alpha.default_value = base[3] if entry.get("surfaceMode") == "BLEND" else 1.0
    return removed


stripped_textures = strip_textures()

os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format="GLB",
    export_apply=True,
    export_yup=True,
    export_image_format="AUTO",
    use_selection=False,
)


def image_of(socket):
    """socket 背后的图片文件名（允许中间夹一层法线贴图节点）。"""
    if not socket.is_linked:
        return None
    node = socket.links[0].from_node
    if node.type == "NORMAL_MAP" and node.inputs["Color"].is_linked:
        node = node.inputs["Color"].links[0].from_node
    if node.type == "TEX_IMAGE" and node.image is not None:
        return os.path.basename(node.image.filepath or node.image.name)
    return None


def slots_of(material):
    """
    材质 → 它**该用**哪几张贴图（来自规格，不是来自 .blend 的节点树）。

    为什么改成读规格：GLB 现在只出 mesh + mat，导出前贴图节点已被摘掉（`strip_textures`），
    从节点树读只会读到空。规格才是"这个材质后加载时要取哪三张图"的真值
    （`content/asset-material-textures.json` 的查找表也是按它生成的）。
    """
    entry = spec_materials.get(material.name) if material is not None else None
    if not entry:
        return {}
    return {
        slot: base
        for slot, base in (entry.get("textures") or {}).items()
        if base and slot != "cube"
    }


used = {}
hooks = {}
triangles = 0
mesh_count = 0
for obj in bpy.data.objects:
    if obj.type != "MESH":
        continue
    mesh_count += 1
    obj.data.calc_loop_triangles()
    triangles += len(obj.data.loop_triangles)
    for slot in obj.material_slots:
        material = slot.material
        if material is None:
            continue
        used[material.name] = used.get(material.name, 0) + 1
        hooks.setdefault(material.name, slots_of(material))

hooked = {"baseColor": 0, "normal": 0}
for slots in hooks.values():
    # 与一条龙路径同口径：**按材质计**（不是按槽计），否则报告里两个数字没法对比
    if "Base Color" in slots:
        hooked["baseColor"] += 1
    if "Normal" in slots:
        hooked["normal"] += 1

wired = {name for slots in hooks.values() for name in slots.values()}
unmapped = []
for image in bpy.data.images:
    name = os.path.basename(image.filepath or image.name)
    if "_M_AO_G" in name and name not in wired:
        unmapped.append({"file": name, "reason": MASK_REASON})

summary = {
    "fbx": None,
    # 中间内容仓**就是**这份 GLB 的来源 —— 出问题要能一眼指回哪个 .blend
    "blend": blend_path,
    "glb": out_path,
    "bytes": os.path.getsize(out_path) if os.path.exists(out_path) else 0,
    "objects": len(bpy.data.objects),
    "meshes": mesh_count,
    "materials": len(used),
    "images": sorted(
        {os.path.basename(image.filepath or image.name) for image in bpy.data.images}
    ),
    "triangles": triangles,
    "hooked": hooked,
    "unmapped": unmapped,
    "warnings": warnings,
    # 覆写层是转换期的事；中间仓里已经"落成"普通材质槽，所以这里无意义（留字段保持形状一致）
    "overrides": None,
    "surfaceModes": surface_modes,
    # 丢掉的全零顶点色（见 strip_vertex_colors 的说明：不丢会在 three 里发黑）
    "strippedVertexColors": stripped_vertex_colors,
    # 摘掉的贴图节点（GLB 只出 mesh + mat，贴图全部后加载）
    "strippedTextures": stripped_textures,
    "materialDetail": [
        {
            "name": material.name,
            "blend": getattr(material, "blend_method", None),
            "alphaThreshold": getattr(material, "alpha_threshold", None),
            "slots": hooks.get(material.name, {}),
        }
        for material in bpy.data.materials
        if material.name in used
    ],
    "materialUsage": used,
}
print("WSU3_GLB_SUMMARY " + json.dumps(summary, ensure_ascii=False))
