# Quick Start: Premium Store Bot Inline Keyboard System Refactor

**Feature**: 005-keyboard-refactor  
**Date**: 2025-01-27

## Overview

This quick start guide provides step-by-step instructions for implementing the refactored keyboard system. Follow this guide to integrate the new keyboard engine into your bot.

## Prerequisites

- Node.js 20+ installed
- Redis 7.0+ running
- PostgreSQL/MySQL database configured
- Existing bot codebase (Storebot)
- Telegraf 4.15+ installed

## Step 1: Install Dependencies

No new dependencies required - uses existing stack:
- Telegraf 4.15+
- ioredis 5.3+
- Knex.js 3.0+

## Step 2: Create Core Modules

### 2.1 Keyboard Engine

Create `src/lib/ui/keyboard-engine.js`:

```javascript
const layoutManager = require('./layout-manager');
const keyboardPersona = require('../friday/keyboard-persona');
const keyboardAccess = require('../security/keyboard-access');
const performanceOptimizer = require('./performance-optimizer');

async function createKeyboard(items, options = {}) {
  // 1. Role-based filtering
  const filteredItems = await keyboardAccess.filterItemsByPermissions(
    items,
    options.telegramUserId
  );

  // 2. Apply FRIDAY persona styling
  const styledItems = keyboardPersona.applyPersonaStyling(filteredItems, options);

  // 3. Calculate layout
  const layout = layoutManager.calculateLayout(styledItems, options);

  // 4. Add navigation and breadcrumbs
  // ... (see full implementation)

  // 5. Cache and return
  return performanceOptimizer.cacheKeyboard(keyboard, cacheKey);
}

module.exports = { createKeyboard };
```

### 2.2 Layout Manager

Create `src/lib/ui/layout-manager.js`:

```javascript
function calculateLayout(items, options = {}) {
  const maxItemsPerRow = options.maxItemsPerRow || 3;
  const itemCount = items.length;

  // Handle pagination for 10+ items
  if (itemCount > 9) {
    return calculatePaginationLayout(items, options.currentPage || 0);
  }

  // Calculate optimal row distribution
  const rows = [];
  // ... (see algorithm in research.md)

  return rows;
}

module.exports = { calculateLayout };
```

### 2.3 Navigation Engine

Create `src/lib/ui/navigation-engine.js`:

```javascript
const redisClient = require('../shared/redis-client');

async function addNavigationEntry(userId, menuId, menuName, context) {
  const history = await getNavigationHistory(userId);
  history.push({ level: history.length, menuId, menuName, context, timestamp: new Date().toISOString() });
  
  // Enforce 20-level limit
  if (history.length > 20) {
    history.shift(); // Remove oldest
  }

  await redisClient.set(`nav:history:${userId}`, JSON.stringify(history), 'EX', 7200);
}

module.exports = { addNavigationEntry, getNavigationHistory, generateBreadcrumb };
```

## Step 3: Integrate with Existing Code

### 3.1 Update Keyboard Builder

Extend `src/lib/ui/keyboard-builder.js` to use new engine:

```javascript
const keyboardEngine = require('./keyboard-engine');

// Keep existing createKeyboard for backward compatibility
async function createKeyboard(items, options = {}) {
  // Use new engine internally
  return keyboardEngine.createKeyboard(items, options);
}

module.exports = { createKeyboard };
```

### 3.2 Update Bot Handlers

Update `src/bot.js` to use new keyboard system:

```javascript
const keyboardEngine = require('./lib/ui/keyboard-engine');

// In command handlers
bot.command('start', async (ctx) => {
  const items = [
    { text: '🔵 Produk', callback_data: 'menu_products' },
    { text: '⚪️ Bantuan', callback_data: 'menu_help' }
  ];

  const keyboard = await keyboardEngine.createKeyboard(items, {
    telegramUserId: ctx.from.id,
    includeBreadcrumb: false,
    menuContext: 'main'
  });

  await ctx.reply('Selamat datang!', keyboard);
});
```

## Step 4: Real-Time Stock Updates

