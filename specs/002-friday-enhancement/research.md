# Research: FRIDAY Bot Enhancement

**Date**: 2025-11-21  
**Feature**: FRIDAY Bot Enhancement  
**Phase**: Phase 0 - Research & Best Practices

## Research Tasks

### 1. Telegram Bot Webhook Setup with Telegraf

**Task**: Research best practices for webhook setup with Telegraf framework

**Findings**:

**Decision**: Use `bot.createWebhook()` method for Express integration

**Rationale**: 
- Telegraf's `createWebhook()` method provides Express-compatible middleware
- Automatically handles `setWebhook` registration with Telegram
- Supports secret token for security (HMAC verification)
- Preferred method for production deployments per Telegraf documentation

**Alternatives Considered**:
- `bot.launch({ webhook: {...} })` - Built-in webhook server, but less flexible for existing Express apps
- Manual webhook setup - More control but requires manual `setWebhook` calls

**Implementation Pattern**:
```javascript
const webhookCallback = await bot.createWebhook({
  domain: 'https://your-domain.com',
  path: '/telegram-webhook',
  secret_token: process.env.TELEGRAM_WEBHOOK_SECRET
});

app.use(webhookCallback);
```

**Source**: Telegraf documentation, Context7 `/telegraf/telegraf`

---

### 2. Responsive Inline Keyboard Layout Patterns

**Task**: Research best practices for creating responsive inline keyboards with balanced layouts

**Findings**:

**Decision**: Use Telegraf's `Markup.inlineKeyboard()` with row-based array structure

**Rationale**:
- Telegram Bot API supports up to 8 buttons per row
- Best practice: 3 buttons per row for optimal mobile display
- Fixed navigation buttons (Home/Back) should be in separate row
- Auto-balancing algorithm distributes items evenly across rows

**Layout Patterns**:
- 9 items: 3 rows × 3 buttons + 1 row × 2 buttons (Home/Back) = 3x3x2
- 6 items: 3 rows × 2 buttons + 1 row × 2 buttons (Home/Back) = 3x2x2
- 4 items: 2 rows × 2 buttons + 1 row × 2 buttons (Home/Back) = 3x2x1
- 2 items: 1 row × 2 buttons + 1 row × 2 buttons (Home/Back) = 3x1x1

**Implementation Pattern**:
```javascript
const { Markup } = require('telegraf');

// Auto-balance algorithm
function createBalancedKeyboard(items, includeNav = true) {
  const rows = [];
  const itemsPerRow = items.length <= 3 ? items.length : 3;
  
  // Distribute items
  for (let i = 0; i < items.length; i += itemsPerRow) {
    rows.push(items.slice(i, i + itemsPerRow));
  }
  
  // Add navigation
  if (includeNav) {
    rows.push([
      Markup.button.callback('🏠 Home', 'nav_home'),
      Markup.button.callback('◀️ Back', 'nav_back')
    ]);
  }
  
  return Markup.inlineKeyboard(rows);
}
```

**Source**: Telegram Bot API documentation, Telegraf examples, Context7 `/telegraf/telegraf`

---

### 3. Redis Session Management and Caching

**Task**: Research best practices for Redis session management and caching patterns

**Findings**:

**Decision**: Use ioredis with connection pooling and client-side caching (RESP3)

**Rationale**:
- ioredis v5 supports RESP3 protocol with client-side caching
- Connection pooling reduces connection overhead
- TTL-based expiration for session data
- LRU eviction policy for cache management

**Session Management Pattern**:
```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// Session storage
await redis.setex(`session:${userId}`, 3600, JSON.stringify(sessionData));
```

**Caching Pattern**:
- Payment method configuration: Cache in Redis with 1-hour TTL
- Menu layouts: Cache computed layouts to avoid recalculation
- Product catalog: Use existing cache infrastructure

**Source**: Redis documentation, node-redis v5 features, Context7 `/redis/node-redis`

---

### 4. PostgreSQL Connection Pooling with Knex.js

**Task**: Research best practices for PostgreSQL connection pooling

**Findings**:

**Decision**: Use Knex.js connection pooling with min: 2, max: 10 configuration

**Rationale**:
- Knex.js uses tarn.js for connection pooling
- Recommended: min: 0 (terminate idle connections), max: 10 (production)
- Connection acquisition timeout: 10 seconds (default 60s is too long)
- Pool configuration already exists in `knexfile.js`

**Configuration Pattern**:
```javascript
const knex = require('knex')({
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    acquireTimeoutMillis: 10000
  }
});
```

**Source**: Knex.js documentation, PostgreSQL best practices, Context7 `/knex/knex`

---

### 5. Time-Based Greeting System

**Task**: Research best practices for time-based conditional logic

**Findings**:

**Decision**: Use server timezone with time-of-day ranges

**Rationale**:
- Server timezone is consistent and predictable
- Time ranges: Morning (6:00-11:59), Afternoon (12:00-17:59), Evening (18:00-23:59), Night (0:00-5:59)
- Consider customer timezone if available from Telegram metadata (future enhancement)

