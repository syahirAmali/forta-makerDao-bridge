import { providers, Contract, utils, BigNumber } from "ethers";
import LRU from "lru-cache";

export default class L1BalanceFetcher {
  readonly provider: providers.Provider;
  private cache: LRU<number, BigNumber>;
  private tokenContract: Contract;
  private escrowAddress: string;

  constructor(
    provider: providers.Provider,
    tokenAddress: string,
    tokenInterface: utils.Interface,
    escrowAddress: string
  ) {
    this.provider = provider;
    this.cache = new LRU<number, BigNumber>({
      max: 10000,
    });
    this.tokenContract = new Contract(tokenAddress, tokenInterface, this.provider);
    this.escrowAddress = escrowAddress;
  }

  public async fetchEscrowBalance(block: number): Promise<BigNumber> {
    const key: number = block;

    if (this.cache.has(key)) return this.cache.get(key) as Promise<any>;

    let balanceOf;

    try {
      balanceOf = await this.tokenContract.balanceOf(this.escrowAddress, { blockTag: block - 1 });
    } catch (e: any) {
      console.error("Error: ", e?.message);
    }

    this.cache.set(key, balanceOf);

    return this.cache.get(key) as any;
  }
}
