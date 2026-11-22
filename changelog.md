## 模块更新

- 同步上游 `qwq233/OhMyKeymint` v1.3.0：用 AOSP 原生 Binder（android-binder + 生成的 AIDL）替换 rsbinder 与手写 Parcel 编解码，injector 的路由层随之重写
- 修复 Maple 检测的「检测到 TEE 伪装模块」两项：
  - 等价参数读取了不同密钥视图
  - 同名密钥的读写删除视图分离
- 根因：`KeyDescriptor` 的 presence 标志被按 0/1 严格解码，非标准值（2 / -1 / INT_MAX）解析失败后请求落到 System，同一个 key 由 OMK 和 System 两个后端各答一半。原生 Binder 的语义本身是「非零即存在」，1.3.0 起该路径不再需要额外补丁
- 重启 keymint 后会丢失内存中的 CredentialEncrypted super key，现在日志会明确写出原因和处置办法，WebUI 与热更新脚本也会提示「完成后需用锁屏凭据解锁一次」
- 保留：Miuix 风格 WebUI、应用选择用户/系统软件切换、keybox RSA 条目容错

## 兼容性

- 最低版本提升到 **Android 13**（上游 v1.3.0 起）

## 验证

- `cargo fmt --check`、`cargo clippy -D warnings`、`cargo test --no-run` 通过（aarch64-linux-android）
- OnePlus PMB110（Android 17）实机运行正常：Maple 278 项全过、Duck 检测无危险项

安装包：`安卓设备隐藏bl-release-arm64-v8a-1.3.0-263.zip`（arm64-v8a）

