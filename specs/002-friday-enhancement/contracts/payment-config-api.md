# Payment Configuration API Contract

**Module**: `src/lib/payment/config/payment-config.js`  
**Version**: 1.0.0

## getAvailableMethods()

Returns list of available payment methods based on environment configuration.

**Parameters**: None

**Returns**: `Promise<Array<PaymentMethod>>`

**PaymentMethod**:
```typescript
{
  type: 'qris' | 'ewallet' | 'bank',
  name: string,
  enabled: boolean,
  displayName: string
}
```

**Example**:
```javascript
const methods = await paymentConfig.getAvailableMethods();
// Returns: [
//   { type: 'qris', name: 'QRIS', enabled: true, displayName: 'QRIS' },
//   { type: 'bank', name: 'Bank Transfer', enabled: true, displayName: 'BCA' }
// ]
```

**Caching**: Results cached in Redis with key `payment:methods`, TTL 1 hour

---

## isMethodEnabled(type)

Checks if a specific payment method is enabled.

**Parameters**:
- `type` (String, required): Payment method type ('qris', 'ewallet', 'bank')

**Returns**: `Promise<Boolean>`

**Example**:
```javascript
const qrisEnabled = await paymentConfig.isMethodEnabled('qris');
// Returns: true if QRIS credentials are configured
```

---

## validateMethod(type)

Validates that a payment method has all required configuration.

**Parameters**:
- `type` (String, required): Payment method type

**Returns**: `Promise<Boolean>` - true if method is properly configured

**Validation Rules**:
- QRIS: Requires `DUITKU_MERCHANT_CODE`, `DUITKU_API_KEY`, `DUITKU_CALLBACK_URL`
- E-Wallet: Requires `E_WALLET_NAME`, `E_WALLET_NUMBER`, `E_WALLET_HOLDER`
- Bank: Requires `BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_HOLDER`

**Errors**:
- Throws `ValidationError` if type is invalid

---

## refreshCache()

Forces refresh of payment method cache from environment variables.

**Parameters**: None

**Returns**: `Promise<void>`

**Example**:
```javascript
await paymentConfig.refreshCache();
// Reloads payment methods from environment and updates Redis cache
```

