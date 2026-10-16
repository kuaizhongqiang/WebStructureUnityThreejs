#!/usr/bin/env node
/**
 * 目录指纹（整棵产物的内容指纹）—— 流水线上**唯一**的一份实现。
 *
 * ① 指纹是谁的：`dir` 目录下 `files` 这批文件的**内容**。算法逐文件
 *    `hash.update(相对路径)` + `hash.update(单文件内容的 sha256)`，路径按字典序排序后依次喂进去，
 *    最后取整棵的 digest('hex')。
 * ② 为什么必须是确定性的：同一个产物会在**三处**被复算 —— 暂存脚本写清单、打包脚本写发布清单、
 *    dev 服务器合成发布清单时的兜底。三处只要算法差一点，"同一份产物"就会得到两个指纹，
 *    而指纹唯一的用途就是"这份产物是不是同一份"（以及给资源 URL 换一个查询串）。
 *    因此这里**不接受**任何带时间戳 / 机器名的输入，也不依赖 `files` 的传入顺序。
 * ③ 谁在用：`tools/pipeline/unity-stage.mjs`（写 `unity/builds/manifest.json` 的 `treeSha256`）、
 *    `tools/pipeline/pack.mjs`（写 `release-manifest.json` 的 `unity.builds[].treeSha256`）、
 *    `web/src/unity/release-manifest.ts`（dev 侧"清单里的指纹不新鲜就现算"那条兜底）。
 *
 * ⚠️ 改动这里的算法 = 让**所有已发布的包**与新产物指纹不一致，属破坏性变更：要改先在
 *    `docs/design/05-unity-packaging-pipeline.md` 写明口径，再同批改三处调用方。
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * 算一棵文件树的内容指纹。
 *
 * @param {string} dir 树根目录（绝对路径或相对当前工作目录）
 * @param {readonly string[]} files 树内的**相对**路径（用 `/` 分隔；顺序不敏感，内部会排序）
 * @param {(file: string) => Promise<Buffer|Uint8Array|string>} [readFileImpl] 读文件的实现，默认 `node:fs/promises` 的 `readFile`（测试可注入）
 * @returns {Promise<string>} 64 位小写 hex
 */
export async function treeSha256(dir, files, readFileImpl = readFile) {
  const hash = createHash("sha256");
  for (const file of [...files].sort()) {
    const content = await readFileImpl(join(dir, file));
    hash.update(file);
    hash.update(createHash("sha256").update(content).digest("hex"));
  }
  return hash.digest("hex");
}
