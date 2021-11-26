const mockRFOX = artifacts.require('MockRFOX');
const Auction = artifacts.require('RFOXAUCTION');
const RFOXNFT = artifacts.require('RFOXNFT');
const { expectEvent } = require("@openzeppelin/test-helpers");
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

    it('nft deployment', async () => {
        nft = await RFOXNFT.new(proxyRegistryAddress);
        assert.equal(await nft.name(), "RFOX_VALT");
        assert.equal(await nft.symbol(), "VALTNFT");
        await nft.mintTo(admin);
        assert.equal(await nft.balanceOf(admin), 1);
        // assert.equal(await nft.tokenURI(0), "https://ipfs.io/ipfs/admin");
    })

    it('auction deployment', async () => {
        auction = await Auction.new(bidPricePercent);
    });

    it('create auction fail - not owner', async () => {
        const itemId = 1;
        start = Math.floor((new Date()).getTime() / 1000) - 1;
        end = start + 8;
        try {
            await auction.createAuction(nft.address, itemId, 10, start, end, {from:bob});
        } catch (e) {
            assert.equal(e.reason, "Ownable: caller is not the owner");
        }
    });

    it('create first auction', async () => {
        const itemId = 1;
        start = Math.floor((new Date()).getTime() / 1000) - 1;
        end = start + 8;

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
        const firstPrice = web3.utils.toWei(new BN('2'), 'ether');
        // await token.approve(auction.address, firstPrice, {from:alice});
        const bidData1 = await auction.bid(0, {from: alice, value: firstPrice});

        expectEvent(bidData1, "Bid", { sender: alice, auctionId: new BN('0'), price: firstPrice });

        const auctionInfo = await auction.auctions(0);
        assert.equal(auctionInfo.seller, admin);
        assert.equal(Number(auctionInfo.price), Number(firstPrice));
        assert.equal(auctionInfo.bidder, alice);

        assert.equal(Number(await web3.eth.getBalance(auction.address)), Number(firstPrice));
        const bidCount = await auction.bidCount(alice, {from:alice});
        assert.equal(bidCount, 1);

        const totalBitCount = await auction.getTotalBidCount({from: alice});
        assert.equal(bidCount, 1);
    });

    it('second bid failed - lower price', async () => {
        const secondPrice = web3.utils.toWei(new BN('1'), 'ether');
        try {
            await auction.bid(0, {from: bob, value: secondPrice});
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

    it('set bid price percent failed - invalid min range', async () => {
        let pricePercent = await auction.bidPricePercent();
        assert.equal(pricePercent, bidPricePercent);
        try {
            await auction.setBidPricePercent(100);
        } catch (e) {
            assert.equal(e.reason, "Invalid Bid Price Percent");
        }
    });

    it('set bid price percent failed - invalid max range', async () => {
        let pricePercent = await auction.bidPricePercent();
        assert.equal(pricePercent, bidPricePercent);
        try {
            await auction.setBidPricePercent(121);
        } catch (e) {
            assert.equal(e.reason, "Invalid Bid Price Percent");
        }
    });

    it('set bid price percent success', async () => {
        let pricePercent = await auction.bidPricePercent();
        assert.equal(pricePercent, bidPricePercent);
        await auction.setBidPricePercent(110);
        pricePercent = await auction.bidPricePercent();
        assert.equal(pricePercent, 110);
    });

    it('second bid success', async () => {
        const secondPrice = web3.utils.toWei(new BN('3'), 'ether');
        console.log("balances before second bid");
        console.log("first bidder:", Number(await web3.eth.getBalance(alice)));
        console.log("Second bidder:", Number(await web3.eth.getBalance(bob)));
        await auction.bid(0, {from: bob, value: secondPrice});

        
        const auctionInfo = await auction.auctions(0);
        assert.equal(auctionInfo.seller, admin);
        assert.equal(Number(auctionInfo.price), Number(secondPrice));
        assert.equal(auctionInfo.bidder, bob);

        assert.equal(Number(await web3.eth.getBalance(auction.address)), Number(secondPrice));
        console.log("balances before second bid");
        console.log("first bidder:", Number(await web3.eth.getBalance(alice)));
        console.log("Second bidder:", Number(await web3.eth.getBalance(bob)));
    });

    it('end auction success', async () => {
        const itemId = 1;
        let curTime = Math.floor((new Date()).getTime() / 1000) - 1;
        const firstPrice = web3.utils.toWei(new BN('10'), 'ether');
        while(curTime < end) {
            curTime = Math.floor((new Date()).getTime() / 1000) - 1;
        }

        const balanceBefore = Number(await web3.eth.getBalance(admin));
        console.log("seller balance before end auction: ", balanceBefore);
        
        const endAuction = await auction.endAuction(0);
        expectEvent(endAuction, "EndAuction", { sender: admin, auctionId: new BN('0')});

        const balanceAfter = Number(await web3.eth.getBalance(admin));
        console.log("seller balance after end auction: ", balanceAfter);
        console.log("seller's received eth amount: ", balanceAfter - balanceBefore);
        
        const wonCount = await auction.bidCount(bob, {from:bob});
        assert.equal(wonCount, 1);

        const contractBalance = await web3.eth.getBalance(auction.address);
        assert.equal(Number(contractBalance), 0);

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

        await nft.mintTo(admin);
        // assert.equal(await nft.tokenURI(2), "https://ipfs.io/ipfs/alice");
        await nft.approve(auction.address, 3);

        await nft.mintTo(admin);
        // assert.equal(await nft.tokenURI(3), "https://ipfs.io/ipfs/bob");
        await nft.approve(auction.address, 4);

        assert.equal(await nft.balanceOf(auction.address), 0);
        assert.equal(await nft.balanceOf(admin), 3);
        await auction.createAuction(nft.address, 2, 10, start, end);
        assert.equal(await nft.balanceOf(auction.address), 1);
        assert.equal(await nft.balanceOf(admin), 2);

        assert.equal(await nft.balanceOf(auction.address), 1);
        assert.equal(await nft.balanceOf(admin), 2);
        await auction.createAuction(nft.address, 3, 10, start, end);
        assert.equal(await nft.balanceOf(auction.address), 2);
        assert.equal(await nft.balanceOf(admin), 1);

        assert.equal(await nft.balanceOf(auction.address), 2);
        assert.equal(await nft.balanceOf(admin), 1);
        await auction.createAuction(nft.address, 4, 10, start, end);
        assert.equal(await nft.balanceOf(auction.address), 3);
        assert.equal(await nft.balanceOf(admin), 0);

        assert.equal(await auction.getAuctionCount(), 4);

        let auctionInfo = await auction.auctions(1);
        assert.equal(auctionInfo.seller, admin);

        auctionInfo = await auction.auctions(2);
        assert.equal(auctionInfo.seller, admin);

        auctionInfo = await auction.auctions(3);
        assert.equal(auctionInfo.seller, admin);
    });

    it('multiple bid success', async () => {
        const secondPrice = web3.utils.toWei(new BN('2'), 'ether');
        const bidData1 = await auction.bid(2, {from: alice, value: secondPrice});
        assert.equal(await auction.bidCount(alice), 1);

        expectEvent(bidData1, "Bid", { sender: alice, auctionId: new BN('2'), price: secondPrice });
        
        const bidData2 = await auction.bid(3, {from: alice, value: secondPrice});
        assert.equal(await auction.bidCount(alice), 2);

        expectEvent(bidData2, "Bid", { sender: alice, auctionId: new BN('3'), price: secondPrice });

        const userBids = await auction.getUserBidding(alice);
        assert.equal(userBids.length, 3);
        assert.equal(Number(userBids[0]), 0);
        assert.equal(Number(userBids[1]), 2);
        assert.equal(Number(userBids[2]), 3);

        const auctionActivities = await auction.getAuctionActivities(2);
        assert.equal(auctionActivities.length, 1);
        assert.equal(Number(auctionActivities[0]), 2);
    });

    it('claim auction', async () => {
        let curTime = Math.floor((new Date()).getTime() / 1000) - 1;
        while(curTime < end) {
            curTime = Math.floor((new Date()).getTime() / 1000) - 1;
        }

        const balanceBefore = Number(await web3.eth.getBalance(admin));
        console.log("seller balance before end auction: ", balanceBefore);
        await auction.endAuction(2);
        const balanceAfter = Number(await web3.eth.getBalance(admin));
        console.log("seller balance after end auction: ", balanceAfter);
        console.log("seller's received eth amount: ", balanceAfter - balanceBefore);

        assert.equal(await nft.balanceOf(auction.address), 2);
        assert.equal(await nft.balanceOf(alice), 1);

        const auctionInfo = await auction.auctions(2);
        assert.equal(auctionInfo.status, 1);        //Ended
    });

    it('cancel auction failed - invalid permission', async () => {
        try {
            await auction.cancelAuction(2, {from: alice});
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

        assert.equal(await nft.balanceOf(auction.address), 2);
        assert.equal(await nft.balanceOf(admin), 1);
        await auction.createAuction(nft.address, 5, 10, start, end);
        assert.equal(await nft.balanceOf(auction.address), 3);
        assert.equal(await nft.balanceOf(admin), 0);

        assert.equal(await auction.getAuctionCount(), 5);
        let auctionInfo = await auction.auctions(4);
        assert.equal(auctionInfo.seller, admin);

        await auction.cancelAuction(4, {gas: 5000000});
        auctionInfo = await auction.auctions(4);
        assert.equal(auctionInfo.status, 2);        //Canceled
    });
})