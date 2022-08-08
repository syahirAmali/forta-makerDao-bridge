import { Finding, HandleTransaction, TransactionEvent, FindingSeverity, FindingType } from "forta-agent";
import { providers } from "ethers";
import {
  checkEscrowBalance,
  checkToAddress,
  checkL2DaiBalance,
  ERC20_TRANSFER_EVENT,
  daiDetails,
  arbObject,
  optObject,
  L1_ARCHIVE_NODE,
  ARB_ARCHIVE_NODE,
  OPT_ARCHIVE_NODE,
  DAI_DETAILS_TYPE,
  NETWORK_TYPE,
} from "./utils";

export function provideHandleTransaction(
  l1Provider: providers.Provider,
  arbProvider: providers.Provider,
  optProvider: providers.Provider,
  transferEvent: string,
  daiDetails: DAI_DETAILS_TYPE,
  arbObject: NETWORK_TYPE,
  optObject: NETWORK_TYPE
): HandleTransaction {
  return async (txEvent: TransactionEvent): Promise<Finding[]> => {
    const findings: Finding[] = [];
    const daiTransferFunctionCall = txEvent.filterLog(transferEvent, daiDetails.L1Address);

    for (const transferEvent of daiTransferFunctionCall) {
      const { to, from, value } = transferEvent.args;

      if (to !== arbObject.escrow && to !== optObject.escrow) return findings;

      const [address, name] = checkToAddress(to);

      findings.push(
        Finding.fromObject({
          name: `DAI Transfer Event Emission to monitored Escrow`,
          description: `DAI Transfer Event Emission to ${name} escrow at: ${address}`,
          alertId: `${name}-TRANSFER-1`,
          severity: FindingSeverity.Info,
          type: FindingType.Info,
          protocol: "MakerDao",
          metadata: {
            from,
            to,
            escrow: name,
            value: value.toString(),
          },
        })
      );

      const l1balance = await checkEscrowBalance(address, l1Provider, txEvent.blockNumber - 1);

      const l2Provider = name === arbObject.name ? arbProvider : optProvider;

      const l2TotalSupply = await checkL2DaiBalance(l2Provider);

      if (l1balance.lt(l2TotalSupply)) {
        findings.push(
          Finding.fromObject({
            name: `DAI total supply exceeds balance on ${name}`,
            description: `L2 ${name} total supply of DAI exceeds and violates balance at L1 ${name} Escrow, at DAI contract address: ${daiDetails.L2Address}`,
            alertId: `${name}-BAL-1`,
            severity: FindingSeverity.Critical,
            type: FindingType.Exploit,
            protocol: "MakerDao",
            metadata: {
              address,
              name,
              l1Balance: l1balance.toString(),
              l2TotalSupply: l2TotalSupply.toString(),
            },
          })
        );
      }
    }
    return findings;
  };
}

export default {
  handleTransaction: provideHandleTransaction(
    L1_ARCHIVE_NODE,
    ARB_ARCHIVE_NODE,
    OPT_ARCHIVE_NODE,
    ERC20_TRANSFER_EVENT,
    daiDetails,
    arbObject,
    optObject
  ),
};
