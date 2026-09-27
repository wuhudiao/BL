#!/system/bin/sh
# 一键配置 Hide My Applist（HMA-OSS）。
#
# 移植自 DikSU 的 userspace/ksud/src/webui.rs（run_hma_config），脚本本体与那份保持一致，
# 只按管理器的处境改了两处：
#   1. 管理器自己的包名也写进每个应用的「额外隐藏」——管理器进不了隐藏范围（它在排除名单
#      里），但隐藏了列表的那些应用不该看得见它；随机包名之后这里传的就是那个新包名。
#   2. 结尾把 HMA-OSS 拉起一次让它重读配置，再按一下返回键回管理器（DikSU 那边是拉起之后
#      自动长按状态卡、点掉「确定」再退回浏览器）。
#
# 新版 HMA-OSS 把配置放在 /data/misc/hide_my_applist_<随机>/config.json：root/system 属主、
# 单行紧凑 JSON。应用私有目录里那份 files/config.json 是旧格式遗留，模块根本不读它。
#
# 环境变量（由管理器传入）：
#   HMA_MANAGER_PKG       管理器当前的包名
#   HMA_EXTRA_EXCLUDE     额外排除的包；Scene 版传 com.omarea.vtools
#   HMA_NO_ACCESSIBILITY  非空时不勾「无障碍功能」预设；Scene 版置 1
PKG=org.frknkrc44.hma_oss
CONFIG=$(ls /data/misc/hide_my_applist_*/config.json 2>/dev/null | head -1)

# 没有这一句，下面找不到配置文件时会报「还没生成配置文件」，而实际上可能是压根没装。
if ! pm list packages | grep -q "^package:$PKG$"; then
    echo "未安装 HMA（$PKG）"
    exit 1
fi

if [ -z "$CONFIG" ]; then
    echo "找不到 HMA-OSS 的配置文件（/data/misc/hide_my_applist_*/config.json）：先打开一次 HMA-OSS 再试"
    exit 1
fi

# 整份配置就一行。下面的处理全部以**文件**为单位：grep/sed 读文件、重定向写文件，绝不把整份
# JSON 当成某个命令的参数 —— Linux 给单个参数的上限是 128KB，装的应用一多，“把整份 JSON 塞进
# 一个变量再 printf”那种写法就会直接 Argument list too long。
TMPDIR=/data/adb/ksu
HEAD_F="$TMPDIR/hma_head.$$"
BODY_F="$TMPDIR/hma_body.$$"
NEW_F="$TMPDIR/hma_new.$$"
trap 'rm -f "$HEAD_F" "$BODY_F" "$BODY_F.2" "$NEW_F"' EXIT

# 一次遍历切成两半：scope 之前（含 "scope":{）写 head 文件，之后写 body 文件。
if ! awk -v head="$HEAD_F" -v body="$BODY_F" -v marker='"scope":{' '
    NR == 1 {
        i = index($0, marker)
        if (i == 0) exit 1
        printf "%s", substr($0, 1, i + 8) > head
        printf "%s", substr($0, i + 9) > body
        next
    }
    { exit 2 }
' "$CONFIG"; then
    echo "配置读不动（不是单行 JSON，或没有 scope）：$CONFIG"
    exit 1
fi

# 多余逗号：早先那版脚本在 scope 为空时写出过 {...,} 这种非法 JSON，HMA 自己也读不了它。
# 既然这次要重写这份文件，顺手修掉（改之前照样先备份）。
BROKEN=0
if grep -qF ',}' "$BODY_F" || grep -qF ',]' "$BODY_F"; then
    BROKEN=1
    sed 's/,}/}/g; s/,]/]/g' "$BODY_F" > "$BODY_F.2" && mv -f "$BODY_F.2" "$BODY_F"
    echo "现有配置里有多余逗号（HMA 读不了），这次写回一并修掉"
fi

# 应用预设全勾（HMA 现有的 7 个：无障碍应用、自定义 ROM、检测类、root 类、Shizuku/Dhizuku、
# 可疑应用、Xposed 模块）。设置预设默认勾「无障碍功能」和「开发者选项」。
ALL_APP_PRESETS='"accessibility_apps","custom_rom","detector_apps","root_apps","shizuku_dhizuku","sus_apps","xposed"'
APP_RULE_TEMPLATE='"%s":{"useWhitelist":false,"excludeSystemApps":true,"hideInstallationSource":false,"hideSystemInstallationSource":false,"excludeTargetInstallationSource":false,"invertActivityLaunchProtection":false,"excludeVoldIsolation":false,"restrictedZygotePermissions":[],"applyTemplates":[],"applyPresets":[%s],"applySettingTemplates":[],"applySettingsPresets":[%s],"extraAppList":[%s],"extraOppositeAppList":[]}'

# Scene 版去掉无障碍：Scene 靠无障碍服务读应用，范围内的应用一旦被隐藏了无障碍，它照样用不了，
# 所以这一项在 Scene 版里整个不勾。
APPLY_SETTINGS_PRESETS='"accessibility","dev_options"'
if [ -n "$HMA_NO_ACCESSIBILITY" ]; then
    APPLY_SETTINGS_PRESETS='"dev_options"'
