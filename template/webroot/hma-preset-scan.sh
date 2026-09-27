#!/system/bin/sh
UNZIP="$(command -v unzip 2>/dev/null)"
[ -n "$UNZIP" ] || UNZIP="/data/adb/ksu/bin/busybox unzip"

LIST=/data/local/tmp/omk-scan.$$
A=$LIST.a
B=$LIST.b
trap 'rm -f "$A" "$B"' EXIT

scan_entries() {
  for line in $(pm list packages -f); do
    line="${line#package:}"
    pkg="${line##*=}"
    apk="${line%=$pkg}"
    [ -f "$apk" ] || continue
    if $UNZIP -l "$apk" 2>/dev/null | grep -q -F \
        -e 'assets/xposed_init' -e 'META-INF/xposed/module.prop' \
        -e 'libkernelsu.so' -e 'libapd.so' -e 'libmagisk.so' -e 'libmagiskboot.so' \
        -e 'libmmrl-file-manager.so' -e 'libmmrl-kernelsu.so' -e 'libzakoboot.so' \
        -e 'assets/gamma_profiles.json' -e 'assets/main.jar' \
        -e 'assets/APKEditor.pk8' -e 'assets/testkey.pk8' -e 'assets/key/testkey.pk8'; then
      echo "$pkg" >> "$A"
    fi
  done
}

scan_manifest() {
  for line in $(pm list packages -f -3); do
    line="${line#package:}"
    pkg="${line##*=}"
    apk="${line%=$pkg}"
    [ -f "$apk" ] || continue
    man="$($UNZIP -p "$apk" AndroidManifest.xml 2>/dev/null | tr -d '\000')"
    [ -n "$man" ] || continue
    hit=0
    case "$man" in
      *rikka.shizuku.ShizukuProvider*|*com.rosan.dhizuku.server.provider*) hit=1 ;;
      *ACCESS_SUPERUSER*)
        case "$pkg" in
          org.mozilla.gecko|*MEIZUPUSH*|hk.alipay.wallet|com.tencent.mm|com.heytap.*|com.netmera.Netmera) ;;
          *) hit=1 ;;
        esac ;;
    esac
    [ "$hit" = 1 ] && echo "$pkg" >> "$B"
  done
}

scan_entries &
scan_manifest &
wait

cat "$A" "$B" 2>/dev/null | sort -u
