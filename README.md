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

keybox 文件必须是一个**有效的** XML 文件，这意味着文件中不能有任何额外内容，例如水印或不可见字符。只带一条链的文件也接受：缺失的那条链会从模块自带的模板补齐。仍然建议自己提供完整的 EC + RSA 两条链，因为自带的模板是公开的软件认证密钥。

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

`AGPL-3.0-or-later`

```plaintext
OhMyKeymint - Custom keymint implementation for Android Keystore Spoofer
Copyright (C) 2025 James Clef <qwq233@qwq2333.top>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```

`Oh My Keymint License`

```plaintext
1. 您不得将本软件、本软件的任意部分或将本软件作为依赖的软件用于任何商业用途。该
   商业用途包括但不限于以盈利为目的，将本软件、本软件的任意部分或将本软件作为依
   赖的软件与其他资源、物品或服务捆绑销售。
2. 您不得暗示或明示本软件与其他软件有任何从属关系。
3. 未经本软件作者书面允许，您不得超出合理使用范围或协议许可范围使用本软件的名称。
4. 除非您所在的司法管辖区的适用法律另行规定，您同意将纠纷或争议提交至中国大陆境
   内有管辖权的人民法院管辖。
5. 本协议与GNU Affero General Public License（以下简称AGPL）共同发挥效力，
   当本协议内容与AGPL冲突时，应当优先应用本协议内容，本协议仅覆盖本软件作者拥有
   完全著作权的部分，对于使用其他协议的软件代码不发挥效力。
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
