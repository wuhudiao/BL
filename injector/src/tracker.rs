use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

use crate::hook::binder::LocalBinderTarget;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SecurityLevelTargetInfo {
    pub security_level: crate::android::hardware::security::keymint::SecurityLevel::SecurityLevel,
}

static SECURITY_LEVEL_TARGETS: LazyLock<
    Mutex<HashMap<LocalBinderTarget, SecurityLevelTargetInfo>>,
> = LazyLock::new(|| Mutex::new(HashMap::new()));
#[cfg(test)]
static STATE_TEST_LOCK: Mutex<()> = Mutex::new(());

pub(crate) fn remember_security_level_target(
    target: LocalBinderTarget,
    info: SecurityLevelTargetInfo,
) {
    SECURITY_LEVEL_TARGETS
        .lock()
        .expect("security level target map poisoned")
        .insert(target, info);
}

pub(crate) fn lookup_security_level_target(
    target: LocalBinderTarget,
) -> Option<SecurityLevelTargetInfo> {
    SECURITY_LEVEL_TARGETS
        .lock()
        .expect("security level target map poisoned")
        .get(&target)
        .copied()
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
    let mut targets = TARGET_INTERFACES
        .lock()
        .expect("target interface map poisoned");
    match targets.get(&target) {
        Some(observed) => observed == interface,
        None => {
            targets.insert(target, interface.to_owned());
            true
        }
    }
}

#[cfg(test)]
pub fn clear_state_for_tests() {
    SECURITY_LEVEL_TARGETS
        .lock()
        .expect("security level target map poisoned")
        .clear();
    TARGET_INTERFACES
        .lock()
        .expect("target interface map poisoned")
        .clear();
}

#[cfg(test)]
pub fn state_test_guard() -> std::sync::MutexGuard<'static, ()> {
    let guard = STATE_TEST_LOCK
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    clear_state_for_tests();
    guard
}

#[cfg(test)]
mod tests {
    use super::*;

    fn target(ptr: u64) -> LocalBinderTarget {
        LocalBinderTarget { ptr, cookie: ptr }
    }

    #[test]
    fn interface_is_bound_to_the_target_that_served_it() {
        let _guard = state_test_guard();
        let service = target(0x1000);
        let maintenance = target(0x2000);

        assert!(interface_matches_target(service, "IKeystoreService"));
        assert!(interface_matches_target(
            maintenance,
            "IKeystoreMaintenance"
        ));
        assert!(interface_matches_target(service, "IKeystoreService"));
        assert!(interface_matches_target(
            maintenance,
            "IKeystoreMaintenance"
        ));

        // A foreign token is refused and does not take the node over.
        assert!(!interface_matches_target(service, "IKeystoreMaintenance"));
        assert!(!interface_matches_target(maintenance, "IKeystoreService"));
        assert!(interface_matches_target(service, "IKeystoreService"));
    }
}
