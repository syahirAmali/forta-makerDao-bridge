# MakerDao Invariant Total Supply Bot

## Description

This bot detects DAI `Transfer` event emissions to the MakerDao's L1 Escrows for Optimism and Arbitrum, triggering a finding on each transfer, and also when the L2 total supply is more than the L1 escrow balance.

## Supported Chains

- Ethereum

## Alerts

- OPTIMISM-TRANSFER-1
  - Fired when a DAI transfer event is emitted to the Optimism Escrow
  - Severity is always set to "info"
  - Type is always set to "info"
  - Metadata fields
    - `from`: senders address
    - `to`: escrow address,
    - `escrow`: escrow name,
    - `value`: how many tokens were sent

- ARBITRUM-TRANSFER-1
  - Fired when a DAI transfer event is emitted to the Arbitrum Escrow
  - Severity is always set to "info"
  - Type is always set to "info"
  - Metadata fields
    - `from`: senders address
    - `to`: escrow address,
    - `escrow`: escrow name,
    - `value`: how many tokens were sent

- OPTIMISM-BAL-1
  - Fired when a DAI balance of an escrow is less than the total supply of its l2
  - Severity is always set to "critical"
  - Type is always set to "exploit"
  - Metadata fields
    - `address`: escrow address 
    - `name`: name of the network
    - `l1Balance`: balance of DAI escrow on l1
    - `l2TotalSupply`: total supply of DAI on l2

- ARBITRUM-BAL-1
  - Fired when a DAI balance of an escrow is less than the total supply of its l2
  - Severity is always set to "critical"
  - Type is always set to "exploit"
  - Metadata fields
    - `address`: escrow address 
    - `name`: name of the network
    - `l1Balance`: balance of DAI escrow on l1
    - `l2TotalSupply`: total supply of DAI on l2

## Test Data

The bot behaviour can be verified with the following transactions:

DAI `Transfer` event emission to Aribitrum Escrow

- [0xfd9459c41532644679b146e2b3e2f27fa69cf51845e68bed95e8da8fa23e5678](https://etherscan.io/tx/0xfd9459c41532644679b146e2b3e2f27fa69cf51845e68bed95e8da8fa23e5678)

DAI `Transfer`event emission to Optimism Escrow

- [0x72fc7fd284c36dbc83a219ec5720866aca4c3ccfda630feae1633a637e874705](https://etherscan.io/tx/0x72fc7fd284c36dbc83a219ec5720866aca4c3ccfda630feae1633a637e874705)