### 4.1 Subscribe to Stock Updates

In `src/lib/product/realtime/stock-notifier.js`:

```javascript
const keyboardEngine = require('../../ui/keyboard-engine');

// Subscribe to stock updates
redis.subscribe('stock:update', async (message) => {
  const update = JSON.parse(message);
  
  // Get active keyboards for product
  const activeKeyboards = await redis.smembers(`keyboards:active:${update.productId}`);
  
  // Update each keyboard
  for (const keyboardId of activeKeyboards) {
    await keyboardEngine.updateKeyboard(keyboardId, {
      stockUpdates: [update]
    });
  }
});
```

## Step 5: Testing

### 5.1 Unit Tests

Create `tests/unit/ui/keyboard-engine.test.js`:

```javascript
describe('Keyboard Engine', () => {
  it('should create keyboard with FRIDAY persona styling', async () => {
    const items = [{ text: 'Test', callback_data: 'test' }];
    const keyboard = await keyboardEngine.createKeyboard(items, {
      fridayPersona: true
    });
    
    expect(keyboard).toBeDefined();
    // ... assertions
  });
});
```

### 5.2 Integration Tests

Create `tests/integration/keyboard-engine.test.js`:

```javascript
describe('Keyboard Engine Integration', () => {
  it('should generate keyboard with real Telegram API', async () => {
    // Use real Telegram Bot API
    // ... test implementation
  });
});
```

## Step 6: Performance Optimization

### 6.1 Enable Caching

Ensure Redis is configured and caching is enabled:

```javascript
// In keyboard-engine.js
const cached = await performanceOptimizer.getCachedKeyboard(cacheKey);
if (cached) {
  return cached; // <200ms response
}
```

### 6.2 Monitor Performance

Add performance monitoring:

```javascript
const startTime = Date.now();
const keyboard = await keyboardEngine.createKeyboard(items, options);
const duration = Date.now() - startTime;

logger.info('Keyboard generated', { duration, cached: !!cached });
```

## Step 7: Gradual Migration

### 7.1 Feature Flag

Use feature flag for gradual rollout:

```javascript
const USE_NEW_KEYBOARD_ENGINE = process.env.USE_NEW_KEYBOARD_ENGINE === 'true';

if (USE_NEW_KEYBOARD_ENGINE) {
  return keyboardEngine.createKeyboard(items, options);
} else {
  return oldKeyboardBuilder.createKeyboard(items, options);
}
```

### 7.2 Monitor and Validate

- Monitor error rates
- Track performance metrics
- Validate user experience
- Gradually enable for all users

## Common Patterns

### Pattern 1: Basic Keyboard

```javascript
const keyboard = await keyboardEngine.createKeyboard([
  { text: 'Option 1', callback_data: 'opt1' },
  { text: 'Option 2', callback_data: 'opt2' }
], {
  telegramUserId: ctx.from.id
});
```

### Pattern 2: Keyboard with Breadcrumbs

```javascript
const keyboard = await keyboardEngine.createKeyboard(items, {
  telegramUserId: ctx.from.id,
  includeBreadcrumb: true,
  menuContext: 'products'
});
```

### Pattern 3: Paginated Keyboard

```javascript
const keyboard = await keyboardEngine.createKeyboard(allItems, {
  telegramUserId: ctx.from.id,
  currentPage: 0,
  itemsPerPage: 9
});
```

## Troubleshooting

### Issue: Keyboard not displaying

**Solution**: Check Telegram API limits (64 bytes per button, 100 buttons max)

### Issue: Slow keyboard generation

**Solution**: Enable Redis caching, check cache hit rate

### Issue: Stock updates not reflecting

**Solution**: Verify Redis pub/sub subscription, check active keyboard registry

## Next Steps

1. Review API contracts in `contracts/` directory
2. Implement modules following TDD approach
3. Run integration tests with real Telegram API
4. Monitor performance metrics
5. Gradually migrate existing code

## Resources

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Research](./research.md)
- [Data Model](./data-model.md)
- [API Contracts](./contracts/)

