# Base Sepolia Deployment Summary

## Deployed Contracts

### PythPriceOracle
- **Address:** `0xF883074b12C2C2F4B8dd2334ad90C792AF04c37E`
- **Pyth Contract:** `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729`
- **BTC/USD Feed ID:** `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43`
- **Status:** ✅ Deployed successfully
- **Note:** Price queries may fail on testnet if Pyth doesn't have recent data

### BTCMarketFactory
- **Address:** `0x75f92fEbA7129fB8e90dBC4047Fb49F35185ea8C`
- **ConditionalTokens:** `0xE60AC9b3Bdb8161aD1276519F2b47C45cFeA3E83`
- **PlatformToken (USDC):** `0xC59FD3678fCCB26284f763832579463AED36304D`
- **OrderBook:** `0x54fC379D88bF6be411E1F4719fAF4bC84725616A`
- **PriceOracle Backend:** `0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf`
- **PriceOracle Contract:** `0xF883074b12C2C2F4B8dd2334ad90C792AF04c37E`
- **Status:** ✅ Deployed with oracle integration

## Key Features Implemented

✅ **Dynamic Strike Prices**
- Markets created without hardcoded prices
- Strike price determined by oracle at resolution time

✅ **Enhanced Liquidity Seeding**
- 5 price levels from 50c to 75c
- 10k USDC total (1k per level, both sides)

✅ **Oracle Integration**
- Pyth Network for BTC/USD prices
- Automatic price conversion to 8 decimals

## Next Steps

### 1. Fund Factory with Correct USDC
The factory needs USDC at address `0xC59FD3678fCCB26284f763832579463AED36304D` (not the one we minted to).

**Option A:** Transfer USDC to factory
```bash
# In hardhat console
const usdc = await ethers.getContractAt("IERC20", "0xC59FD3678fCCB26284f763832579463AED36304D");
await usdc.transfer("0x75f92fEbA7129fB8e90dBC4047Fb49F35185ea8C", ethers.parseUnits("100000", 6));
```

**Option B:** Mint USDC to factory directly
```bash
# If PlatformToken has mint function
const usdc = await ethers.getContractAt("PlatformToken", "0xC59FD3678fCCB26284f763832579463AED36304D");
await usdc.mint("0x75f92fEbA7129fB8e90dBC4047Fb49F35185ea8C", ethers.parseUnits("100000", 6));
```

### 2. Create Test Market
```bash
BTC_FACTORY_ADDRESS=0x75f92fEbA7129fB8e90dBC4047Fb49F35185ea8C \
USDC_ADDRESS=0xC59FD3678fCCB26284f763832579463AED36304D \
npx hardhat run scripts/create_btc_market_manual.ts --network baseSepolia
```

### 3. Batch Create Markets
```bash
BTC_FACTORY_ADDRESS=0x75f92fEbA7129fB8e90dBC4047Fb49F35185ea8C \
npx hardhat run scripts/batch_create_markets.ts --network baseSepolia
```

### 4. Set Up Auto-Resolution
Add to crontab:
```bash
*/10 * * * * cd /path/to/project && BTC_FACTORY_ADDRESS=0x75f92fEbA7129fB8e90dBC4047Fb49F35185ea8C npx hardhat run scripts/auto_resolve_markets.ts --network baseSepolia >> /var/log/market-resolution.log 2>&1
```

## Environment Variables

Add to `.env`:
```bash
# Network
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_private_key

# Deployed Contracts
BTC_FACTORY_ADDRESS=0x75f92fEbA7129fB8e90dBC4047Fb49F35185ea8C
USDC_ADDRESS=0xC59FD3678fCCB26284f763832579463AED36304D
PRICE_ORACLE_ADDRESS=0xF883074b12C2C2F4B8dd2334ad90C792AF04c37E
```

## Verification Commands

### Verify Oracle
```bash
npx hardhat verify --network baseSepolia \
  0xF883074b12C2C2F4B8dd2334ad90C792AF04c37E \
  "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729" \
  "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
```

### Verify Factory
```bash
npx hardhat verify --network baseSepolia \
  0x75f92fEbA7129fB8e90dBC4047Fb49F35185ea8C \
  "0xE60AC9b3Bdb8161aD1276519F2b47C45cFeA3E83" \
  "0xC59FD3678fCCB26284f763832579463AED36304D" \
  "0x54fC379D88bF6be411E1F4719fAF4bC84725616A" \
  "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf" \
  "0xF883074b12C2C2F4B8dd2334ad90C792AF04c37E"
```

## Testing Checklist

- [x] Oracle deployed
- [x] Factory deployed with oracle integration
- [ ] Factory funded with USDC
- [ ] Test market created
- [ ] Liquidity seeding verified (10 orders)
- [ ] Market resolution tested
- [ ] Batch creation tested
- [ ] Auto-resolution tested

## Known Issues

1. **USDC Address Mismatch:** We minted USDC to `0xd2007BD89BcB013A5E9544e79aAcAE7976E0a285` but factory expects `0xC59FD3678fCCB26284f763832579463AED36304D`. Need to mint/transfer to correct address.

2. **Pyth Testnet Data:** Pyth may not have recent BTC price data on Base Sepolia testnet. For production testing, consider using mainnet fork or mock oracle.

## Contract Addresses Reference

| Contract | Address |
|----------|---------|
| PythPriceOracle | `0xF883074b12C2C2F4B8dd2334ad90C792AF04c37E` |
| BTCMarketFactory | `0x75f92fEbA7129fB8e90dBC4047Fb49F35185ea8C` |
| ConditionalTokens | `0xE60AC9b3Bdb8161aD1276519F2b47C45cFeA3E83` |
| PlatformToken (USDC) | `0xC59FD3678fCCB26284f763832579463AED36304D` |
| OrderBook | `0x54fC379D88bF6be411E1F4719fAF4bC84725616A` |
| Pyth Contract | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |
