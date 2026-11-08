use super::{
    interface_matches_target, LocalBinderTarget, SECURITY_LEVEL_TARGETS, TARGET_INTERFACES,
};
use std::sync::{Mutex, MutexGuard};

static STATE_TEST_LOCK: Mutex<()> = Mutex::new(());

pub(crate) fn clear_state_for_tests() {
    SECURITY_LEVEL_TARGETS.lock().expect("security level target map poisoned").clear();
    TARGET_INTERFACES.lock().expect("target interface map poisoned").clear();
}

pub(crate) fn state_test_guard() -> MutexGuard<'static, ()> {
    let guard = STATE_TEST_LOCK.lock().expect("tracker test lock poisoned");
    clear_state_for_tests();
    guard
}

#[test]
fn interface_is_bound_to_the_target_that_served_it() {
    let _guard = state_test_guard();
    let target = |ptr| LocalBinderTarget { ptr, cookie: ptr };
    let service = target(0x1000);
    let maintenance = target(0x2000);

    assert!(interface_matches_target(service, "IKeystoreService"));
    assert!(interface_matches_target(maintenance, "IKeystoreMaintenance"));
    assert!(interface_matches_target(service, "IKeystoreService"));
    assert!(interface_matches_target(maintenance, "IKeystoreMaintenance"));

    // A foreign token is refused and does not take the node over.
    assert!(!interface_matches_target(service, "IKeystoreMaintenance"));
    assert!(!interface_matches_target(maintenance, "IKeystoreService"));
    assert!(interface_matches_target(service, "IKeystoreService"));
}
