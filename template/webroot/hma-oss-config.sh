#!/system/bin/sh
PKG=org.frknkrc44.hma_oss
CONFIG=$(ls /data/misc/hide_my_applist_*/config.json 2>/dev/null | head -1)

if ! pm list packages | grep -q "^package:$PKG$"; then
    echo "未安装 HMA（$PKG）"
    exit 1
fi

if [ -z "$CONFIG" ]; then
    echo "找不到 HMA-OSS 的配置文件（/data/misc/hide_my_applist_*/config.json）：先打开一次 HMA-OSS 再试"
    exit 1
fi

TMPDIR=/data/adb/ksu
HEAD_F="$TMPDIR/hma_head.$$"
BODY_F="$TMPDIR/hma_body.$$"
NEW_F="$TMPDIR/hma_new.$$"
trap 'rm -f "$HEAD_F" "$BODY_F" "$BODY_F.2" "$NEW_F"' EXIT

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

BROKEN=0
if grep -qF ',}' "$BODY_F" || grep -qF ',]' "$BODY_F"; then
    BROKEN=1
    sed 's/,}/}/g; s/,]/]/g' "$BODY_F" > "$BODY_F.2" && mv -f "$BODY_F.2" "$BODY_F"
    echo "现有配置里有多余逗号（HMA 读不了），这次写回一并修掉"
fi

ALL_APP_PRESETS='"accessibility_apps","custom_rom","detector_apps","root_apps","shizuku_dhizuku","sus_apps","xposed"'
APP_RULE_TEMPLATE='"%s":{"useWhitelist":false,"excludeSystemApps":true,"hideInstallationSource":false,"hideSystemInstallationSource":false,"excludeTargetInstallationSource":false,"invertActivityLaunchProtection":false,"excludeVoldIsolation":false,"restrictedZygotePermissions":[],"applyTemplates":[],"applyPresets":[%s],"applySettingTemplates":[],"applySettingsPresets":[%s],"extraAppList":[%s],"extraOppositeAppList":[]}'

APPLY_SETTINGS_PRESETS='"accessibility","dev_options"'
if [ -n "$HMA_NO_ACCESSIBILITY" ]; then
    APPLY_SETTINGS_PRESETS='"dev_options"'
fi

EXCLUDED_PACKAGES="eu.darken.sdmse me.weishu.kernelsu bin.mt.plus.canary bin.mt.plus org.telegram.messenger org.telegram.group me.bmax.apatch"

for EXTRA in "$HMA_MANAGER_PKG" "$HMA_EXTRA_EXCLUDE"; do
    [ -n "$EXTRA" ] && EXCLUDED_PACKAGES="$EXCLUDED_PACKAGES $EXTRA"
done

LAUNCHER_PKG=$(head -1 /data/adb/ksu/calculator.pkg 2>/dev/null | tr -d '[:space:]')
if [ -n "$LAUNCHER_PKG" ] && ! pm list packages -3 | grep -q "^package:$LAUNCHER_PKG$"; then
    LAUNCHER_PKG=""
fi
if [ -n "$LAUNCHER_PKG" ]; then
    EXCLUDED_PACKAGES="$EXCLUDED_PACKAGES $LAUNCHER_PKG"
    EXTRA_APP_LIST="\"$LAUNCHER_PKG\""
else
    EXTRA_APP_LIST=""
fi
if [ -n "$HMA_MANAGER_PKG" ] && [ "$HMA_MANAGER_PKG" != "$LAUNCHER_PKG" ]; then
    if [ -n "$EXTRA_APP_LIST" ]; then
        EXTRA_APP_LIST="$EXTRA_APP_LIST,\"$HMA_MANAGER_PKG\""
    else
        EXTRA_APP_LIST="\"$HMA_MANAGER_PKG\""
    fi
fi

EXCLUDE_REGEX=$(echo "$EXCLUDED_PACKAGES" | sed 's/ /|/g')
ALL_USER_PACKAGES=$(pm list packages -3 | sed 's/^package://' | grep -v -E "$EXCLUDE_REGEX")

OLD_COUNT=$(grep -o '"useWhitelist"' "$BODY_F" | wc -l | tr -d ' ')
SCOPE_PKGS=$(grep -o '"[^"]*":{"useWhitelist"' "$BODY_F" | sed 's/":{"useWhitelist"$//; s/^"//' | tr '\n' ' ')
SPACED=" $SCOPE_PKGS "

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

    SEP=""
    if [ "$ADDED" -gt 0 ] && [ "$(head -c 1 "$BODY_F")" != "}" ]; then
        SEP=","
    fi
    printf '%s' "$SEP" >> "$NEW_F"
    cat "$BODY_F" >> "$NEW_F"

    NEW_COUNT=$(grep -o '"useWhitelist"' "$NEW_F" 2>/dev/null | wc -l | tr -d ' ')
    OPEN=$(tr -cd '{' < "$NEW_F" | wc -c | tr -d ' ')
    CLOSE=$(tr -cd '}' < "$NEW_F" | wc -c | tr -d ' ')
    if [ "$NEW_COUNT" != "$((OLD_COUNT + ADDED))" ] || [ "$OPEN" != "$CLOSE" ] ||
        grep -qF ',}' "$NEW_F" || grep -qF ',]' "$NEW_F" || grep -qF ',,' "$NEW_F" ||
        grep -qF '{,' "$NEW_F"; then
        echo "自检没过（条目 $NEW_COUNT/$((OLD_COUNT + ADDED))，括号 $OPEN/$CLOSE），没动原文件"
        exit 1
    fi

    cat "$NEW_F" > "$CONFIG"
fi

for HIDDEN_PKG in "$LAUNCHER_PKG" "$HMA_MANAGER_PKG"; do
    [ -n "$HIDDEN_PKG" ] || continue
    [ $((OLD_COUNT + ADDED)) -gt 0 ] || continue
    HIDDEN_MENTIONS=$(grep -o "$HIDDEN_PKG" "$CONFIG" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$HIDDEN_MENTIONS" -lt $((OLD_COUNT + ADDED)) ]; then
        echo "额外隐藏 $HIDDEN_PKG 没写全：$((OLD_COUNT + ADDED)) 条配置里只出现 $HIDDEN_MENTIONS 次"
        exit 1
    fi
done


input keyevent KEYCODE_WAKEUP > /dev/null 2>&1
am start -n "$PKG/.MainActivityLauncher" > /dev/null 2>&1

sleep 2
timeout 5 input keyevent 4

if [ -n "$LAUNCHER_PKG" ]; then
    echo "新增 $ADDED 个、补预设 $UPGRADED 个、本来就没问题 $SKIPPED 个；并从它们里额外隐藏启动器（$LAUNCHER_PKG）"
else
    echo "新增 $ADDED 个、补预设 $UPGRADED 个、本来就没问题 $SKIPPED 个"
fi
exit 0
