import { utils, Contract, providers } from "ethers";

require('dotenv').config()

const ERC20_TRANSFER_EVENT: string = "event Transfer(address indexed from, address indexed to, uint256 value)";

const arb: string = "ARBITRUM";
const opt: string = "OPTIMISM";
const L1_OPTIMISM_ESCROW: string = "0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65";
const L1_ARBITRUM_ESCROW: string = "0xA10c7CE4b876998858b1a9E12b10092229539400";
const ARB_RPC: string = "https://rpc.ankr.com/arbitrum";
const OPT_RPC: string = "https://rpc.ankr.com/optimism";
const ARB_RPC_PROVIDER: providers.Provider = new providers.JsonRpcProvider(ARB_RPC);
const OPT_RPC_PROVIDER: providers.Provider = new providers.JsonRpcProvider(OPT_RPC);

const L1_ARCHIVE_NODE: providers.Provider = new providers.JsonRpcProvider(process.env.ETH_RPC)
const OPT_ARCHIVE_NODE: providers.Provider = new providers.JsonRpcProvider(process.env.OPT_RPC)
const ARB_ARCHIVE_NODE: providers.Provider = new providers.JsonRpcProvider(process.env.ARB_RPC)

type networkType = {
    name: string,
    escrow: string,
    rpcProvider: providers.Provider,
}

const arbObject: networkType = {
    name: arb,
    escrow: L1_ARBITRUM_ESCROW,
    rpcProvider: ARB_RPC_PROVIDER
}

const optObject: networkType = {
    name: opt,
    escrow: L1_OPTIMISM_ESCROW,
    rpcProvider: OPT_RPC_PROVIDER
}

const L1_DAI: string = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const L2_DAI: string = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
const DAI_BALANCE_ABI: string = "function balanceOf(address account) external view returns (uint256)";
const DAI_TOTALSUPPLY_ABI: string = "function totalSupply() external view returns (uint256)";
const DAI_IFACE: utils.Interface = new utils.Interface([DAI_BALANCE_ABI, DAI_TOTALSUPPLY_ABI]);

const daiDetails: {L1Address: string, L2Address: string, daiInterface: utils.Interface} = {
    L1Address: L1_DAI,
    L2Address: L2_DAI,
    daiInterface: DAI_IFACE
}

const checkToAddress = (toAddress: string) => {
    let 
      address: string = toAddress === L1_ARBITRUM_ESCROW ? L1_ARBITRUM_ESCROW : L1_OPTIMISM_ESCROW, 
      name: string = toAddress === L1_ARBITRUM_ESCROW ? arb : opt;
  
    return [ address, name ] as const;
}
  
const checkEscrowBalance = async (address: string, provider: providers.Provider, block: number | string) => {  
    const daiContract = new Contract(L1_DAI, DAI_IFACE, provider);
    let balanceOf
    try {
        balanceOf = await daiContract.balanceOf(address, {blockTag: block});
    }catch (e: any) {
        console.error("Error: ", e?.message)
    }
  
    return balanceOf;
}
  
const checkL2DaiBalance = async (provider: providers.Provider) => {  
    const daiContract = new Contract(L2_DAI, DAI_IFACE, provider);
    const block: number | string = await provider.getBlockNumber() 
    const balanceOf = await daiContract.totalSupply({blockTag: block - 1});

    return balanceOf;
}

export { ERC20_TRANSFER_EVENT,  arbObject, optObject, daiDetails, checkToAddress, checkEscrowBalance, checkL2DaiBalance, L1_ARCHIVE_NODE, ARB_ARCHIVE_NODE, OPT_ARCHIVE_NODE}