# Real-Time Stock Management API Contract

**Module**: `src/lib/product/realtime/stock-notifier.js`  
**Version**: 1.0.0

## notifyStockUpdate(productId, previousQuantity, newQuantity, adminId)

Publishes stock update notification to Redis pub/sub channel.

**Parameters**:
- `productId` (Number, required): Product ID
- `previousQuantity` (Number, required): Quantity before update
- `newQuantity` (Number, required): Quantity after update
- `adminId` (Number, required): Admin ID who made the update

**Returns**: `Promise<void>`

**Example**:
```javascript
await stockNotifier.notifyStockUpdate(1, 10, 5, 123);
// Publishes to 'stock:updated' channel
```

**Message Format**:
```json
{
  "productId": 1,
  "previousQuantity": 10,
  "newQuantity": 5,
  "adminId": 123,
  "timestamp": "2025-11-21T10:00:00Z"
}
```

---

## subscribeToUpdates(callback)

Subscribes to stock update notifications.

**Parameters**:
- `callback` (Function, required): Callback function `(update) => void`

**Returns**: `Promise<void>`

**Update Object**:
```typescript
{
  productId: number,
  previousQuantity: number,
  newQuantity: number,
  adminId: number,
  timestamp: string
}
```

**Example**:
```javascript
await stockNotifier.subscribeToUpdates((update) => {
  console.log(`Product ${update.productId} stock changed from ${update.previousQuantity} to ${update.newQuantity}`);
  // Invalidate cache, update catalog, etc.
});
```

---

## syncCatalog(productId, quantity)

Synchronizes product catalog after stock update.

**Parameters**:
- `productId` (Number, required): Product ID
- `quantity` (Number, required): New stock quantity

**Returns**: `Promise<void>`

**Example**:
```javascript
await catalogSync.syncCatalog(1, 5);
// Invalidates product cache, updates availability status
```

**Actions**:
1. Invalidates Redis cache for product
2. Updates product availability status if needed
3. Triggers catalog refresh for active customers

---

## getStockHistory(productId)

Retrieves stock update history for a product.

**Parameters**:
- `productId` (Number, required): Product ID

**Returns**: `Promise<Array<StockUpdate>>`

**StockUpdate**:
```typescript
{
  adminId: number,
  previousQuantity: number,
  newQuantity: number,
  timestamp: Date
}
```

**Example**:
```javascript
const history = await stockNotifier.getStockHistory(1);
// Returns last 10 stock updates for product 1
```