**Implementation Pattern**:
```javascript
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
}

const greetings = {
  morning: 'Selamat pagi! Saya FRIDAY, asisten AI Anda...',
  afternoon: 'Selamat siang! Saya FRIDAY, siap membantu...',
  evening: 'Selamat sore! Saya FRIDAY, ada yang bisa dibantu?',
  night: 'Selamat malam! Saya FRIDAY, masih siap membantu...'
};
```

**Source**: Common time-based greeting patterns, Telegram Bot API timezone handling

---

### 6. Dynamic Payment Method Configuration

**Task**: Research best practices for environment variable-based feature flags

**Findings**:

**Decision**: Load payment methods from environment variables at startup, cache in Redis

**Rationale**:
- Environment variables provide secure configuration
- Redis caching avoids repeated environment reads
- Validation ensures only properly configured methods are enabled
- Graceful degradation when no methods configured

**Implementation Pattern**:
```javascript
function loadPaymentMethods() {
  const methods = [];
  
  if (process.env.DUITKU_MERCHANT_CODE && process.env.DUITKU_API_KEY) {
    methods.push({ type: 'qris', name: 'QRIS', enabled: true });
  }
  
  if (process.env.E_WALLET_NAME && process.env.E_WALLET_NUMBER) {
    methods.push({ type: 'ewallet', name: process.env.E_WALLET_NAME, enabled: true });
  }
  
  if (process.env.BANK_NAME && process.env.BANK_ACCOUNT_NUMBER) {
    methods.push({ type: 'bank', name: process.env.BANK_NAME, enabled: true });
  }
  
  return methods;
}
```

**Source**: Environment variable best practices, existing codebase patterns

---

### 7. Hierarchical Command System

**Task**: Research best practices for command routing and hierarchy

**Findings**:

**Decision**: Use command registry pattern with path-based routing

**Rationale**:
- Command registry allows dynamic command discovery
- Path-based routing: `/admin product add` → `admin.product.add`
- Permission checking at each hierarchy level
- Help system shows available commands at current level

**Implementation Pattern**:
```javascript
const commandRegistry = {
  'admin': {
    handler: showAdminMenu,
    children: {
      'product': {
        handler: showProductMenu,
        children: {
          'add': { handler: handleAddProduct, permissions: ['stock_manage'] },
          'update': { handler: handleUpdateProduct, permissions: ['stock_manage'] }
        }
      }
    }
  }
};

function routeCommand(path, telegramUserId) {
  const parts = path.split(' ');
  let current = commandRegistry;
  
  for (const part of parts) {
    if (current[part]) {
      current = current[part];
      if (current.permissions) {
        // Check permissions
      }
    } else {
      return { error: 'Command not found', suggestions: Object.keys(current) };
    }
  }
  
  return current.handler;
}
```

**Source**: Command pattern, existing admin-commands.js structure

---

### 8. Real-Time Stock Update Notifications

**Task**: Research best practices for real-time data synchronization

**Findings**:

**Decision**: Use Redis pub/sub for stock update notifications, invalidate cache immediately

**Rationale**:
- Redis pub/sub provides lightweight real-time messaging
- Cache invalidation ensures immediate catalog updates
- Database triggers or polling too heavy for this use case
- Existing cache infrastructure supports this pattern

**Implementation Pattern**:
```javascript
// Publisher (on stock update)
await redis.publish('stock:updated', JSON.stringify({ productId, quantity }));

// Subscriber (catalog sync)
redis.subscribe('stock:updated', (channel, message) => {
  const { productId, quantity } = JSON.parse(message);
  invalidateProductCache(productId);
  updateCatalogAvailability(productId, quantity);
});
```

**Source**: Redis pub/sub patterns, existing cache invalidation in product-repository.js

---

## Consolidated Decisions

### Technology Choices

1. **Webhook Integration**: Telegraf `createWebhook()` with Express
2. **Keyboard Layouts**: Telegraf `Markup.inlineKeyboard()` with row-based arrays
3. **Session Management**: ioredis with connection pooling
4. **Database**: Knex.js with existing PostgreSQL/MySQL support
5. **Caching**: Redis with TTL and LRU eviction
6. **Time Handling**: Server timezone with time-of-day ranges
7. **Configuration**: Environment variables with Redis caching
8. **Command Routing**: Registry pattern with path-based hierarchy
9. **Real-Time Updates**: Redis pub/sub for notifications

### Architecture Patterns

1. **Modular Libraries**: Each feature as independent, testable library
2. **Cache-First**: Load configuration once, cache in Redis
3. **Event-Driven**: Pub/sub for real-time updates
4. **Permission-Based**: Hierarchical permission checking
5. **Graceful Degradation**: Handle missing configuration gracefully

### Performance Optimizations

1. **Connection Pooling**: Knex.js pool (min: 2, max: 10)
2. **Redis Caching**: 1-hour TTL for payment config, immediate invalidation for stock
3. **Layout Caching**: Cache computed keyboard layouts
4. **Async Operations**: All bot interactions non-blocking

### Security Considerations

1. **Webhook Secret**: HMAC verification for Telegram webhooks
2. **Admin Authentication**: Permission checking at command level
3. **Input Validation**: Validate all admin command inputs
4. **Environment Variables**: Sensitive data in .env, never in code

## Unresolved Questions

None - All research tasks completed. All technical decisions made based on best practices and existing codebase patterns.

