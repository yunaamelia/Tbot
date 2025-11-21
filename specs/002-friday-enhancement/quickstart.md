# Quick Start: FRIDAY Bot Enhancement

**Feature**: FRIDAY Bot Enhancement  
**Date**: 2025-11-21

## Prerequisites

- Node.js 20.0.0+
- PostgreSQL 14+ or MySQL 8.0+
- Redis 7.0+
- Existing bot setup (from `001-premium-store-bot`)

## Installation Steps

### 1. Checkout Feature Branch

```bash
git checkout 002-friday-enhancement
```

### 2. Install Dependencies

No new dependencies required. Existing dependencies are sufficient:
- `telegraf` ^4.15.0
- `express` ^4.18.2
- `knex` ^3.0.1
- `ioredis` ^5.3.2

### 3. Run Database Migration

```bash
npm run migrate
```

This will create the new `last_updated_by` and `update_history` columns in the `stock` table.

### 4. Configure Environment Variables

Ensure your `.env` file has payment method configurations:

```bash
# QRIS Payment (optional)
DUITKU_MERCHANT_CODE=your_merchant_code
DUITKU_API_KEY=your_api_key
DUITKU_CALLBACK_URL=https://your-domain.com/payment/callback

# E-Wallet Payment (optional)
E_WALLET_NAME=GoPay
E_WALLET_NUMBER=081234567890
E_WALLET_HOLDER=Your Name

# Bank Transfer Payment (optional)
BANK_NAME=BCA
BANK_ACCOUNT_NUMBER=1234567890
BANK_ACCOUNT_HOLDER=Your Name
```

**Note**: Only configured payment methods will appear in the payment selection menu.

### 5. Start Redis (if not running)

```bash
redis-server
```

### 6. Start the Bot

```bash
npm start
```

Or for webhook mode:

```bash
npm run server
```

## Testing the Features

### Test FRIDAY Greetings

1. Send `/start` to the bot at different times of day
2. Verify greetings change based on time:
   - Morning (6:00-11:59): "Selamat pagi!"
   - Afternoon (12:00-17:59): "Selamat siang!"
   - Evening (18:00-23:59): "Selamat sore!"
   - Night (0:00-5:59): "Selamat malam!"

### Test Responsive Keyboards

1. Navigate through product menus
2. Verify keyboard layouts:
   - 9 products → 3 rows × 3 buttons + Home/Back
   - 6 products → 3 rows × 2 buttons + Home/Back
   - 4 products → 2 rows × 2 buttons + Home/Back
   - 2 products → 1 row × 2 buttons + Home/Back
3. Test Home and Back buttons work correctly

### Test Dynamic Payment Methods

1. Configure different payment methods in `.env`
2. Start checkout process
3. Verify only configured methods appear
4. Test with all methods disabled (should show error)

### Test Hierarchical Admin Commands

1. As admin, send `/admin`
2. Navigate through command hierarchy:
   - `/admin product` → Shows product sub-commands
   - `/admin product add` → Executes add product command
3. Test permission checking (non-admin should see limited commands)
4. Test command help: `/admin help`

### Test Real-Time Stock Updates

1. As admin, update stock: `/stock update 1 10`
2. Verify stock updates immediately
3. As customer, browse products
4. Verify updated stock appears in catalog within 2 seconds

## Running Tests

```bash
# Run all tests
npm test

# Run integration tests (real Telegram API)
npm run test:integration

# Run specific feature tests
npm run test:integration -- friday-greetings
npm run test:integration -- responsive-keyboard
npm run test:integration -- payment-config
npm run test:integration -- admin-hierarchy
npm run test:integration -- stock-realtime
```

## Troubleshooting

### FRIDAY Greetings Not Changing

- Check server timezone: `date`
- Verify time-based logic in `persona-service.js`

### Keyboards Not Balanced

- Check item count in menu
- Verify `layout-balancer.js` algorithm
- Check Redis cache for layout patterns

### Payment Methods Not Appearing

- Verify environment variables are set
- Check Redis cache: `redis-cli GET payment:methods`
- Restart bot to reload configuration

### Admin Commands Not Working

- Verify admin permissions in database
- Check command registry initialization
- Review command path format

### Stock Updates Not Reflecting

- Check Redis pub/sub connection
- Verify `stock:updated` channel subscription
- Check product cache invalidation

## Next Steps

1. Review implementation plan: `plan.md`
2. Read API contracts: `contracts/`
3. Check data model: `data-model.md`
4. Run `/speckit.tasks` to generate task breakdown

## Support

For issues or questions:
1. Check existing codebase patterns in `src/lib/`
2. Review constitution compliance: `.specify/memory/constitution.md`
3. Review test examples in `tests/integration/`

