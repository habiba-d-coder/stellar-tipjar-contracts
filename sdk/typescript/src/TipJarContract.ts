import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
} from '@stellar/stellar-sdk';

import { SendTipParams, TipResult, WithdrawResult } from './types';
import { getRpcUrl, retry } from './utils';

export class TipJarContract {
  private contract: Contract;
  private server: SorobanRpc.Server;
  private networkPassphrase: string;

  constructor(contractId: string, network: 'testnet' | 'mainnet') {
    this.contract = new Contract(contractId);
    this.server = new SorobanRpc.Server(getRpcUrl(network));

    this.networkPassphrase =
      network === 'testnet'
        ? Networks.TESTNET
        : Networks.PUBLIC;
  }

  /* ===============================
     WALLET: Freighter Sign
  ================================ */
  async signWithFreighter(xdr: string): Promise<string> {
    if (!(window as any).freighterApi) {
      throw new Error('Freighter wallet not installed');
    }

    return await (window as any).freighterApi.signTransaction(xdr, {
      networkPassphrase: this.networkPassphrase,
    });
  }

  /* ===============================
     WAIT FOR TX CONFIRMATION
  ================================ */
  async waitForConfirmation(hash: string): Promise<any> {
    let tx;

    do {
      tx = await this.server.getTransaction(hash);
      if (tx.status === 'SUCCESS') return tx;

      await new Promise((r) => setTimeout(r, 1500));
    } while (tx.status === 'NOT_FOUND');

    throw new Error('Transaction failed or not confirmed');
  }

  /* ===============================
     HANDLE RESPONSE
  ================================ */
  private async handleTxResponse(result: any): Promise<TipResult> {
    if (result.status !== 'PENDING') {
      throw new Error('Transaction submission failed');
    }

    const finalTx = await this.waitForConfirmation(result.hash);

    return {
      success: true,
      txHash: finalTx.hash,
    };
  }

  /* ===============================
     SEND TIP
  ================================ */
  async sendTip(params: SendTipParams): Promise<TipResult> {
    if (!params.creator.startsWith('G')) {
      throw new Error('Invalid creator address');
    }

    return retry(async () => {
      const account = await this.server.getAccount(params.tipper);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            'send_tip',
            params.creator,
            params.amount,
            params.tipper,
            params.memo || ''
          )
        )
        .setTimeout(30)
        .build();

      const xdr = tx.toXDR();

      const signedXdr = await this.signWithFreighter(xdr);

      const signedTx = TransactionBuilder.fromXDR(
        signedXdr,
        this.networkPassphrase
      );

      const result = await this.server.sendTransaction(signedTx);

      return this.handleTxResponse(result);
    });
  }

  /* ===============================
     GET BALANCE
  ================================ */
  async getBalance(creator: string): Promise<bigint> {
    const simulation = await this.server.simulateTransaction(
      this.contract.call('get_balance', creator)
    );

    return BigInt(simulation.result?.retval?._value || 0);
  }

  /* ===============================
     WITHDRAW
  ================================ */
  async withdraw(
    creator: string,
    amount: bigint
  ): Promise<WithdrawResult> {
    return retry(async () => {
      const account = await this.server.getAccount(creator);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          this.contract.call('withdraw', creator, amount)
        )
        .setTimeout(30)
        .build();

      const xdr = tx.toXDR();

      const signedXdr = await this.signWithFreighter(xdr);

      const signedTx = TransactionBuilder.fromXDR(
        signedXdr,
        this.networkPassphrase
      );

      const result = await this.server.sendTransaction(signedTx);

      return this.handleTxResponse(result);
    });
  }
}