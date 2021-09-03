const mockBWP = artifacts.require('MockBWP');
const BN = web3.utils.BN;

contract('Token', async (accounts) => {
    it('token deployment', async () => {
        let token = await mockBWP.new("BWP Token", "BWP");
        console.log(await token.name());
        console.log(await token.symbol());
    });
})