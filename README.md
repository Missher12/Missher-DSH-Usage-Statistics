# DeepSeek Harness 使用统计

[English](README.en.md) · [下载成品](https://github.com/Missher12/Missher-DSH-Usage-Statistics/releases) · [桌面端](https://github.com/Missher12/Missher-DeepseekHarness-Desktop)

汇总本地会话的 Token 用量、每日与小时活动，以及模型、工具和技能使用情况。

独立、可卸载的 Harness Bundle，包名 `@missher/dsh-usage-statistics`。安装并启用后打开 **设置 → 使用统计**，查看已有记录不需要 API Key。当前版本为 **0.2.2**：已在三个真实宿主上完成安装、Loader 与安装生命周期验收（真实 Web 界面验收只在纯官方 0.2.1-alpha.5 上完成）。成品与校验值请从 Releases 获取。

## 兼容范围（0.2.2）

peer 声明：

- `@deepseek-ai/dsh*` 保持 `*`：版本门由宿主自己的 `evaluatePluginCompatibility` 判断，不依赖插件自带白名单，也不使用 `plugin allow-version` 或任何旁路兼容包。
- `@deepseek-ai/cordis`：`^4.0.4 || ^4.0.5-alpha.1`。
- `@deepseek-ai/schemastery`：`^3.18.4 || ^3.18.5-alpha.1`。
- 开发 SDK 仍锁定 `0.2.0-rc.2`（`pnpm-lock.yaml` 与 `pnpm-workspace.yaml` 的 `link:` 覆盖），保证开发环境可复现；这不限制插件在更宽宿主上运行。

三个宿主上实际跑过的库版本（同一份 tgz）：

| 宿主 | 运行版本 | Cordis | Schemastery |
| --- | --- | --- | --- |
| Missher 配套 rc.2 | 0.2.0-rc.2 | 4.0.4 | 3.18.4 |
| Missher 配套 alpha.2 | 0.2.1-alpha.2 | 4.0.5-alpha.1 | 3.18.5-alpha.1 |
| 纯官方 npm runtime | 0.2.1-alpha.5 | 4.0.5 | 3.18.5 |

`4.0.5` 与 `3.18.5` 落在已声明范围内，且已在官方 runtime 上真实运行；范围仍不表示其他版本都已实测。

缺接口时的行为按三种情况分开：

- **整个必需服务缺失**（例如组合里没有 `sessionPersistence`）：插件的必需注入让它保持等待，**由宿主的 Loader 审计报出** `pending (waiting for service: sessionPersistence)`，`usageStatistics` 服务不存在，不会出现“0 用量”的假统计。
- **服务存在但缺少成员**（例如 `storageDomain.open` 不存在、`sessionPersistence` 少了 `stat`）：插件在初始化时报出确切缺失成员，服务保持不可用。
- **只有可选能力缺失**（实时会话索引 `sessions` 不存在）：用量统计照常完整，缓存与数据口径不变。

## 截图

![浅色主界面：累计用量、53×7 颗粒图与设置区块](docs/images/usage-0.2.2-light.png)

**浅色主界面** — 包版本 0.2.2；合成数据（152 条合成会话，累计 17 850 900 Token）；截取自纯官方 npm runtime 0.2.1-alpha.5 的真实 Web 设置页（Linux x64，1280×720）。无个人会话、笔记、本机路径或凭据。

![深色主题：小时活动柱状图与悬停用量提示](docs/images/usage-0.2.2-hourly-dark.png)

**深色主题与小时活动** — 同一版本与同一组合成数据；今天 0–23 点共计 236 100 Token，图示悬停/聚焦在某小时上。Tooltip 本次通过点击与键盘焦点实际显示；鼠标移入显示沿用此前未修改的 local.9 证据。截图方法：JPEG 原始帧，仅做无损格式转为 PNG，像素未修改，非生成图、非拼图。

图片文件与说明见 [docs/images](docs/images/README.md)。

## 功能

- 累计 Token、峰值每日 Token、最长会话有效耗时、当前与最长连续聊天天数。
- 最近 53 周的 53×7 颗粒图，支持每日、每周、累计视图与精确用量提示。
- 今天 0–23 点的小时柱状图，无外框；悬停查看时段和准确 Token 数，方向键切换小时，支持手动刷新。
- 颗粒与小时图共用颜色偏好：跟随主题、五种预设或自定义颜色。
- 缓存命中率、常用模型与推理强度、工具/技能调用排行；读不到的会话或缺少的用量明确提示。
- 中文与英文，宿主浅色/深色主题，上次统计快照与失败重试。

## 宿主与平台

运行时依赖宿主的 `sessionPersistence`、`storageDomain`、Typert Remote、`settings.section` 和原生 UI primitives；插件不调用 Missher 专属扩展接口，也不需要额外兼容插件。

**0.2.2 已实测**：同一份 tgz 在 Missher 配套 rc.2、Missher 配套 alpha.2 与纯官方 npm runtime 0.2.1-alpha.5 上分别进程隔离安装、启动、读取快照、从 v3 派生缓存重建 v4、重启、卸载并重装；原始会话字节与缓存字节保持一致，缓存域 1 / 行 4 不变，安装使用 pnpm 11.7.0，profile 独立且空凭据，未提交模型请求。真实 Web 设置页验收在纯官方 0.2.1-alpha.5（Linux x64）完成。

**本轮未验证**：原生日常 Electron 界面、macOS、Windows、Apple Silicon、其他宿主版本。桌面应用自身的跨平台测试不计入本插件测试。分层结果见 [VALIDATION.md](VALIDATION.md)。

DSH peer 保留 `*`，不会仅凭版本号拒绝宿主；这不代表所有版本兼容。缺必需服务由宿主 Loader 提示等待，缺成员由插件报错，均不使用版本豁免。

## 安装、启用与卸载

1. 从 [Releases](https://github.com/Missher12/Missher-DSH-Usage-Statistics/releases) 下载所选版本的 `missher-dsh-usage-statistics-<版本>.tgz`，使用同版 `SHA256SUMS` 核对文件。GitHub 自动生成的 Source code 压缩包不是插件安装包。
2. 桌面版进入 **插件 → 添加插件 → 包名或地址**，填写下载的 `.tgz` 绝对路径；也可以填写该文件的公开下载 URL。安装包包含全部运行入口，安装不需要构建或本机 SDK。
3. 按宿主提示启用/重新加载，打开 **设置 → 使用统计**。有历史记录时会汇总已有用量；没有记录时显示空状态。
4. 在插件管理页关闭本插件的启用开关可停用，重新打开可恢复。宿主未启用热加载时，按提示正常重启后生效。
5. 在同一插件管理页卸载 `@missher/dsh-usage-statistics`，页面、服务和样式随插件生命周期撤销。停用或卸载不会删除原始会话、模型配置或凭据；可重建缓存与颜色偏好会保留。

更新前保存当前 profile 的备份；更新时沿用相同包名，勿同时安装旧命名副本。CLI、Git 安装和本地目录的区别见 [INSTALL.md](INSTALL.md)。

## 数据与统计口径

只统计当前 Harness 数据目录中能读取的本地会话，不汇总其他电脑，不查询账户额度或费用。统计来自供应商已报告的 Token 用量，不是账单或估算。

- 计入非缓存输入、输出、缓存读取和缓存写入；推理 Token 不在输出之外重复相加。缺少用量不推算。有报告的失败尝试和重试计入，同一尝试的重复结算去重，派生会话继承前缀不重复计数。
- 每日与小时图使用相同时区，默认系统时区。小时归属取有效用量事件的记录时间，不把跨小时请求平均分摊；夏令时重复小时合并，跳过小时为零。打开页面或点击刷新重新读取；旧日期缓存不会被标成“今天”。
- 缓存命中率 = 缓存读取 Token / 全部输入 Token。最长会话只合计已完成轮次的有效耗时，不含轮次间空闲。
- 模型/推理强度表示历史记录里最常用的值，不代表当前默认设置或模型能力。工具与技能混合排行只展示前 5 项。

Host 经宿主持久化服务读取记录，只写本插件的 `missher_usage_statistics` 派生缓存（域 1、行 4）。浏览器保存统计快照和颜色偏好；旧缓存可重新生成。它不直接扫描私有日志格式，不修改原始会话，不修复或迁移历史日志。不可读记录会显示为省略。

插件不注册模型工具、不注入提示词、不调用模型，也不向外部上传统计。它没有跨设备同步、费用预测或当前会话上下文管理功能。大量历史记录首次统计可能较慢；默认刷新预算为 12 秒。高级配置 `timeZone` 可指定 IANA 时区，`refreshTimeoutMs` 范围为 10–60000 毫秒。

## 开发

普通安装直接使用成品 `.tgz`。源码开发使用 Node.js 和 pnpm 11.7.0，以及一个已构建的 DSH 0.2.0-rc.2 SDK：

```sh
node scripts/link-harness.mjs /absolute/path/to/built-harness
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test --maxWorkers=1
pnpm build
pnpm pack:bundle
```

SDK 链接 `harness-sdk`、开发依赖和本机路径均不进入成品包。验证正在使用的源码时应在独立副本中运行，避免重建日常链接的 `lib`。

`scripts/verify-profile.mjs` 是**仅固定开发 SDK**的历史隔离安装入口：它要求验收运行时与开发 SDK 同版本（`DSH_SOURCE_DIR=/absolute/path/to/built-harness`），只创建自己的测试 profile。0.2.2 的宽版本（rc.2 / alpha.2 / 官方 alpha.5）三宿主独立验收在审查者的私有证据目录内运行，不随本仓库公开发布，因此这里不提供对应的公开命令。

## 来源与反馈

MIT 许可。使用统计的初始实现从 Desktop 0.5.10 / Harness 0.1.5-rc.2 拆出，提取修订为 `ca0085cabd778685b83c79ff40e49d637014b28f`。后续适配、小时活动与配色由本插件维护。原文件与校验值见 [provenance.json](provenance.json)。

保留 [本项目 MIT](LICENSE)、[DeepSeek 上游 MIT](licenses/deepseek-harness-MIT.txt) 和 [Zod MIT](licenses/zod-MIT.txt)；浏览器入口包含 Zod 4.4.3。Cordis、Schemastery 与 DSH 服务由宿主依赖提供。

问题反馈请附宿主/插件版本、平台、复现步骤和脱敏错误：[Issues](https://github.com/Missher12/Missher-DSH-Usage-Statistics/issues)。请勿附带密钥或真实会话内容。
