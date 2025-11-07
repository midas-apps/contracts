# Midas smart contracts repository

This repository contains all smart contracts related to the [midas.app](https://midas.app) project including chain like Ethereum, Base, HyperEVM, BSC [...]

## The structure of the repository

- [.openzeppelin/](./.openzeppelin/) - contains files related to openzeppelin proxy deployment (such as deployment addresses, storage layout, etc. ).
- [config/](./config/) - contains application static configuration (like network configs, TS types etc.).
- [contracts/](./contracts/) - root folder for smart contracts source code.
- [deployments/](./deployments/) - *deprecated*. hardhat-deploy deployment folder.
- [docgen/](./docgen/) - contains auto generated smart-contracts documentation.
- [helpers/](./helpers/) - shared helpers utilities.
- [scripts/](./scripts/) - hardhat scripts. Currently contains deploy/upgrade scripts for smart contracts.
- [tasks/](./tasks/) - hardhat tasks. Currently contains calldata generator scripts.
- [test/](./test/) - smart contracts tests.

## How to run?

First, install the dependencies using `yarn`

```
yarn install
```

To build smart contracts, execute

```
yarn build
```

To run tests, execute

```
yarn test
```

To run test`s coverage, execute

```
yarn coverage
```

To use Slither analyzer, first install it. [Link](https://github.com/crytic/slither)

To run the analyzer, execute

```
yarn slither
```


To generate smart contract`s documentation, execute

```
yarn docgen
```

## Smart contracts API documentation

All smart contracts are documented using NatSpec format. To review the latest generated documentation, please check the [docgen/index.md](./docgen/index.md) file.


## High level contracts overview

### **mTBILL**
mTBILL is a regulatory compliant natively-yield bearing ERC20 stablecoin.

mTBILL is backed 100% by U.S. T-Bills, which represent the 'risk-free' investment in traditional finance equivalent to staking Ether on the Ethereum Mainnet and that is the reason why the token is named as ‘staked’ USD.

Token can be minted/burned by the addresses that have roles `M_TBILL_MINT_OPERATOR_ROLE` and `M_TBILL_BURN_OPERATOR_ROLE` on [MidasAccessControl](./contracts/access/MidasAccessControl.sol) respectively. Currently, only project owner(s) will have those roles. 

The purpose of having a burning role is to be able to make mTBILLs redemptions manually (without user`s interaction with contracts).

mTBILL is an ERC20 token with a few extensions:
1. ERC20Pausable - token`s transfers can be paused/unpaused by the project owner(s).
2. Blacklistable - users that are marked as blacklisted cannot receive or transfer tokens to anyone else. Only blacklist operators can add/remove users from the blacklist.

The token also supports recording its own on-chain metadata, that can be modified by project owner(s) by calling mTBILL.setMetadata(...) function.


### **DataFeed**

DataFeed its a contract, the main purpose of which is to wrap ChainLinks AggregatorV3 data feed and to convert answer to base18 number. Currently, there are 2 aggregators that were used and wrapped using DataFeed
- [EUR/USD](https://data.chain.link/ethereum/mainnet/fiat/eur-usd) - used to denominate the minimal deposit amount in EUR. 
- [IBO1/USD](https://data.chain.link/ethereum/mainnet/indexes/ib01-usd) - used to calculate the USD/mTBILL exchange price. Currently, we do not utilize it in our smart contracts, but we plan to do it in future

### **Vaults**

Its a set of smart contracts, that are supposed to make mTBILL minting and burning more transparent for the end-user. Vaults also operates with tokens that we called USD tokens. USD token - it`s a stable coin that is supported by the vault and threated as a token that is 1:1 equivalent to USD. All vaults do have it own lists of supported USD tokens.

Vaults can be used only by addresses, that have GreenListed Role on the [MidasAccessControl](./contracts/access/MidasAccessControl.sol) contract

There are 2 types of vaults presented in the project - Deposit and Redemption vaults.

#### ***Deposit Vault***
Deposit is the process of minting mTBILL tokens by transferring USD tokens from user. The exchange ratio is determined by the vault administrator individually for each deposit. USD tokens are stored on the admin`s wallet

The process consists of 2 steps:
1. Deposit request initiation.
2. Deposit request fulfillment.

The initiation is done by the user that wants to transfer his USD tokens and receive mTBILL token instead. After the initiation of transaction, his USD tokens are immediately transferred from him, and now he needs to wait for deposit request fulfillment from the vault administrator.

The fulfillment is done by the vault administrator. Administrator should deposit the funds to the bank, calculate the output mTBILL amount and mint corresponding amount of mTBILL to the user. The exchange ratio and the fees are calculated by the project owner off-chain

Administrator may also decide to cancel the deposit request. In this case, admin will transfer USD tokens back to the user

#### ***Redemption Vault***

Redemption is the process of redeeming USD tokens by burning mTBILL. The exchange ratio is determined by the vault administrator individually for each redemption. The process is consist of 2 steps: 

1. Redemption request initiation.
2. Redemption request fulfillment.

The initiation is done by the user, that want to burn his mTBILL tokens and receive USD token instead. After the initiation transaction, his mTBILL tokens transfers to the owner`s wallet and now he need to wait for redemption request fulfillment from the vault administrator. 

The fulfillment is done by the vault administrator. Administrator should withdraw the funds from the bank, convert them into the USD token (that was selected by user during the initiation step) and send tokens to the user. The exchange ratio and the fees are calculated by the project owner off-chain

Administrator may also decide to cancel the redemption request. In this case, mTBILL tokens will be transferred back to the user

## Smart contract addresses

|Contract Name|Sepolia|Mainnet| 
|-|-|-|
|**mTBILL**|`0xDd82C21F721746Bd77D84E8B05EdDED0f8e50980`|`0xDD629E5241CbC5919847783e6C96B2De4754e438`|
|**MidasAccessControl**|`0x44af5F38a9b4bf70696fa1bE922e70c2Af679FD7`|`0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B`|
|**DataFeed IB01/USD**|`0x4E677F7FE252DE44682a913f609EA3eb6F29DC3E`|`0xc747FdDFC46CDC915bEA866D519dFc5Eae5c947f`|
|**DataFeed EUR/USD**|`0xE23c07Ecad6D822500CbE8306d72A90578CA9F11`|`0x6022a020Ca5c611304B9E97F37AEE0C38455081A`|
|**DepositVault**|`0xc2c78dcb340935509634B343840fAa5052367f29`|`0xcbCf1e67F1988e2572a2A620321Aef2ff73369f0`|
|**RedemptionVault**|`0xbCe90740A9C6B59FC1D45fdc0e1F3b6C795c85dC`|`0x8978e327FE7C72Fa4eaF4649C23147E279ae1470`|
