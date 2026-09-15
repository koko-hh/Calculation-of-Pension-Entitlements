# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目性质

重庆企业职工基本养老金估算工具，纯前端 React + TypeScript + Vite，无后端、无网络请求。

**硬约束**：用户填写的参保数据只存在于浏览器内存中，刷新即清空。任何改动都不得引入数据上报、持久化（localStorage / cookie）、分析埋点或第三方请求。这不是可选的优化项，是该工具存在的理由（见 `src/App.tsx` 的隐私承诺区块与 `README.md`）。

## 常用命令

README 与 CI 使用 **pnpm**；本机若未配置好 nvm/pnpm，用等价的 **npm** 命令即可，行为一致。

```bash
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build（tsc 仅做类型检查，noEmit）
npm test           # vitest run
```

没有配置 lint 脚本。

运行单个测试：

```bash
npx vitest run src/calculator.test.ts          # 按文件
npx vitest run -t "按年龄取个人账户计发月数"      # 按测试名
```

**dev server 的 URL 带 base 前缀**：`vite.config.ts` 里 `base: '/Calculation-of-Pension-Entitlements/'`（为 GitHub Pages 服务）。因此开发地址是 `http://localhost:5173/Calculation-of-Pension-Entitlements/`，直接访问 `http://localhost:5173/` 会拿不到资源。同理，不要直接用浏览器打开根目录 `index.html`，它是开发入口，必须经 dev server；要离线查看请先 build 再打开 `dist/index.html`。

## 架构

三层，边界清晰：

- **`src/policy.ts`** — 政策参数的唯一来源：计发月数表、当前固定测算参数（计发基数、记账利率）、已核验的年度计发基数、版本号与官方依据链接。改动政策参数只动这里。
- **`src/calculator.ts`** — 纯计算逻辑，不依赖 React。导出表单类型与初值（`FormValues` / `initialForm`、`ProjectionValues` / `initialProjection`）、`calculate`、`project`、以及 `statutoryRetirementDate` / `minimumContributionMonths` / `divisorForAge` 等辅助函数。测试直接打这一层。
- **`src/App.tsx`** — 全部 UI，单个组件，无组件库；样式集中在 `src/styles.css`（纯 CSS）。校验结果通过 `Calculation.errors` / `notices` 渲染，UI 不重复实现业务判断。

计算参数全部以 **字符串** 形式在表单中流转，`calculator.ts` 内部用 `num()` 转换。新增字段时保持这一约定。

### 三条容易踩的链路

- **计发基数不可编辑**：`form.pensionBase` 由 `initialForm` 从 `policy.currentPensionCalculationBase` 注入，输入框是 `readOnly`。`policy.pensionCalculationBaseByYear` 目前仅供未来按年度取值使用，**不要**把它误接成"用户可自填计发基数"。更重要的：年度社会保险**缴费基数**绝不能当作养老金**计发基数**（README 明确禁止）。
- **两种模式复用同一条计算路径**：`near` 模式直接 `calculate(form)`；`plan` 模式走 `project(form, projection)`，后者构造一个虚拟 `futureForm`（滚存个人账户、按增长率外推计发基数、累加缴费月数）再回头调用 `calculate`。`project` 在基础校验失败时返回 `null`，UI 用 `future ?? result` 兜底。改动 `project` 时注意它依赖 `calculate` 的字段语义不变。
- **规划模式下 `annualBase` 留空等于 0**：`Number('') === 0`，所以「预计年缴费基数」空着就是假设"退休前不再缴费"，结果会明显偏低。`project` 为此追加了一条 notice，不要删掉。另外它用 `Math.ceil(years)` 迭代，不足整年按整年计。

## 领域规则（改动计算逻辑前必读）

三项构成与公式（`src/calculator.ts` 底部）：

```
基础养老金 = A × (1 + Q) ÷ 2 × M × 1%
个人账户   = K ÷ L
过渡性     = A × (1 + Q) ÷ 2 × M1 × 1.4%   // 仅 1996 年前参保
```

- **保留位数**（渝人社发〔2010〕275号）：Q、M、M1 保留 **4 位**小数，其余结果保留 **2 位**。`round()` 的调用位置是刻意安排的，不要"顺手"统一精度。
- `firstInsuredDate < '1996-01-01'` 判定为"有过渡性养老金"，此时 M1 为必填且不得大于累计缴费年限。
- 最低缴费年限从 2030 年起逐年递增（`minimumContributionMonths`），当前只是提示不阻断计算。
- 法定退休日按渐进式延迟规则推算（`statutoryRetirementDate`），`App.tsx` 用 `useEffect` 把它回写到 `retirementDate` 字段，同时允许用户手动覆盖。该 effect 的 `old.retirementDate === automaticDate` 判断是为了避免自触发循环。
- 递延规则只认**出生年月**、不认具体日，所以 `addMonths` 会把"日"钳制到目标月的最后一天（29/30/31 号出生者尤其要注意）；直接用 `setMonth`/`setFullYear` 会让日期溢出到下个月，改变退休月份。
- 本工具**不**计算特殊工种、病退、弹性退休个案待遇、退休后调待、企业年金、医保、个税及政策性增发——这些只作为 `notices` 提示，不要试图补全。

## 测试

`src/calculator.test.ts` 除常规用例外，含一个**来自公开决定书的真实个案**回归用例（末尾那条，断言容差 0.011 元）。原文只公开了 A 的两位小数，故内部精度会产生末位分差——这个容差是刻意的，不要改成精确相等。

## 仓库状态注意

- **无 `.gitignore`**，且 `dist/`、`node_modules/`、`.pnpm-store/` 都已被 git 跟踪。运行 build 会直接弄脏一批已跟踪文件，`git status` 长期不干净是预期现象。提交前请只挑本次真正相关的文件，不要用 `git add -A` 把这些一并裹进去（除非用户明确要求清理仓库结构）。
- 发布：推送到 `main` 触发 `.github/workflows/deploy.yml`，用 pnpm 10 / Node 22 构建并部署到 GitHub Pages。
