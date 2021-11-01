const { encodeCall } = require("@openzeppelin/upgrades");

// const MockRFOX = artifacts.require("MockRFOX.sol");
//const RFOXNFT = artifacts.require("RFOXNFT.sol");
const RFOXAUCTION = artifacts.require("RFOXAUCTION.sol");

module.exports = async (deployer, network, addresses) => {
  let proxyRegistryAddress = "";
  if (network === 'rinkeby') {
    proxyRegistryAddress = "0xf57b2c51ded3a29e6891aba85459d600256cf317";
  } else {
    proxyRegistryAddress = "0xa5409ec958c83c3f309868babaca7c86dcb077c1";
  }

  // await deployer.deploy(MockRFOX, "RFOX Token", "RFOX");
  //await deployer.deploy(RFOXNFT, proxyRegistryAddress);
  const rfoxAddress = "0xa1d6df714f91debf4e0802a542e13067f31b8262";
  const bidPricePercent = 103;
  await deployer.deploy(RFOXAUCTION, bidPricePercent);

  //console.log("RFOXNFT", RFOXNFT.address);
  // console.log("MockRFOX", MockRFOX.address);
  console.log("RFOXAUCTION", RFOXAUCTION.address);
};
