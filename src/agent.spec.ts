import {
  FindingType,
  FindingSeverity,
  Finding,
  HandleTransaction,
  TransactionEvent,
  getEthersProvider,
} from "forta-agent";
import { provideHandleTransaction } from "./agent";
import { TestTransactionEvent, createAddress } from "forta-agent-tools/lib/tests";
import {
  ARB_ARCHIVE_NODE,
  L1_ARCHIVE_NODE,
  OPT_ARCHIVE_NODE,
  ERC20_TRANSFER_EVENT,
  optObject,
  arbObject,
  daiDetails,
} from "./utils";
import { Interface } from "ethers/lib/utils";
import { Contract } from "ethers";

const TRANSFER_EVENT_INTERFACE = new Interface([ERC20_TRANSFER_EVENT]);
const MOCK_DAI_ADDRESS = daiDetails.L1Address;
const MOCK_L2_DAI_ADDRESS = daiDetails.L2Address;
const MOCK_DAI_INTERFACE = daiDetails.daiInterface;
const MOCK_FROM_ADDRESS = createAddress("0x0001a");
const MOCK_TO_ADDRESS = optObject.escrow;
const MOCK_TO_NAME = optObject.name;
const MOCK_TO_ADDRESS2 = arbObject.escrow;
const MOCK_TO_NAME2 = arbObject.name;

const MOCK_AMOUNTS = [1, 100, 1000, 10000];

const createTransferFinding = (escrowAddress: string, name: string, from: string, value: number): Finding => {
  return Finding.fromObject({
    name: "DAI Transfer Event Emission to monitored Escrow",
    description: `DAI Transfer Event Emission to ${name} escrow at: ${escrowAddress}`,
    alertId: `${name}-TRANSFER-1`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    protocol: "MakerDao",
    metadata: {
      escrow: name,
      from,
      to: escrowAddress,
      value: value.toString(),
    },
  });
};

const createTotalSupplyFinding = (name: string, l2Address: string, totalSupply: number, address: string): Finding => {
  return Finding.fromObject({
    name: `DAI total supply exceeds balance on ${name}`,
    description: `L2 ${name} total supply of DAI exceeds and violates balance at L1 ${name} Escrow, at DAI contract address: ${l2Address}`,
    alertId: `${name}-BAL-1`,
    severity: FindingSeverity.Critical,
    type: FindingType.Exploit,
    protocol: "MakerDao",
    metadata: {
      address,
      name,
      l1Balance: "0",
      l2TotalSupply: totalSupply.toString(),
    },
  });
};

