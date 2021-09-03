const mockBWP = artifacts.require('MockBWP');
const Auction = artifacts.require('BWPAuction');
const BWPNFT = artifacts.require('BWPNFT');
const BN = web3.utils.BN;

let token;
let auction;
let nft;

let start;
let end;

let bidPricePercent = 105;

const proxyRegistryAddress = "0xf57b2c51ded3a29e6891aba85459d600256cf317";
contract('Auction', async (accounts) => {
    const admin = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    it('token deployment', async () => {
        token = await mockBWP.new("BWP Token", "BWP");
        assert.equal(await token.name(), "BWP Token");
        const tokenBalance = await token.balanceOf(admin);
        assert.equal(Number(tokenBalance), Number(web3.utils.toWei(new BN('100000000'), 'ether')));
        await token.transfer(alice, web3.utils.toWei(new BN('10000'), 'ether'));
        await token.transfer(bob, web3.utils.toWei(new BN('10000'), 'ether'));
        assert.equal(Number(await token.balanceOf(alice)), Number(web3.utils.toWei(new BN('10000'), 'ether')));
        assert.equal(Number(await token.balanceOf(bob)), Number(web3.utils.toWei(new BN('10000'), 'ether')));
    });

    it('nft deployment', async () => {
        nft = await BWPNFT.new(proxyRegistryAddress);
        assert.equal(await nft.name(), "BWPNFT");
        assert.equal(await nft.symbol(), "BNFT");
        await nft.mintTo(admin);
        assert.equal(await nft.balanceOf(admin), 1);
        // assert.equal(await nft.tokenURI(0), "https://ipfs.io/ipfs/admin");
    })

    it('auction deployment', async () => {
        auction = await Auction.new(token.address, bidPricePercent);
        assert.equal(await auction.bwp(), token.address);
    });

    it('create first auction', async () => {
        const itemId = 1;
        start = Math.floor((new Date()).getTime() / 1000) - 1;
        end = start + 6;

        assert.equal(await nft.balanceOf(admin), 1);

        await nft.approve(auction.address, itemId);
        await auction.createAuction(nft.address, itemId, 10, start, end);
        assert.equal(await auction.getAuctionCount(), 1);

        const auctionInfo = await auction.auctions(0);
        assert.equal(auctionInfo.seller, admin);
        assert.equal(auctionInfo.itemId, itemId);
        assert.equal(auctionInfo.start, start);
        assert.equal(auctionInfo.end, end);
        assert.equal(auctionInfo.price, 10);
        assert.equal(auctionInfo.bidder, 0);
        assert.equal(auctionInfo.status, 0);            //Normal

        assert.equal(await nft.balanceOf(auction.address), 1);
        assert.equal(await nft.balanceOf(admin), 0);
    });

    it('first bid success', async () => {
        const firstPrice = web3.utils.toWei(new BN('10'), 'ether');
        await token.approve(auction.address, firstPrice, {from:alice});
        await auction.bid(0, firstPrice, {from: alice});

        const auctionInfo = await auction.auctions(0);
        assert.equal(auctionInfo.seller, admin);
        assert.equal(Number(auctionInfo.price), Number(firstPrice));
        assert.equal(auctionInfo.bidder, alice);

        assert.equal(Number(await token.balanceOf(auction.address)), Number(firstPrice));
        assert.equal(Number(await token.balanceOf(alice)), Number(web3.utils.toWei(new BN('9990'), 'ether')));

        const bidCount = await auction.bidCount(alice, {from:alice});
        assert.equal(bidCount, 1);

        const totalBitCount = await auction.getTotalBidCount({from: alice});
        assert.equal(bidCount, 1);

        const auctionsBid = await auction.getAuctionIdsBid(alice, {from:alice});
        assert.equal(auctionsBid.length, 1);
        assert.equal(Number(auctionsBid[0]), 0);
    });

    it('second bid failed - lower price', async () => {
        const secondPrice = web3.utils.toWei(new BN('1'), 'ether');
        await token.approve(auction.address, secondPrice, {from:bob});
        try {
            await auction.bid(0, secondPrice, {from: bob});
        } catch (e) {
            assert.equal(e.reason, "Auction: Price is low");
        }
    });

    it('set bid price percent failed - not onwer', async () => {
        let pricePercent = await auction.bidPricePercent();
        assert.equal(pricePercent, bidPricePercent);
        try {
            await auction.setBidPricePercent(110, {from:bob});
        } catch (e) {
            assert.equal(e.reason, "Ownable: caller is not the owner");
        }
        
        pricePercent = await auction.bidPricePercent();
        assert.equal(pricePercent, bidPricePercent);
    });

    it('set bid price percent success', async () => {
        let pricePercent = await auction.bidPricePercent();
        assert.equal(pricePercent, bidPricePercent);
        await auction.setBidPricePercent(110);
        pricePercent = await auction.bidPricePercent();
        assert.equal(pricePercent, 110);
    });

    it('second bid success', async () => {
        const secondPrice = web3.utils.toWei(new BN('100'), 'ether');
        await token.approve(auction.address, secondPrice, {from:bob});
        await auction.bid(0, secondPrice, {from: bob});

        const auctionInfo = await auction.auctions(0);
        assert.equal(auctionInfo.seller, admin);
        assert.equal(Number(auctionInfo.price), Number(secondPrice));
        assert.equal(auctionInfo.bidder, bob);

        assert.equal(Number(await token.balanceOf(auction.address)), Number(secondPrice));
        assert.equal(Number(await token.balanceOf(alice)), Number(web3.utils.toWei(new BN('10000'), 'ether')));
        assert.equal(Number(await token.balanceOf(bob)), Number(web3.utils.toWei(new BN('9900'), 'ether')));
    });

    it('end auction success', async () => {
        const itemId = 1;
        let curTime = Math.floor((new Date()).getTime() / 1000) - 1;
        const firstPrice = web3.utils.toWei(new BN('10'), 'ether');
        while(curTime < end) {
            curTime = Math.floor((new Date()).getTime() / 1000) - 1;
        }

        const tokenBalanceBefore = await token.balanceOf(admin);
        console.log(tokenBalanceBefore);
        await auction.endAuction(0);
        const tokenBalanceAfter = await token.balanceOf(admin);
        console.log(tokenBalanceAfter);
        console.log(Number(tokenBalanceAfter) - Number(tokenBalanceBefore));
        
        const wonCount = await auction.bidCount(bob, {from:bob});
        assert.equal(wonCount, 1);

        const auctionsWon = await auction.getAuctionIdsWon(bob, {from:bob});
        assert.equal(auctionsWon.length, 1);
        assert.equal(Number(auctionsWon[0]), 0);

        const contractBalance = await token.balanceOf(auction.address);
        assert.equal(Number(contractBalance), 0);

        const itemsWon = await auction.getItemIdsWon(bob, {from:bob});
        assert.equal(itemsWon.length, 1);
        assert.equal(Number(itemsWon[0]), itemId);

        const itemsWonAlice = await auction.getItemIdsWon(alice, {from:alice});
        assert.equal(itemsWonAlice.length, 0);

        assert.equal(await nft.balanceOf(auction.address), 0);
        assert.equal(await nft.balanceOf(bob), 1);

        const auctionInfo = await auction.auctions(0);
        assert.equal(auctionInfo.status, 1);        //Ended
    });

    it('create more auctions', async () => {
        const itemId = 1;
        start = Math.floor((new Date()).getTime() / 1000) - 1;
        end = start + 10;
        await nft.mintTo(admin);
        // assert.equal(await nft.tokenURI(1), "https://ipfs.io/ipfs/admin1");
        await nft.approve(auction.address, 2);

        await nft.mintTo(alice);
        // assert.equal(await nft.tokenURI(2), "https://ipfs.io/ipfs/alice");
        await nft.approve(auction.address, 3, {from: alice});

        await nft.mintTo(bob);
        // assert.equal(await nft.tokenURI(3), "https://ipfs.io/ipfs/bob");
        await nft.approve(auction.address, 4, {from: bob});

        assert.equal(await nft.balanceOf(auction.address), 0);
        assert.equal(await nft.balanceOf(admin), 1);
        await auction.createAuction(nft.address, 2, 10, start, end);
        assert.equal(await nft.balanceOf(auction.address), 1);
        assert.equal(await nft.balanceOf(admin), 0);

        assert.equal(await nft.balanceOf(auction.address), 1);
        assert.equal(await nft.balanceOf(alice), 1);
        await auction.createAuction(nft.address, 3, 10, start, end, {from: alice});
        assert.equal(await nft.balanceOf(auction.address), 2);
        assert.equal(await nft.balanceOf(alice), 0);

        assert.equal(await nft.balanceOf(auction.address), 2);
        assert.equal(await nft.balanceOf(bob), 2);
        await auction.createAuction(nft.address, 4, 10, start, end, {from: bob});
        assert.equal(await nft.balanceOf(auction.address), 3);
        assert.equal(await nft.balanceOf(bob), 1);

        assert.equal(await auction.getAuctionCount(), 4);

        let auctionInfo = await auction.auctions(1);
        assert.equal(auctionInfo.seller, admin);

        auctionInfo = await auction.auctions(2);
        assert.equal(auctionInfo.seller, alice);

        auctionInfo = await auction.auctions(3);
        assert.equal(auctionInfo.seller, bob);
    });

    // it('bid failed - highest bidder on another auction', async () => {
    //     const secondPrice = web3.utils.toWei(new BN('100'), 'ether');
    //     await token.approve(auction.address, secondPrice);
    //     await auction.bid(2, secondPrice);

    //     await token.approve(auction.address, secondPrice);
        
    //     // try {
    //     //     await auction.bid(3, secondPrice);
    //     // } catch (e) {
    //     //     assert.equal(e.reason, "Auction: Bidder can only win 1 shop at a time");
    //     // }
    //     await auction.bid(3, secondPrice);
    // });

    it('multiple bid success', async () => {
        const secondPrice = web3.utils.toWei(new BN('100'), 'ether');
        await token.approve(auction.address, secondPrice);
        await auction.bid(2, secondPrice);
        assert.equal(await auction.bidCount(admin), 1);

        await token.approve(auction.address, secondPrice);
        
        await auction.bid(3, secondPrice);
        assert.equal(await auction.bidCount(admin), 2);

        const itemIds = await auction.getItemIdsBid(admin);
        assert.equal(itemIds[0], 3);
        assert.equal(itemIds[1], 4);

        const userBids = await auction.getUserBidding(admin);
        assert.equal(userBids.length, 2);
        assert.equal(Number(userBids[0]), 2);
        assert.equal(Number(userBids[1]), 3);

        const auctionActivities = await auction.getAuctionActivities(2);
        assert.equal(auctionActivities.length, 1);
        assert.equal(Number(auctionActivities[0]), 2);

    });

    it('cancel auction failed - invalid permission', async () => {
        try {
            await auction.cancelAuction(2);
        } catch (e) {
            assert.equal(e.reason, "Auction: Invalid Permission");
        }
    });

    it('cancel auction success', async () => {
        start = 1658498983; //2022/07/22
        end = 1658498983 + 2;

        await nft.mintTo(admin);
        // assert.equal(await nft.tokenURI(4), "https://ipfs.io/ipfs/admin2");
        await nft.approve(auction.address, 5);

        assert.equal(await nft.balanceOf(auction.address), 3);
        assert.equal(await nft.balanceOf(admin), 1);
        await auction.createAuction(nft.address, 5, 10, start, end);
        assert.equal(await nft.balanceOf(auction.address), 4);
        assert.equal(await nft.balanceOf(admin), 0);

        assert.equal(await auction.getAuctionCount(), 5);
        let auctionInfo = await auction.auctions(4);
        assert.equal(auctionInfo.seller, admin);

        await auction.cancelAuction(4, {gas: 5000000});
        auctionInfo = await auction.auctions(4);
        assert.equal(auctionInfo.status, 2);        //Canceled
    });
})