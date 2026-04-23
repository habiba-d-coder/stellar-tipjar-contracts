use soroban_sdk::{symbol_short, token, Address, Env};

use crate::bridge::{validator, BridgeTip};
use crate::DataKey;
use crate::TipJarError;

/// Processes a bridged tip submitted by an authorised relayer.
///
/// The relayer must match the stored `DataKey::BridgeRelayer` address.
/// Validates the tip, transfers funds from the relayer into contract escrow,
/// credits the creator's balance, emits a `("bridge", creator)` event, and
/// marks the source transaction as processed (replay protection).
pub fn process_bridge_tip(env: &Env, relayer: &Address, tip: &BridgeTip) -> Result<(), TipJarError> {
    // 1. Authenticate relayer.
    relayer.require_auth();
    let stored_relayer: Address = env
        .storage()
        .instance()
        .get(&DataKey::BridgeRelayer)
        .ok_or(TipJarError::Unauthorized)?;
    if *relayer != stored_relayer {
        return Err(TipJarError::Unauthorized);
    }

    // 2. Validate amount and replay guard.
    validator::validate_bridge_tip(env, &tip.source_chain, &tip.source_tx_hash, tip.amount)
        .map_err(|_| TipJarError::InvalidAmount)?;

    // 3. Resolve bridge token.
    let token_address: Address = env
        .storage()
        .instance()
        .get(&DataKey::BridgeToken)
        .ok_or(TipJarError::TokenNotWhitelisted)?;

    // 4. Pull funds from relayer into contract escrow.
    token::Client::new(env, &token_address).transfer(
        relayer,
        &env.current_contract_address(),
        &tip.amount,
    );

    // 5. Credit creator balance and historical total.
    let bal_key = DataKey::CreatorBalance(tip.creator.clone(), token_address.clone());
    let balance: i128 = env.storage().instance().get(&bal_key).unwrap_or(0);
    env.storage().instance().set(&bal_key, &(balance + tip.amount));

    let tot_key = DataKey::CreatorTotal(tip.creator.clone(), token_address);
    let total: i128 = env.storage().instance().get(&tot_key).unwrap_or(0);
    env.storage().instance().set(&tot_key, &(total + tip.amount));

    // 6. Mark source tx as processed (replay protection).
    validator::mark_processed(env, &tip.source_tx_hash);

    // 7. Emit event.
    env.events().publish(
        (symbol_short!("bridge"), tip.creator.clone()),
        (tip.source_chain.clone(), tip.source_tx_hash.clone(), tip.amount),
    );

    Ok(())
}
