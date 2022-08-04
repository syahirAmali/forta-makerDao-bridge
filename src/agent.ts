import {
  Finding,
  HandleTransaction,
  TransactionEvent,
  FindingSeverity,
  FindingType,
  getEthersProvider,
} from "forta-agent";
import { providers } from "ethers";
import { checkEscrowBalance, checkToAddress, checkL2DaiBalance, ERC20_TRANSFER_EVENT, daiDetails, arbObject, optObject, L1_ARCHIVE_NODE, ARB_ARCHIVE_NODE, OPT_ARCHIVE_NODE } from "./utils";

export function provideHandleTransaction(l1Provider: providers.Provider, arbProvider: providers.Provider, optProvider: providers.Provider): HandleTransaction {
  return async (txEvent: TransactionEvent): Promise<Finding[]> => {
    const findings: Finding[] = [];

    const daiTransferFunctionCall = txEvent.filterLog(ERC20_TRANSFER_EVENT, daiDetails.L1Address);

    for(const transferEvent of daiTransferFunctionCall) {
      const { to, from, value } = transferEvent.args;

      if (to !== arbObject.escrow && to !== optObject.escrow ) return findings;

      const [ address, name ] = checkToAddress(to);

      findings.push(
        Finding.fromObject({
          name: `DAI Transfer Event Emission to monitored Escrow`,
          description: `DAI Transfer Event Emission to ${name} escrow at: ${address}`,
          alertId: `${name}-TRANSFER-1`,
          severity: FindingSeverity.Info,
          type: FindingType.Info,
          metadata: {
            from,
            to,
            escrow: name,
            value: value.toString()
          },
        })
      );

      const l1balance = await checkEscrowBalance(address, l1Provider, txEvent.blockNumber - 1);

      const l2Provider = name === arbObject.name ? arbProvider : optProvider;

      const l2Balance = await checkL2DaiBalance(l2Provider);

      if(l1balance.lt(l2Balance)){
        findings.push(
          Finding.fromObject({
            name: `DAI total supply exceeds balance`,
            description: `L2 ${name} total supply of DAI exceeds and violates balance at L1 ${name} Escrow, at DAI contract address: ${daiDetails.L2Address}  `,
            alertId: `${name}-BAL-1`,
            severity: FindingSeverity.High,
            type: FindingType.Exploit,
            metadata: {
              address,
              name
            },
          })
        );
      }
    }
    return findings;
  }
}

export default {
  handleTransaction: provideHandleTransaction(L1_ARCHIVE_NODE, ARB_ARCHIVE_NODE, OPT_ARCHIVE_NODE),
};
