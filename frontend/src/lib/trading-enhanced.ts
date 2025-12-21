// Enhanced trading function with logging and validation
const handlePlaceOrderEnhanced = async () => {
    console.log('\n=== PLACE ORDER CALLED ===');
    console.log('Account:', account);
    console.log('Market:', market?.contract_address);
    console.log('Limit Price (cents):', limitPrice);
    console.log('Shares:', shares);
    console.log('Active Tab:', activeTab);
    console.log('Order Type:', orderType);

    if (!account || !market?.contract_address) {
        alert('Please connect your wallet first');
        return;
    }

    if (!limitPrice || !shares || parseFloat(shares) <= 0) {
        alert('Please enter valid price and shares');
        return;
    }

    setIsTrading(true);
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Check network
        const network = await provider.getNetwork();
        console.log('Network Chain ID:', network.chainId.toString());
        if (network.chainId !== 84532n) {
            alert('Please switch to Base Sepolia network (Chain ID: 84532)');
            setIsTrading(false);
            return;
        }

        // Convert price from cents to 6 decimals (50¢ = 0.50 = 500000)
        const priceIn6Decimals = Math.floor(parseFloat(limitPrice) * 10000);
        const amountInUsdc = ethers.parseUnits(shares, 6);

        console.log('Price in 6 decimals:', priceIn6Decimals);
        console.log('Amount in USDC (wei):', amountInUsdc.toString());

        // Determine outcome index: 0 = UP, 1 = DOWN
        const outcomeIndex = activeTab === 'up' ? 0 : 1;
        const isBid = orderType === 'buy';

        console.log('Outcome Index:', outcomeIndex, '(0=UP, 1=DOWN)');
        console.log('Is Bid:', isBid);

        // First approve USDC if buying
        if (isBid) {
            console.log('\n--- USDC APPROVAL ---');
            const usdcContract = new ethers.Contract(
                CONTRACTS.PlatformToken,
                ABIS.PlatformToken,
                signer
            );

            // Check balance
            const balance = await usdcContract.balanceOf(account);
            console.log('USDC Balance:', ethers.formatUnits(balance, 6));

            if (balance < amountInUsdc) {
                alert(`Insufficient USDC balance. You have ${ethers.formatUnits(balance, 6)} USDC`);
                setIsTrading(false);
                return;
            }

            // Check allowance
            const allowance = await usdcContract.allowance(account, CONTRACTS.OrderBook);
            console.log('Current Allowance:', ethers.formatUnits(allowance, 6));

            if (allowance < amountInUsdc) {
                console.log('Requesting approval...');
                const approveTx = await usdcContract.approve(
                    CONTRACTS.OrderBook,
                    amountInUsdc
                );
                console.log('Approval TX:', approveTx.hash);
                await approveTx.wait();
                console.log('Approval confirmed!');
            } else {
                console.log('Sufficient allowance exists');
            }
        }

        // Place order
        console.log('\n--- PLACING ORDER ---');
        const orderBookContract = new ethers.Contract(
            CONTRACTS.OrderBook,
            ABIS.OrderBook,
            signer
        );

        console.log('OrderBook Address:', CONTRACTS.OrderBook);
        console.log('Calling placeOrder with:');
        console.log('  market:', market.contract_address);
        console.log('  outcomeIndex:', outcomeIndex);
        console.log('  price:', priceIn6Decimals);
        console.log('  amount:', amountInUsdc.toString());
        console.log('  isBid:', isBid);

        const tx = await orderBookContract.placeOrder(
            market.contract_address,
            outcomeIndex,
            priceIn6Decimals,
            amountInUsdc,
            isBid
        );

        console.log('Order TX:', tx.hash);
        console.log('Waiting for confirmation...');
        const receipt = await tx.wait();
        console.log('Order confirmed! Block:', receipt.blockNumber);
        console.log('=== ORDER SUCCESS ===\n');

        alert('Order placed successfully!');

        // Reset form
        setLimitPrice('50');
        setShares('10');
    } catch (error: any) {
        console.error('\n=== ORDER ERROR ===');
        console.error('Error:', error);
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Data:', error.data);
        console.error('Stack:', error.stack);

        let errorMsg = error.message || error.toString();
        if (error.reason) errorMsg = error.reason;
        if (error.data?.message) errorMsg = error.data.message;

        alert(`Failed to place order: ${errorMsg}`);
    } finally {
        setIsTrading(false);
    }
};
