import { providers, Contract, utils, BigNumber } from "ethers";
import LRU from "lru-cache";

export default class L2SupplyFetcher {
  readonly provider: providers.Provider;
  private cache: LRU<number, BigNumber>;
  private tokenContract: Contract;

  constructor(provider: providers.Provider, tokenAddress: string, tokenInterface: utils.Interface) {
    this.provider = provider;
    this.cache = new LRU<number, BigNumber>({
      max: 10000,
    });
    this.tokenContract = new Contract(tokenAddress, tokenInterface, this.provider);
  }

  public async fetchTotalSupply(): Promise<BigNumber> {
    const key: number = await this.provider.getBlockNumber();

    if (this.cache.has(key)) return this.cache.get(key) as Promise<any>;

    let balanceOf;

    try {
      balanceOf = await this.tokenContract.totalSupply({ blockTag: key - 1 });
    } catch (e: any) {
      console.error("Error: ", e?.message);
    }

    this.cache.set(key, balanceOf);

    return this.cache.get(key) as any;
  }
}
