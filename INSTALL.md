# 安装与卸载 / Installation

[中文完整说明](README.md) · [Full English instructions](README.en.md#install-and-use)

本插件是可卸载的 Harness Bundle，包名 `@missher/dsh-usage-statistics`。当前源码/上架包为 **0.2.1**，已发布资产以 [Releases](https://github.com/Missher12/Missher-DSH-Usage-Statistics/releases) 为准。宿主与平台的实测范围见 [VALIDATION.md](VALIDATION.md)。

## 桌面版

1. 下载所选版本的插件 `.tgz` 和 `SHA256SUMS`。在下载目录运行 `shasum -a 256 -c SHA256SUMS`（macOS）或相应平台的 SHA256 工具进行核对。
2. 打开 **插件 → 添加插件**，在 **包名或地址** 输入 `.tgz` 的绝对路径或其公开下载 URL；不要选 GitHub 自动生成的 Source code 压缩包。
3. 核对插件名称/版本，按提示启用并重新加载，打开 **设置 → 使用统计**。已有会话可直接统计，无需配置模型或 API Key。

包根声明 `dsh.bundle.patch`，并包含 Host、Client、Typert 三入口和许可证；没有安装构建脚本、开发 SDK 链接或机器专属运行路径。安装依赖由宿主的正常包管理流程解析。

## Web / CLI

对已初始化的 `web` profile：

```sh
dsh plugin --profile web add /absolute/path/to/missher-dsh-usage-statistics-0.2.1.tgz
dsh --profile web --no-open
# 正常停止该 profile 后卸载：
dsh plugin --profile web remove @missher/dsh-usage-statistics
```

桌面应用自己的 profile 使用桌面插件管理页。不要把 Web 测试指向桌面日常数据目录。更多操作见[宿主安装指南](https://github.com/Missher12/Missher-DeepseekHarness-Desktop/blob/main/docs/cookbook/install-cordis-plugins.zh.md)。

## Git 与本地目录

公开仓库包含可安装的 Bundle manifest 和已构建 `lib`，无需 `prepare` 构建脚本。本次验证以固定版本 tgz 为准；Git 源安装不冒充本次已测路径。

“本地插件目录”必须已经构建，且运行依赖可解析。只解压 tgz 不会为链接目录准备 Cordis 等 peer 依赖。开发者按 README 准备 SDK 后可使用自己的目录；分发时使用 `.tgz`，不要复制本机的 SDK/依赖链接。

## 启停、升级、卸载与回退

在插件管理页切换本插件的启用开关；没有热加载时按宿主提示正常重启。停用保留安装文件，可重新启用；卸载则从同一入口移除包、统计页面和服务。

插件不删除原始会话、模型配置或凭据。派生缓存、浏览器快照和颜色偏好保留；缓存可重建。更新前备份当前 profile，按正常安装流程更新相同包名。0.2.1 与 `0.2.1-local.9` 运行代码一致，不增加缓存迁移。回退可安装 Releases 中保留的旧版本；不要用旧备份覆盖新的原始会话。

If a release is not yet listed, it is not publicly downloadable. The source version and published assets are separate facts; always select an available release and verify its checksum.
