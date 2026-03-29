export interface SendTipParams {
  creator: string;
  amount: bigint;
  tipper: string;
  memo?: string;
}

export interface TipResult {
  success: boolean;
  txHash: string;
}

export interface WithdrawResult {
  success: boolean;
  txHash: string;
}