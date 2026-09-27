#!/system/bin/sh
command -v resetprop >/dev/null 2>&1 || PATH="/data/adb/ksu/bin:/data/adb/magisk:$PATH"
export PATH

wait_for_boot() {
  local i=0
  while [ "$i" -lt 60 ]; do
    local boot
    boot=$(getprop sys.boot_completed)
    [ "$boot" = "1" ] && break
    i=$((i + 1))
    sleep 1
  done
}

disable_setting() {
  local namespace="$1"
  local key="$2"
  local value="$3"
  settings put "$namespace" "$key" "$value" >/dev/null 2>&1
}

check_reset_prop() {
  local NAME="$1"
  local EXPECTED="$2"
  local VALUE
  VALUE=$(resetprop "$NAME")
  [ -n "$VALUE" ] && [ "$VALUE" != "$EXPECTED" ] && resetprop -n "$NAME" "$EXPECTED"
}

contains_reset_prop() {
  local NAME="$1"
  local CONTAINS="$2"
  local NEWVAL="$3"
  local VALUE
  VALUE=$(resetprop "$NAME")
  [ -n "$VALUE" ] && [[ "$VALUE" == *"$CONTAINS"* ]] && resetprop -n "$NAME" "$NEWVAL"
}

wait_for_boot

disable_setting global adb_enabled 0
stop adbd >/dev/null 2>&1
setprop ctl.stop adbd >/dev/null 2>&1

check_reset_prop "ro.boot.vbmeta.device_state" "locked"
check_reset_prop "ro.boot.verifiedbootstate" "green"
check_reset_prop "ro.boot.flash.locked" "1"
check_reset_prop "ro.boot.veritymode" "enforcing"
check_reset_prop "ro.secureboot.lockstate" "locked"
check_reset_prop "ro.debuggable" "0"
check_reset_prop "ro.force.debuggable" "0"
check_reset_prop "ro.secure" "1"
check_reset_prop "ro.adb.secure" "1"
check_reset_prop "ro.build.type" "user"
check_reset_prop "ro.build.tags" "release-keys"
check_reset_prop "ro.bootmode" "normal"
