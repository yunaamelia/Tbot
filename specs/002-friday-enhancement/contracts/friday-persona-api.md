# FRIDAY Persona API Contract

**Module**: `src/lib/friday/persona-service.js`  
**Version**: 1.0.0

## getGreeting(telegramUserId, timeOfDay?)

Returns a personalized FRIDAY greeting based on time of day.

**Parameters**:

- `telegramUserId` (Number, required): Telegram user ID
- `timeOfDay` (String, optional): Override time of day ('morning', 'afternoon', 'evening', 'night'). If not provided, determined from current server time.

**Returns**: `Promise<String>`

**Example**:

```javascript
const greeting = await personaService.getGreeting(123456789);
// Returns: "Selamat pagi! Saya FRIDAY, asisten AI Anda. Siap membantu Anda menemukan akun premium terbaik..."
```

**Time Ranges**:

- Morning: 6:00 - 11:59
- Afternoon: 12:00 - 17:59
- Evening: 18:00 - 23:59
- Night: 0:00 - 5:59

**Errors**:

- Throws `ValidationError` if `telegramUserId` is invalid

---

## formatMessage(text, options?)

Formats a message with FRIDAY persona style.

**Parameters**:

- `text` (String, required): Message text to format
- `options` (Object, optional):
  - `includeGreeting` (Boolean): Include time-based greeting (default: false)
  - `tone` (String): Override tone ('professional', 'friendly', 'assistant')

**Returns**: `String`

**Example**:

```javascript
const message = personaService.formatMessage('Produk tersedia', { includeGreeting: true });
// Returns formatted message with FRIDAY persona
```

---

## getTimeOfDay()

Determines current time of day based on server time.

**Parameters**: None

**Returns**: `String` - One of: 'morning', 'afternoon', 'evening', 'night'

**Example**:

```javascript
const timeOfDay = personaService.getTimeOfDay();
// Returns: 'afternoon'
```
