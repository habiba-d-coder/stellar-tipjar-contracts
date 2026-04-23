use soroban_sdk::{BytesN, Env, String};

use crate::bridge::SourceChain;
use crate::DataKey;

/// Storage key for the set of already-processed source tx hashes (replay guard).
/// Stored as `DataKey::BridgeProcessed(hash)` → bool.

/// Returns `true` if this source transaction has already been processed.
pub fn is_processed(env: &Env, source_tx_hash: &BytesN<32>) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::BridgeProcessed(source_tx_hash.clone()))
        .unwrap_or(false)
}

/// Marks a source transaction as processed to prevent replay.
pub fn mark_processed(env: &Env, source_tx_hash: &BytesN<32>) {
    env.storage()
        .persistent()
        .set(&DataKey::BridgeProcessed(source_tx_hash.clone()), &true);
}

/// Validates a bridge tip request.
///
/// Checks:
/// 1. Amount is positive.
/// 2. The source transaction has not already been processed (replay protection).
///
/// Returns `Ok(())` on success or a descriptive error string on failure.
pub fn validate_bridge_tip(
    env: &Env,
    source_chain: &SourceChain,
    source_tx_hash: &BytesN<32>,
    amount: i128,
) -> Result<(), String> {
    let _ = source_chain; // chain-specific rules can be added here

    if amount <= 0 {
        return Err(String::from_str(env, "invalid amount"));
    }

    if is_processed(env, source_tx_hash) {
        return Err(String::from_str(env, "already processed"));
    }

    Ok(())
}
