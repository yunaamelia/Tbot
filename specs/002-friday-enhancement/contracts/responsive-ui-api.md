# Responsive UI API Contract

**Module**: `src/lib/ui/keyboard-builder.js`  
**Version**: 1.0.0

## createKeyboard(items, options?)

Creates a responsive inline keyboard with auto-balanced layout.

**Parameters**:
- `items` (Array<Object>, required): Array of button objects
  - `text` (String): Button text
  - `callback_data` (String): Callback data
  - `url` (String, optional): URL for URL buttons
- `options` (Object, optional):
  - `includeNavigation` (Boolean): Include Home/Back buttons (default: true)
  - `maxItemsPerRow` (Number): Maximum items per row (default: 3)
  - `pattern` (String): Override pattern ('3x3x2', '3x2x2', '3x2x1', '3x1x1')

**Returns**: `Markup.inlineKeyboard` - Telegraf inline keyboard markup

**Example**:
```javascript
const items = [
  { text: 'Product 1', callback_data: 'product_1' },
  { text: 'Product 2', callback_data: 'product_2' },
  { text: 'Product 3', callback_data: 'product_3' }
];

const keyboard = keyboardBuilder.createKeyboard(items);
// Returns: Markup.inlineKeyboard with balanced layout + Home/Back
```

**Layout Patterns**:
- 9 items → 3x3x2 (3 rows × 3, 1 row × 2 nav)
- 6 items → 3x2x2 (3 rows × 2, 1 row × 2 nav)
- 4 items → 3x2x1 (2 rows × 2, 1 row × 1 nav)
- 2 items → 3x1x1 (1 row × 2, 1 row × 1 nav)

**Errors**:
- Throws `ValidationError` if items array is empty or invalid

---

## balanceLayout(items, maxItemsPerRow)

Auto-balances incomplete rows to distribute items evenly.

**Parameters**:
- `items` (Array, required): Items to balance
- `maxItemsPerRow` (Number, required): Maximum items per row

**Returns**: `Array<Array>` - Array of rows, each row is array of items

**Example**:
```javascript
const items = [1, 2, 3, 4, 5, 6, 7]; // 7 items
const rows = balanceLayout(items, 3);
// Returns: [[1, 2, 3], [4, 5], [6, 7]]
// Balanced: 3 items, 2 items, 2 items (difference ≤ 1)
```

---

## createNavigationRow()

Creates fixed navigation row with Home and Back buttons.

**Parameters**: None

**Returns**: `Array<Markup.button>` - Array with Home and Back buttons

**Example**:
```javascript
const navRow = navigationHandler.createNavigationRow();
// Returns: [Markup.button.callback('🏠 Home', 'nav_home'), 
//           Markup.button.callback('◀️ Back', 'nav_back')]
```

