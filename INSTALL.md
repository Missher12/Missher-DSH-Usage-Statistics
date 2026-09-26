# 安装与卸载

适配目标：DeepSeek Harness Desktop 0.5.10，底层 Harness 0.1.5-rc.2。请使用预编译的 `missher-dsh-usage-statistics-0.1.0.tgz`，校验值见旁边的 `SHA256SUMS`。

## Desktop

本次验证使用与应用匹配的 CLI 安装，然后在原生窗口中验收。macOS 0.5.10 可直接使用应用自带 CLI：退出应用，将下面的安装包路径替换为实际绝对路径后运行，再启动应用并进入「设置 → 使用统计」。

```sh
ELECTRON_RUN_AS_NODE=1 "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness" \
  --expose-internals \
  "/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/node_modules/@deepseek-ai/dsh/lib/bin.js" \
  plugin --profile web add "/absolute/path/missher-dsh-usage-statistics-0.1.0.tgz"
```

这对应已验收的 0.5.10 Web profile。若日常启动时设置了 `DSH_HOME`，安装时须使用同一值；否则使用默认 `~/.dsh`。原生界面截图来自独立数据目录中的合成会话，没有安装到日常数据目录。安装层隐藏内置统计页面，独立插件沿用同一个入口。`VALIDATION.md` 区分安装与界面验收。

若已启用另一个会替换使用统计页面的插件（例如 Desktop Enhancement），应先停用其统计页面；不同插件不能同时拥有相同设置页入口。不要删除旧会话或卸载其他无关功能来解决冲突。

## CLI 自定义配置

使用与目标应用版本一致的 `dsh`，可先安装到独立的 Web profile：

```sh
dsh --profile usage-preview --from-default-profile web --dump-config
dsh plugin --profile usage-preview add /absolute/path/missher-dsh-usage-statistics-0.1.0.tgz
dsh --profile usage-preview
```

不需要 API 密钥即可查看已存在的本地统计。空数据目录会显示无本地会话。

## 卸载与恢复

退出 Desktop，将上述应用自带 CLI 命令最后一行换为 `plugin --profile web remove @missher/dsh-usage-statistics`，完成后重新启动。它的配置层会同时撤销，恢复内置统计页面。CLI 自定义 profile 可执行：

```sh
dsh plugin --profile usage-preview remove @missher/dsh-usage-statistics
```

会话日志、凭据和模型设置不由本插件写入。派生缓存保留供重新安装使用；缓存不是原始会话数据。
