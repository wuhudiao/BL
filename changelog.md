## 模块更新

- 同步上游 `qwq233/OhMyKeymint` v1.2.6（BoringSSL/dependency 更新、injector 重构）
- 修复部分 keybox 在 `algorithm="rsa"` 块里放 EC 私钥导致解析失败、keybox.xml 被覆盖成 5.4KB 内置模板的问题；现在会丢弃坏 RSA 条目并按 EC-only 签发 RSA 证明
- WebUI 改为 Miuix 风格：首页卡片阴影、应用选择整行分割线、弹窗只保留一层
- 应用选择新增「用户软件 / 系统软件」切换，系统软件只显示名称、不加载图标
- 日志级别弹窗恢复滚动，内部卡片不再叠加阴影

安装包：`安卓设备隐藏bl-release-arm64-v8a-1.2.6-260.zip`（arm64-v8a）

