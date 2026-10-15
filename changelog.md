## v121.14

**新增**
- WebUI：一键配置隐藏应用列表（原版）
- WebUI：写入配置前自动创建父目录

**修复**
- 修复 vbmeta 来源不可用时的回退失败
- 允许 patchlevel 降级
- 动态库加载优先使用 `/system/lib64`

**兼容性**
- 合并上游 master（qwq233/OhMyKeymint）
- 注入器：接口 token 绑定到实际接收它的 binder 节点
- 注入器 / KeyMint：grant 支持通过 key id 命中
- KeyMint：模拟安全世界操作耗时，时序更贴近真机
- 构建：源码路径按 vendor keystore2 布局重映射

> versionCode `236`（上一版 `224`），ARM64 模块包由 CI 构建完成后自动附在本页。

