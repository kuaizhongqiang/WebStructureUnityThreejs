/**
 * 目录指纹单测（node 内置 test runner：`node --test tools/pipeline/lib/`）。
 *
 * 为什么值得锁：这个指纹是"重建后浏览器还跑上一版"这个坑的唯一防线（见 `docs/design/06` §3②）。
 * 它一旦退化成"同一份内容给出两个值"或"内容变了值不变"，表现都是**页面静默用旧包**，
 * 而不是报错 —— 所以把这几条边界钉在测试里，比事后去浏览器里翻 IndexedDB 便宜得多。
 */
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { treeSha256 } from "./tree-hash.mjs";

const HEX64 = /^[0-9a-f]{64}$/;

/** 每个用例一份独立目录，互不干扰（并行跑也不会撞）。 */
let root = "";

before(async () => {
  root = await mkdtemp(join(tmpdir(), "wsu3-tree-hash-"));
});

after(async () => {
  // 临时目录不留垃圾（Windows 上 mkdtemp 落在 %TEMP% 下，不会污染仓库）
  await rm(root, { recursive: true, force: true });
});

/** 造一棵小树，返回树根与"相对路径清单"（用 `/` 分隔，与本模块口径一致）。 */
async function makeTree(name, entries) {
  const dir = join(root, name);
  for (const [relative, content] of Object.entries(entries)) {
    const full = join(dir, relative);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return { dir, files: Object.keys(entries) };
}

describe("treeSha256：确定性与形状", () => {
  it("同一份内容算两次得到同一个值", async () => {
    const { dir, files } = await makeTree("stable", {
      "index.html": "<html></html>",
      "Build/main.data": "DATA-1",
      "Build/main.wasm": "WASM-1",
    });
    const first = await treeSha256(dir, files);
    const second = await treeSha256(dir, files);
    assert.equal(first, second);
    assert.match(first, HEX64);
  });

  it("files 的传入顺序不影响结果（按内容算，不按数组下标算）", async () => {
    const { dir, files } = await makeTree("order", {
      "Build/main.data": "DATA-1",
      "Build/main.wasm": "WASM-1",
      "StreamingAssets/font.bin": "FONT",
    });
    const ascending = await treeSha256(dir, [...files].sort());
    const shuffled = await treeSha256(dir, [...files].reverse());
    assert.equal(ascending, shuffled);
  });

  it("空 files 也返回稳定值，不抛", async () => {
    const value = await treeSha256(root, []);
    assert.match(value, HEX64);
    assert.equal(value, await treeSha256(root, []));
  });
});

describe('treeSha256：内容一变值就变（这正是"重建后应换 URL"的判据）', () => {
  it("改一个字节 ⇒ 值变", async () => {
    const { dir, files } = await makeTree("edit", {
      "Build/main.data": "AAAA",
    });
    const before = await treeSha256(dir, files);
    await writeFile(join(dir, "Build/main.data"), "AAAB");
    assert.notEqual(await treeSha256(dir, files), before);
  });

  it("文件字节数不变、只换内容 ⇒ 值仍然变（不能只看大小）", async () => {
    const { dir, files } = await makeTree("same-size", {
      "Build/main.data": "AAAA",
    });
    const before = await treeSha256(dir, files);
    await writeFile(join(dir, "Build/main.data"), "BBBB");
    assert.notEqual(await treeSha256(dir, files), before);
  });

  it("多一个文件（files 清单变）⇒ 值变", async () => {
    const { dir, files } = await makeTree("add-file", {
      "Build/main.data": "DATA-1",
    });
    const before = await treeSha256(dir, files);
    await writeFile(join(dir, "Build/main.framework.js"), "FW");
    const after = await treeSha256(dir, [...files, "Build/main.framework.js"]);
    assert.notEqual(after, before);
  });

  it("路径参与指纹：只换路径不换内容 ⇒ 值变（路径与内容一起定身份）", async () => {
    const { dir, files } = await makeTree("swap-path", {
      "Build/a.data": "SAME",
      "Build/b.data": "SAME",
    });
    const before = await treeSha256(dir, files);
    const swapped = await treeSha256(dir, ["Build/b.data", "Build/a.data"]);
    // 两个文件内容相同、只是"谁在哪条路径"不同：单文件哈希一致，靠路径进哈希才能区分
    assert.equal(swapped, before);
    await rm(join(dir, "Build/a.data"));
    await writeFile(join(dir, "Build/c.data"), "SAME");
    assert.notEqual(
      await treeSha256(dir, ["Build/c.data", "Build/b.data"]),
      before,
    );
  });
});

describe("treeSha256：与暂存清单里的逐文件 sha256 同源", () => {
  it("注入的 readFileImpl 能读到真实文件（默认实现不是唯一路径）", async () => {
    const { dir, files } = await makeTree("injected", {
      "Build/main.data": "DATA-1",
    });
    const seen = [];
    const value = await treeSha256(dir, files, async (file) => {
      seen.push(file);
      return readFile(file);
    });
    assert.equal(seen.length, files.length);
    assert.equal(value, await treeSha256(dir, files));
  });

  it("打包链（pack.mjs）的逐字口径与本模块同值 —— 防两处各算一份而悄悄漂开", async () => {
    const { dir, files } = await makeTree("pack-parity", {
      "index.html": "<html></html>",
      "Build/main.data": "DATA-1",
      "Build/main.wasm": "WASM-1",
    });
    // 与 `tools/pipeline/pack.mjs` 的 `treeHash` 逐行等价（不改 pack，改成一样是为了让"漂开"在 CI 上炸）。
    // 将来若把 pack 也切到本模块，这个用例就是那次重构的验收。
    const packStyle = async (root, list) => {
      const hash = createHash("sha256");
      for (const file of [...list].sort()) {
        const content = await readFile(join(root, file));
        hash.update(file);
        hash.update(createHash("sha256").update(content).digest("hex"));
      }
      return hash.digest("hex");
    };
    assert.equal(await treeSha256(dir, files), await packStyle(dir, files));
  });
});