fi

EXCLUDED_PACKAGES="eu.darken.sdmse me.weishu.kernelsu bin.mt.plus.canary bin.mt.plus org.telegram.messenger org.telegram.group me.bmax.apatch"

# 管理器的包名由管理器自己传进来（随机包名之后不是 me.weishu.kernelsu 了），Scene 版再多塞一个。
# 单独判断再拼，是因为空串也会拼出一个空元素，而下面把它整个当正则用（sed 's/ /|/g'）：空元素
# 会让 grep -v 把所有包都排掉 —— 那是一个应用都写不进去，却还报成功。
for EXTRA in "$HMA_MANAGER_PKG" "$HMA_EXTRA_EXCLUDE"; do
    [ -n "$EXTRA" ] && EXCLUDED_PACKAGES="$EXCLUDED_PACKAGES $EXTRA"
done

# 网页端启动器（DikSU 里那个计算器）的包名每次安装都会重新生成，安装时由管理器写在这个文件里
# —— 这是唯一可靠的来源。**不猜**：以前这里会按包名形状（com.<5 个小写字母>.<5 个小写字母>）
# 兜底猜一个，撞上了就会把那个不相干的应用从所有应用里额外隐藏掉；宁可这次不写 extraAppList。
LAUNCHER_PKG=$(head -1 /data/adb/ksu/calculator.pkg 2>/dev/null | tr -d '[:space:]')
if [ -n "$LAUNCHER_PKG" ] && ! pm list packages -3 | grep -q "^package:$LAUNCHER_PKG$"; then
    # 文件里记的那个包已经卸载了：当作没有启动器，不要退回猜。
    LAUNCHER_PKG=""
fi
if [ -n "$LAUNCHER_PKG" ]; then
    # 启动器自己不需要隐藏别的东西，所以不进隐藏范围；反过来要把它从别的应用里隐藏掉。
    EXCLUDED_PACKAGES="$EXCLUDED_PACKAGES $LAUNCHER_PKG"
    EXTRA_APP_LIST="\"$LAUNCHER_PKG\""
else
    EXTRA_APP_LIST=""
fi
# 管理器自己同样只进「额外隐藏」，不进范围。
if [ -n "$HMA_MANAGER_PKG" ] && [ "$HMA_MANAGER_PKG" != "$LAUNCHER_PKG" ]; then
    if [ -n "$EXTRA_APP_LIST" ]; then
        EXTRA_APP_LIST="$EXTRA_APP_LIST,\"$HMA_MANAGER_PKG\""
    else
        EXTRA_APP_LIST="\"$HMA_MANAGER_PKG\""
    fi
fi

EXCLUDE_REGEX=$(echo "$EXCLUDED_PACKAGES" | sed 's/ /|/g')
ALL_USER_PACKAGES=$(pm list packages -3 | sed 's/^package://' | grep -v -E "$EXCLUDE_REGEX")

# 没配过的应用补一条；已经配过的把预设补成「全选」——只改那两条预设数组，条目里别的字段
# （白名单模式、额外隐藏、模板）一个字节都不动，别的应用也完全不碰。
OLD_COUNT=$(grep -o '"useWhitelist"' "$BODY_F" | wc -l | tr -d ' ')
# scope 里已经有哪些包：一次 grep 拿全。千万别按包名在整行上做 shell 模式匹配——mksh 在几十 KB 的
# 单行上匹配一次要 0.2 秒，六十几条配置就是一分多钟，按钮点下去半天不跳转就是这么来的。
SCOPE_PKGS=$(grep -o '"[^"]*":{"useWhitelist"' "$BODY_F" | sed 's/":{"useWhitelist"$//; s/^"//' | tr '\n' ' ')
SPACED=" $SCOPE_PKGS "

# 新条目直接追加进 new 文件，不在变量里拼成一大串：那是同一个 128KB 限制的第二个坑。
ADDED=0
cat "$HEAD_F" > "$NEW_F"
for PKG_NAME in $ALL_USER_PACKAGES; do
    case "$SPACED" in
        *" $PKG_NAME "*) continue ;;
    esac
    [ "$ADDED" -gt 0 ] && printf ',' >> "$NEW_F"
    printf "$APP_RULE_TEMPLATE" "$PKG_NAME" "$ALL_APP_PRESETS" "$APPLY_SETTINGS_PRESETS" "$EXTRA_APP_LIST" >> "$NEW_F"
    ADDED=$((ADDED + 1))
done

