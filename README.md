# DeepSeek Harness 使用统计

[English](README.en.md) · [下载成品](https://github.com/Missher12/Missher-DSH-Usage-Statistics/releases) · [桌面端](https://github.com/Missher12/Missher-DeepseekHarness-Desktop)

汇总本地会话的 Token 用量、每日与小时活动，以及模型、工具和技能使用情况。

独立、可卸载的 Harness Bundle，包名 `@missher/dsh-usage-statistics`。安装并启用后打开 **设置 → 使用统计**，查看已有记录不需要 API Key。当前源码/上架包版本为 **0.2.1**；公开可下载版本以 Releases 为准。

## 功能

- 累计 Token、峰值每日 Token、最长会话有效耗时、当前与最长连续聊天天数。
- 最近 53 周的 53×7 颗粒图，支持每日、每周、累计视图与精确用量提示。
- 今天 0–23 点的小时柱状图，无外框；悬停查看时段和准确 Token 数，方向键切换小时，支持手动刷新。
- 颗粒与小时图共用颜色偏好：跟随主题、五种预设或自定义颜色。
- 缓存命中率、常用模型与推理强度、工具/技能调用排行；读不到的会话或缺少的用量明确提示。
- 中文与英文，宿主浅色/深色主题，上次统计快照与失败重试。

## 宿主与平台

依赖 DSH **0.2.0-rc.2** 的 `sessionPersistence`、`storageDomain`、Typert Remote、`settings.section` 和原生 UI primitives。插件没有调用 Missher 专属扩展接口，也不需要额外兼容插件。

现有安装/Loader/通信及受控浏览器证据来自 **macOS Intel、基于 rc.2 的 Missher SDK/桌面环境**。0.2.1 沿用已验收的 `0.2.1-local.9` 三份运行入口；本次只整理发布元数据和文档。**纯官方完整应用、Windows、Linux、Apple Silicon 和官方 alpha.1 未用本版本独立验收。** 不把桌面应用本身的跨平台测试算成本插件的测试。详细层级见 [VALIDATION.md](VALIDATION.md)。

DSH peer 保留 `*`，不会仅凭版本号拒绝宿主；这不代表所有版本兼容。缺少上述接口时应保留正常加载错误，不使用版本豁免。

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

SDK 链接 `harness-sdk`、开发依赖和本机路径均不进入成品包。验证正在使用的源码时应在独立副本中运行，避免重建日常链接的 `lib`。隔离安装验证入口为 `DSH_SOURCE_DIR=/absolute/path/to/built-harness node scripts/verify-profile.mjs`；脚本只创建自己的测试 profile。

## 来源与反馈

MIT 许可。使用统计的初始实现从 Desktop 0.5.10 / Harness 0.1.5-rc.2 拆出，提取修订为 `ca0085cabd778685b83c79ff40e49d637014b28f`。后续适配、小时活动与配色由本插件维护。原文件与校验值见 [provenance.json](provenance.json)。

保留 [本项目 MIT](LICENSE)、[DeepSeek 上游 MIT](licenses/deepseek-harness-MIT.txt) 和 [Zod MIT](licenses/zod-MIT.txt)；浏览器入口包含 Zod 4.4.3。Cordis、Schemastery 与 DSH 服务由宿主依赖提供。

问题反馈请附宿主/插件版本、平台、复现步骤和脱敏错误：[Issues](https://github.com/Missher12/Missher-DSH-Usage-Statistics/issues)。请勿附带密钥或真实会话内容。
