use crate::hook::binder::LocalBinderTarget;
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

#[cfg(test)]
pub(crate) mod tests;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SecurityLevelTargetInfo {
    pub security_level: crate::android::hardware::security::keymint::SecurityLevel::SecurityLevel,
}

static SECURITY_LEVEL_TARGETS: LazyLock<
    Mutex<HashMap<LocalBinderTarget, SecurityLevelTargetInfo>>,
> = LazyLock::new(|| Mutex::new(HashMap::new()));

pub(crate) fn remember_security_level_target(
    target: LocalBinderTarget,
    info: SecurityLevelTargetInfo,
) {
    SECURITY_LEVEL_TARGETS.lock().expect("security level target map poisoned").insert(target, info);
}

pub(crate) fn lookup_security_level_target(
    target: LocalBinderTarget,
) -> Option<SecurityLevelTargetInfo> {
    SECURITY_LEVEL_TARGETS.lock().expect("security level target map poisoned").get(&target).copied()
}

/// Interface token each binder node has already been observed to serve.
///
/// An AOSP generated stub calls `enforceInterface(<its own descriptor>)` before it
/// dispatches, so a node never executes a request that carries another interface's token.
/// The token inside the parcel is therefore not authority on its own: the node that
/// received the transaction is what decides. Bind the two together on first sight and
/// leave a later disagreement to the System, which rejects it exactly as AOSP does.
///
/// The map is keyed by node identity and lives for the injected process. A poisoned entry
/// would need an interface-mismatched transaction to be the very first one ever observed on
/// a keystore2 node; keystore2 publishes its `IKeystoreService` node at startup and serves
/// `getSecurityLevel`/`getKeyEntry` on it immediately, so the first observed token is the
/// node's own in normal operation.
static TARGET_INTERFACES: LazyLock<Mutex<HashMap<LocalBinderTarget, String>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Whether `interface` may be dispatched for the node that received this transaction.
pub(crate) fn interface_matches_target(target: LocalBinderTarget, interface: &str) -> bool {
    let mut targets = TARGET_INTERFACES.lock().expect("target interface map poisoned");
    match targets.get(&target) {
        Some(observed) => observed == interface,
        None => {
            targets.insert(target, interface.to_owned());
            true
        }
    }
}
