const { encodeCall } = require("@openzeppelin/upgrades");

//const MockBWP = artifacts.require("MockBWP.sol");
const BWPNFT = artifacts.require("BWPNFT.sol");
const BWPAuction = artifacts.require("BWPAuction.sol");

module.exports = async (deployer, network, addresses) => {
  let proxyRegistryAddress = "";
  if (network === 'rinkeby') {
    proxyRegistryAddress = "0xf57b2c51ded3a29e6891aba85459d600256cf317";
  } else {
    proxyRegistryAddress = "0xa5409ec958c83c3f309868babaca7c86dcb077c1";
  }

  //await deployer.deploy(MockBWP, "BWP Token", "BWP");
  await deployer.deploy(BWPNFT, proxyRegistryAddress);
  const rfoxAddress = "0xa1d6df714f91debf4e0802a542e13067f31b8262";
  //const bwpAddress = MockBWP.address;
  const bidPricePercent = 103;
  await deployer.deploy(BWPAuction, rfoxAddress, bidPricePercent);

  console.log("BWPNFT", BWPNFT.address);
  //console.log("MockBWP", MockBWP.address);
  console.log("BWPAuction", BWPAuction.address);
};