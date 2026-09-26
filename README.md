# DeepSeek Harness 使用统计

独立、可卸载的 Harness Bundle，基于 Desktop 0.5.10 的使用统计模块拆分。安装后从「设置 → 使用统计」打开。

- 累计 Token、峰值每日 Token、最长会话有效耗时、当前/最长连续聊天天数。
- 最近 53 周的每日、每周和累计 Token 活动图，支持悬停查看日期与用量。
- 缓存命中率、常用模型、常用推理强度、技能数、工具调用数和聊天天数。
- Skill 与工具排行，以及不可读取会话、缺失用量记录的明确提示。
- 中文/英文、宿主浅色/深色主题、加载/失败重试及上次结果缓存。

## 兼容与安装

本版本适配 Desktop **0.5.10 / Harness 0.1.5-rc.2**。实际验证记录见 `VALIDATION.md`。未声明兼容后续官方 alpha 版本。安装包、源码和宿主版本是不同的版本号。

参见 [INSTALL.md](INSTALL.md)。预编译包包含 Host、Client、Typert 通信描述和 Bundle 配置，不需要安装时构建。没有依赖旧 Desktop Enhancement 增强包。

插件通过自己的 `usageStatistics` Remote 服务读取宿主 `sessionPersistence`，在自己的 `missher_usage_statistics` 缓存中保存可重建的聚合数据。安装层停用内置统计页面，保留单一「使用统计」入口；移除插件层后恢复内置页面。它不修改应用源码、会话日志、模型设置或凭据。

## 数据口径

Token 来源为日志中已持久化的供应商用量，输入、输出、缓存读取、缓存写入分别计数。未报告的用量不推算。派生会话继承的事件前缀不重复统计。最长会话为已完成轮次的有效耗时之和，不包含轮次之间的空闲时间。日期按系统时区聚合，可通过插件配置指定 IANA 时区。

统计只覆盖当前 Harness 数据目录中可读取的本地会话，不是账户账单，也不汇总其他电脑。损坏、更新版本或不支持的会话将显示为省略，插件不会为了统计去迁移或修复它们。导入/删除日志或改变时区会重建有关缓存。排行最多返回 50 个功能名称，活动图最多 371 天，不返回消息正文、完整工具参数或密钥。

## 开发

开发依赖固定在 `package.json`。有一份已经构建过的 0.5.10 源码时，可离线链接完全相同版本：

```sh
node scripts/link-dev.mjs /path/to/built/Desktop-0.5.10-source
npm run typecheck
npm test
npm run build
npm run pack:bundle
DSH_SOURCE_DIR=/path/to/built/Desktop-0.5.10-source npm run verify:profile
```

该链接脚本只写本插件的 `node_modules`，拒绝替换已有不同链接。发布包不包含开发依赖或本机绝对路径。`provenance.json` 记录拆分来源和原文件校验值。MIT 许可证及上游授权保存在 `LICENSE`、`licenses/`；Client 内包含的 Zod 4.4.3 许可证见 `licenses/zod-MIT.txt`。

## 模型影响与限制

插件不注册模型工具，不注入提示词，不调用模型，不增加请求 Token。刷新统计时会读取本地日志并更新独立派生缓存；大量历史日志首次读取可能较慢，默认有 12 秒刷新预算，部分读取失败会明确显示。卸载保留可重建的缓存，不清理用户数据。没有费用估算、跨设备同步或账户额度查询。
