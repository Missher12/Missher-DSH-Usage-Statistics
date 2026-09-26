# 当前状态

2026-09-26：用户要求将截图中的使用统计独立为可安装、可卸载的 Harness 插件。当前包为 `@missher/dsh-usage-statistics` 0.1.0，适配 Desktop 0.5.10 / Harness 0.1.5-rc.2，本地独立仓库；未发布到远端，也未安装到日常配置。

代码来自 0.5.10 的 usage-insights 与 ui-settings-usage，原文件 SHA-256 在 provenance.json。插件拥有 usageStatistics Remote、usage.statistics Locale、missher_usage_statistics 派生缓存以及对应 Client 入口。Bundle 只停用内置 ui-settings-usage 页面，原始 Host 服务保持存在，移除插件层即可恢复原页面。

必须保留客户端显式注入 remote.usageStatistics 的子作用域；只调用 remote.$mount 并不足以授权后续读取。客户端 CSS 使用 Cordis effect 安装与撤销。Host 卸载先取消/等待刷新，再关闭缓存域。原生测试和最终包运行时入口通过 SHA-256 绑定。

验证层级、可重现命令和限制分别见 VALIDATION.md、README.md、INSTALL.md。原生样本数据是隔离合成日志。开发依赖通过 scripts/link-dev.mjs 链接匹配的已构建源树，不改源树；发布包预编译，不依赖开发路径。
