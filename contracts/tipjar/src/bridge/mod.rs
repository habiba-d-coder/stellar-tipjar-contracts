pub mod relayer;
pub mod validator;

use soroban_sdk::{contracttype, Address, BytesN, String};

/// Supported source chains for bridged tips.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SourceChain {
    Ethereum,
    Polygon,
    BinanceSmartChain,
    Avalanche,
    Arbitrum,
}

/// A bridge tip request submitted by a relayer.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BridgeTip {
    /// Originating chain.
    pub source_chain: SourceChain,
    /// Unique transaction hash on the source chain (32 bytes).
    pub source_tx_hash: BytesN<32>,
    /// Stellar creator address to receive the tip.
    pub creator: Address,
    /// Amount in the Stellar tip token's smallest unit.
    pub amount: i128,
    /// Optional message from the tipper.
    pub message: String,
}