# 已经配过的条目：把两条预设数组补成「全选」。sed 直接读 body 文件、结果写回同一个文件，
# 顺带把额外隐藏写进 extraAppList。其余字段、别的应用都原样不动。
WANT_APP='"applyPresets":['"$ALL_APP_PRESETS"']'
UPGRADED=$(grep -o '"applyPresets":\[[^]]*\]' "$BODY_F" | grep -v -F -x "$WANT_APP" | wc -l | tr -d ' ')
CHANGED=0
sed -e "s#\"applyPresets\":\[[^]]*\]#$WANT_APP#g" \
    -e "s#\"applySettingsPresets\":\[[^]]*\]#\"applySettingsPresets\":[$APPLY_SETTINGS_PRESETS]#g" \
    "$BODY_F" > "$BODY_F.2"
if [ -n "$EXTRA_APP_LIST" ]; then
    sed "s#\"extraAppList\":\[[^]]*\]#\"extraAppList\":[$EXTRA_APP_LIST]#g" "$BODY_F.2" > "$BODY_F.2.b" &&
        mv -f "$BODY_F.2.b" "$BODY_F.2"
fi
cmp -s "$BODY_F" "$BODY_F.2" || CHANGED=1
mv -f "$BODY_F.2" "$BODY_F"
SKIPPED=$((OLD_COUNT - UPGRADED))

if [ "$ADDED" -gt 0 ] || [ "$UPGRADED" -gt 0 ] || [ "$BROKEN" -eq 1 ] || [ "$CHANGED" -eq 1 ]; then
    STAMP=$(date +%Y%m%d-%H%M%S)
    cp -f "$CONFIG" "$CONFIG.bak-$STAMP" || {
        echo "备份失败，没动原文件：$CONFIG"
        exit 1
    }

    # 新条目插在 "scope":{ 后面，其余（全局设置、别人配过的应用、模板）原样留着。
    # scope 本来就是空的时候（body 以 } 开头）后面不能再跟逗号，那会写出 {,... 这种非法 JSON。
    SEP=""
    if [ "$ADDED" -gt 0 ] && [ "$(head -c 1 "$BODY_F")" != "}" ]; then
        SEP=","
    fi
    printf '%s' "$SEP" >> "$NEW_F"
    cat "$BODY_F" >> "$NEW_F"

    # 写入前自检：条目数正好多出 ADDED 条、括号配平、没有空元素/多余逗号。不对就整份放弃，原文件不动。
    NEW_COUNT=$(grep -o '"useWhitelist"' "$NEW_F" 2>/dev/null | wc -l | tr -d ' ')
    OPEN=$(tr -cd '{' < "$NEW_F" | wc -c | tr -d ' ')
    CLOSE=$(tr -cd '}' < "$NEW_F" | wc -c | tr -d ' ')
    if [ "$NEW_COUNT" != "$((OLD_COUNT + ADDED))" ] || [ "$OPEN" != "$CLOSE" ] ||
        grep -qF ',}' "$NEW_F" || grep -qF ',]' "$NEW_F" || grep -qF ',,' "$NEW_F" ||
        grep -qF '{,' "$NEW_F"; then
        echo "自检没过（条目 $NEW_COUNT/$((OLD_COUNT + ADDED))，括号 $OPEN/$CLOSE），没动原文件"
        exit 1
    fi

    # 原地写入：inode 不动，system 属主、600 权限、SELinux 上下文都保持原样。
    cat "$NEW_F" > "$CONFIG"
fi

# 额外隐藏的那些包应该在每条配置里各出现一次。少了就说明哪条没写全，报出来而不是装作成功。
for HIDDEN_PKG in "$LAUNCHER_PKG" "$HMA_MANAGER_PKG"; do
    [ -n "$HIDDEN_PKG" ] || continue
    [ $((OLD_COUNT + ADDED)) -gt 0 ] || continue
    HIDDEN_MENTIONS=$(grep -o "$HIDDEN_PKG" "$CONFIG" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$HIDDEN_MENTIONS" -lt $((OLD_COUNT + ADDED)) ]; then
        echo "额外隐藏 $HIDDEN_PKG 没写全：$((OLD_COUNT + ADDED)) 条配置里只出现 $HIDDEN_MENTIONS 次"
        exit 1
    fi
done

# ---- 让模块重读配置 --------------------------------------------------------

# 模块把配置缓存在内存里，写完文件还得让它重读一次才算生效：起来一下就够了，不用去点界面
# 上的东西。拉起之后再按一下返回键，管理器就在它后面。
input keyevent KEYCODE_WAKEUP > /dev/null 2>&1
am start -n "$PKG/.MainActivityLauncher" > /dev/null 2>&1

# 留一点时间让它真的到前台，不然这一下返回键会落到管理器自己身上，把当前页面退掉。
sleep 2
# input 在管理器的 root shell 里偶尔发完事件不退出，掐个上限。
timeout 5 input keyevent 4

if [ -n "$LAUNCHER_PKG" ]; then
    echo "新增 $ADDED 个、补预设 $UPGRADED 个、本来就没问题 $SKIPPED 个；并从它们里额外隐藏启动器（$LAUNCHER_PKG）"
else
    echo "新增 $ADDED 个、补预设 $UPGRADED 个、本来就没问题 $SKIPPED 个"
fi
exit 0
