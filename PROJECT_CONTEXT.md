# 当前状态

2026-09-26：用户在本地目录安装时，宿主报告 0.1.0 不兼容 DSH 0.1.7-rc.2。已确认当前应用是用户 Applications 下的 DeepSeek Harness Intel 0.1.7-rc.2。当前插件升级为 **0.2.0**，精确适配此内核；0.1.0 安装包仍留在 dist，适配旧 Desktop 0.5.10 / DSH 0.1.5-rc.2。

当前开发依赖链接到已构建的 0.1.7-rc.2 源码，参考 SHA e3409377ac873963595b76c0eb9afd8a8aa241af；旧依赖链接已备份在本仓库 .verification/node_modules-015rc2。不得修改宿主源码、日常数据或其他插件。当前本地根目录可直接用于图形界面安装；未推送远端。

插件拥有 usageStatistics Remote、usage.statistics Locale、missher_usage_statistics 派生缓存及 Client 入口。0.1.7-rc.2 没有内置使用统计，Bundle 只插入独立插件；卸载撤销入口。Client 必须 ctx.inject(['remote.usageStatistics'], ...)；新版 Typert codec 必须 create() 工厂，不能退回 schema 属性。所有宿主依赖使用匹配的 peer，不用版本豁免。

验证：类型检查、64 项测试、目录与 tarball 的完整 CLI profile 安装/读取/卸载、原生目录安装/立即启用/统计图表/卸载均通过。实际验收运行时与当前应用的差异及验证限度见 VALIDATION.md、verification/runtime.json。原生脚本须使用尊重 DSH_HOME 的未包装参考应用；当前 Intel 启动包装会覆盖这个环境变量，不能直接拿它执行隔离测试。

脚本、报告和合成 V4 会话均在本仓库。截图不代表日常用量。运行时代码的校验值在 verification/native.json，最终安装包校验值在 dist/SHA256SUMS。旧 0.1.0 的报告归档在 verification/0.1.0/。