describe("MakerDao Dai L1 Escrow Balance and L2 Total Supply Check", () => {
  let handleTransaction: HandleTransaction;
  let txEvent: TransactionEvent;
  let findings: Finding[];
  jest.setTimeout(10000);

  beforeAll(() => {
    handleTransaction = provideHandleTransaction(L1_ARCHIVE_NODE, ARB_ARCHIVE_NODE, OPT_ARCHIVE_NODE);
  });

  it("returns empty findings if there are no transfers to makerDao l1 escrow", async () => {
    txEvent = new TestTransactionEvent();
    findings = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([]);
  });

  it("returns a transaction finding on optimism if there is a transfer made to the optimism escrow", async () => {
    let provider = getEthersProvider();
    let block = await provider.getBlockNumber();

    const log = TRANSFER_EVENT_INTERFACE.encodeEventLog(TRANSFER_EVENT_INTERFACE.getEvent("Transfer"), [
      MOCK_FROM_ADDRESS,
      MOCK_TO_ADDRESS,
      1000,
    ]);
    txEvent = new TestTransactionEvent()
      .addAnonymousEventLog(MOCK_DAI_ADDRESS, log.data, ...log.topics)
      .setBlock(block);
    findings = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([
      createTransferFinding(MOCK_TO_ADDRESS, MOCK_TO_NAME, MOCK_FROM_ADDRESS, MOCK_AMOUNTS[2]),
    ]);
  });

  it("returns a transaction finding on arbitrum if there is a transfer made to the arbitrum escrow", async () => {
    let provider = getEthersProvider();
    let block = await provider.getBlockNumber();

    const log = TRANSFER_EVENT_INTERFACE.encodeEventLog(TRANSFER_EVENT_INTERFACE.getEvent("Transfer"), [
      MOCK_FROM_ADDRESS,
      MOCK_TO_ADDRESS2,
      1000,
    ]);
    txEvent = new TestTransactionEvent()
      .addAnonymousEventLog(MOCK_DAI_ADDRESS, log.data, ...log.topics)
      .setBlock(block);
    findings = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([
      createTransferFinding(MOCK_TO_ADDRESS2, MOCK_TO_NAME2, MOCK_FROM_ADDRESS, MOCK_AMOUNTS[2]),
    ]);
  });

  it("returns a total supply exceeded findings if there is a transfer made to the arbitrum escrow results in less than arbitrum dai total supply", async () => {
    // Block amount to trigger balance amount
    let block = 11291046;
    let provider = ARB_ARCHIVE_NODE;

    const log = TRANSFER_EVENT_INTERFACE.encodeEventLog(TRANSFER_EVENT_INTERFACE.getEvent("Transfer"), [
      MOCK_FROM_ADDRESS,
      MOCK_TO_ADDRESS2,
      1000,
    ]);
    txEvent = new TestTransactionEvent()
      .addAnonymousEventLog(MOCK_DAI_ADDRESS, log.data, ...log.topics)
      .setBlock(block);
    findings = await handleTransaction(txEvent);

    const l2Block: number = await provider.getBlockNumber();

    const tokenContract = new Contract(MOCK_L2_DAI_ADDRESS, MOCK_DAI_INTERFACE, provider);
    const balanceOf = await tokenContract.totalSupply({ blockTag: l2Block - 1 });

    expect(findings).toStrictEqual([
      createTransferFinding(MOCK_TO_ADDRESS2, MOCK_TO_NAME2, MOCK_FROM_ADDRESS, MOCK_AMOUNTS[2]),
      createTotalSupplyFinding(MOCK_TO_NAME2, MOCK_L2_DAI_ADDRESS, balanceOf, MOCK_TO_ADDRESS2),
    ]);
  });

  it("returns a total supply exceeded findings if there is a transfer made to the optimism escrow results in less than optimism dai total supply", async () => {
    // Block amount to trigger balance amount
    let block = 11291046;
    let provider = OPT_ARCHIVE_NODE;

    const log = TRANSFER_EVENT_INTERFACE.encodeEventLog(TRANSFER_EVENT_INTERFACE.getEvent("Transfer"), [
      MOCK_FROM_ADDRESS,
      MOCK_TO_ADDRESS,
      1000,
    ]);
    txEvent = new TestTransactionEvent()
      .addAnonymousEventLog(MOCK_DAI_ADDRESS, log.data, ...log.topics)
      .setBlock(block);
    findings = await handleTransaction(txEvent);

    const l2Block: number = await provider.getBlockNumber();

    const tokenContract = new Contract(MOCK_L2_DAI_ADDRESS, MOCK_DAI_INTERFACE, provider);
    const balanceOf = await tokenContract.totalSupply({ blockTag: l2Block - 1 });

    expect(findings).toStrictEqual([
      createTransferFinding(MOCK_TO_ADDRESS, MOCK_TO_NAME, MOCK_FROM_ADDRESS, MOCK_AMOUNTS[2]),
      createTotalSupplyFinding(MOCK_TO_NAME, MOCK_L2_DAI_ADDRESS, balanceOf, MOCK_TO_ADDRESS),
    ]);
  });

  it("returns multiple transaction finding on optimism if there is a transfer made to the optimism escrow", async () => {
    let provider = getEthersProvider();
    let block = await provider.getBlockNumber();

    const log = TRANSFER_EVENT_INTERFACE.encodeEventLog(TRANSFER_EVENT_INTERFACE.getEvent("Transfer"), [
      MOCK_FROM_ADDRESS,
      MOCK_TO_ADDRESS,
      1000,
    ]);

    txEvent = new TestTransactionEvent()
      .addAnonymousEventLog(MOCK_DAI_ADDRESS, log.data, ...log.topics)
      .setBlock(block)
      .addAnonymousEventLog(MOCK_DAI_ADDRESS, log.data, ...log.topics)
      .setBlock(block);

    findings = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([
      createTransferFinding(MOCK_TO_ADDRESS, MOCK_TO_NAME, MOCK_FROM_ADDRESS, MOCK_AMOUNTS[2]),
      createTransferFinding(MOCK_TO_ADDRESS, MOCK_TO_NAME, MOCK_FROM_ADDRESS, MOCK_AMOUNTS[2]),
    ]);
  });

  it("returns multiple total supply exceeded findings if there are multiple transfer made to the optimism escrow results in less than optimism dai total supply", async () => {
    // Block amount to trigger balance amount
    let block = 11291046;
    let provider = OPT_ARCHIVE_NODE;

    const log = TRANSFER_EVENT_INTERFACE.encodeEventLog(TRANSFER_EVENT_INTERFACE.getEvent("Transfer"), [
      MOCK_FROM_ADDRESS,
      MOCK_TO_ADDRESS,
      1000,
    ]);
    txEvent = new TestTransactionEvent()
      .addAnonymousEventLog(MOCK_DAI_ADDRESS, log.data, ...log.topics)
      .setBlock(block)
      .addAnonymousEventLog(MOCK_DAI_ADDRESS, log.data, ...log.topics)
      .setBlock(block);

    findings = await handleTransaction(txEvent);

    const l2Block: number = await provider.getBlockNumber();

    const tokenContract = new Contract(MOCK_L2_DAI_ADDRESS, MOCK_DAI_INTERFACE, provider);
    const balanceOf = await tokenContract.totalSupply({ blockTag: l2Block - 1 });

    expect(findings).toStrictEqual([
      createTransferFinding(MOCK_TO_ADDRESS, MOCK_TO_NAME, MOCK_FROM_ADDRESS, MOCK_AMOUNTS[2]),
      createTotalSupplyFinding(MOCK_TO_NAME, MOCK_L2_DAI_ADDRESS, balanceOf, MOCK_TO_ADDRESS),
      createTransferFinding(MOCK_TO_ADDRESS, MOCK_TO_NAME, MOCK_FROM_ADDRESS, MOCK_AMOUNTS[2]),
      createTotalSupplyFinding(MOCK_TO_NAME, MOCK_L2_DAI_ADDRESS, balanceOf, MOCK_TO_ADDRESS),
    ]);
  });

  it("returns multiple total supply exceeded findings if there are multiple transfer made to the different escrow results in less than both dai total supply", async () => {
    // Block amount to trigger balance amount
    let block = 11291046;
    let provider = OPT_ARCHIVE_NODE;
    let provider2 = ARB_ARCHIVE_NODE;

    const log = TRANSFER_EVENT_INTERFACE.encodeEventLog(TRANSFER_EVENT_INTERFACE.getEvent("Transfer"), [
      MOCK_FROM_ADDRESS,
      MOCK_TO_ADDRESS,
      1000,
    ]);
    const log2 = TRANSFER_EVENT_INTERFACE.encodeEventLog(TRANSFER_EVENT_INTERFACE.getEvent("Transfer"), [
      MOCK_FROM_ADDRESS,
      MOCK_TO_ADDRESS2,
      1000,
    ]);
    txEvent = new TestTransactionEvent()
      .addAnonymousEventLog(MOCK_DAI_ADDRESS, log.data, ...log.topics)
      .setBlock(block)
      .addAnonymousEventLog(MOCK_DAI_ADDRESS, log2.data, ...log2.topics)
      .setBlock(block);

    findings = await handleTransaction(txEvent);

    const l2Block: number = await provider.getBlockNumber();

    const tokenContract = new Contract(MOCK_L2_DAI_ADDRESS, MOCK_DAI_INTERFACE, provider);
    const balanceOf = await tokenContract.totalSupply({ blockTag: l2Block - 1 });

    const l2BlockArb: number = await provider2.getBlockNumber();

    const tokenContract2 = new Contract(MOCK_L2_DAI_ADDRESS, MOCK_DAI_INTERFACE, provider2);
    const balanceOf2 = await tokenContract2.totalSupply({ blockTag: l2BlockArb - 1 });

    expect(findings).toStrictEqual([
      createTransferFinding(MOCK_TO_ADDRESS, MOCK_TO_NAME, MOCK_FROM_ADDRESS, MOCK_AMOUNTS[2]),
      createTotalSupplyFinding(MOCK_TO_NAME, MOCK_L2_DAI_ADDRESS, balanceOf, MOCK_TO_ADDRESS),
      createTransferFinding(MOCK_TO_ADDRESS2, MOCK_TO_NAME2, MOCK_FROM_ADDRESS, MOCK_AMOUNTS[2]),
      createTotalSupplyFinding(MOCK_TO_NAME2, MOCK_L2_DAI_ADDRESS, balanceOf2, MOCK_TO_ADDRESS2),
    ]);
  });
});
