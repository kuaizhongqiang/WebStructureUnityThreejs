/**
 * ESLint 平铺配置（DEC-52 / DEC-76）。
 *
 * 口径：
 *   · 三条基线：`js.configs.recommended` + `typescript-eslint.recommended` + `vue.flat/recommended`；
 *   · 末尾接 `eslint-config-prettier` —— 关掉所有与 Prettier 打架的格式规则，
 *     避免"lint 与格式化互相改对方"这种最常见的团队摩擦。
 *   · **不启用需要类型信息**的规则（`projectService` / `parserOptions.project`）：
 *     那会让 lint 明显变慢。类型问题交给 `npm run typecheck`（vue-tsc）把关，分工更清晰。
 *   · 不用 `--max-warnings 0`：`no-console` 这类是提醒，不该卡提交；
 *     真正的错误（未定义变量、Vue 规则、解析错误）才会失败。
 */
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', 'tools/smoke/artifacts/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: {
      // 单文件组件名允许单词（AppShell / StartView 之类已足够清晰）
      'vue/multi-word-component-names': 'off',
      // 模板排版交给 Prettier，不让 lint 强制重排
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      // 项目口径
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // .vue 里的 `<script setup lang="ts">` 要先交给 vue-eslint-parser，再转发给 TS 解析器
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    // 冒烟脚本：文件本身跑在 Node，但 `page.evaluate()` 的回调在浏览器里求值，
    // 所以两种全局都要声明（否则 document / window 会被误报为未定义）。
    files: ['tools/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
)
