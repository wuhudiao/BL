# Oh My Keymint

[![Telegram](https://img.shields.io/static/v1?label=Telegram&message=@OhMyKeymint&color=0088cc)](https://t.me/OhMyKeymint)  [![CI Build](https://github.com/qwq233/OhMyKeymint/actions/workflows/ci.yml/badge.svg)](https://github.com/qwq233/OhMyKeymint/actions/workflows/ci.yml)

Android Keystore 伪造器的自定义密钥库实现

## 这是什么？

这是一个完整的 keystore 实现，完全实现了 AOSP AIDL 接口，参考了官方 AOSP 实现。

从理论上讲，这会让检测程序更难识别出与 AOSP 不一致的行为，从而比 TrickyStore 的 FOSS 分支或其他基于 TrickyStore 的模块（如 TEESimulator）实现更好的隐蔽性。

## 安装与配置

**需要 Android 12 或更高版本。**

1. 安装本模块。
2. 如需要，[配置 OMK](docs/CONFIGURATION.md)。
3. 替换模板 keybox.xml（如需要）

keybox 文件必须是一个**有效的** XML 文件，至少包含 EC 链；不含 RSA 条目时，RSA 密钥的证明使用 EC 密钥及其证书链签发。文件中不能有任何额外内容，例如水印或不可见字符。

生效的配置文件位于 `/data/misc/keystore/omk/config.toml` 和
`/data/misc/keystore/omk/injector.toml`。完整的注释示例、逐字段说明、安全注意事项以及重启要求，请阅读
[配置指南](docs/CONFIGURATION.md)。

## 重启 keymint 和 injector

本模块包含两个后台守护进程：一个用于 `keymint`，一个用于 `injector`。

你可以通过以下命令重启它们：

```sh
touch /data/adb/omk/restart.keymint
touch /data/adb/omk/restart.injector
touch /data/adb/omk/restart.all
```

哪些更改需要重启组件或完全重启设备，请参见
[配置指南](docs/CONFIGURATION.md#how-changes-are-loaded)。

## 许可证

**使用本软件前，您必须同意以下两项许可证。**

`General License Agreement`

```plaintext
OhMyKeymint - Custom keymint implementation for Android Keystore Spoofer
Copyright (C) 2026 James Clef <qwq233@qwq2333.top>

This program is open source software: you can redistribute it and/or 
modify it under the terms of the General License Agreement as
published by James Clef, either version 4 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
General License Agreement for more details.

You should have received a copy of the General License Agreement
along with this program.  If not, see <https://github.com/qwq233/license/>.
```

`Oh My Keymint License`

```plaintext
1. 除经本软件作者书面许可外，不得将本软件名称或与其近似的名称用于修改版、衍生作
   品或相关服务的命名、宣传；法律允许的指名性使用除外。本软件的修改版或衍生作品
   如与本软件存在明显区别，须使用其他名称。例如，包含不属于本软件原版的功能或附
   属资源，或使用本软件名称可能导致公众误认为该修改版由原项目作者发布、认可或存
   在关联，即属于此类情形。上述作品须保留本软件的著作权声明、作者署名及许可证文
   件并以显著方式标注该作品为本软件的衍生作品，且不得暗示本软件作者对其承担任何
   责任。即使不属于上述须更名情形的修改版或衍生作品，本软件作者认为有必要时，仍
   有权要求其更名。

2. 除非您所在的司法管辖区的适用法律另行规定，您同意将纠纷或争议提交至中国大陆境
   内有管辖权的人民法院管辖。

3. 本协议与General License Agreement共同发挥效力。
```

## 致谢

部分代码来自 [AOSP](https://source.android.com/)

许可证：`Apache-2.0`

```plaintext
Copyright 2022, The Android Open Source Project

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
