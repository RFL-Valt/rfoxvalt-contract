# BEP20Token

## Requrements
- truffle v5.1.43 (Solidity v0.5.16 (solc-js), Node v14.8.0, Web3.js v1.2.1)
- ganache test rpc.

## Getting started
```
$ npm install 
```

## Deploy BEP-20 token
Set ```seed``` ```api key``` in `.env` file.

## Deploying BEP20 token to BEP-2 token (for bsc_testnet)
```
$ truffle migrate --reset --network bsc_testnet
```

## Test
```
$ truffle test
```
