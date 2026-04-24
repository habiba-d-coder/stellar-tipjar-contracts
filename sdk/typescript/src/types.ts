export type Network = 'testnet' | 'mainnet';

export interface SdkConfig {
  contractId: string;
  network: Network;
  /** Override the default RPC URL for the chosen network. */
  rpcUrl?: string;
}

export interface TipParams {
  creator: string;
  amount: bigint;
  tipper: string;
  memo?: string;
}

export interface TipResult {
  txHash: string;
  creator: string;
  amount: bigint;
}

export interface WithdrawResult {
  txHash: string;
  creator: string;
  amount: bigint;
}

export interface TipEvent {
  sender: string;
  amount: bigint;
}

export interface WithdrawEvent {
  amount: bigint;
}

/** Creator profile with optional category and tags. */
export interface CreatorProfile {
  address: string;
  username?: string;
  categoryId?: string;
  tags?: string[];
  totalTips?: bigint;
  withdrawableBalance?: bigint;
}
