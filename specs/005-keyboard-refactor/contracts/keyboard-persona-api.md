# API Contract: Keyboard Persona

**Module**: `src/lib/friday/keyboard-persona.js`  
**Version**: 1.0.0  
**Feature**: 005-keyboard-refactor

## Overview

The Keyboard Persona module applies FRIDAY AI assistant persona styling to inline keyboards, including emoji-based color indicators, time-based elements, and Iron Man-style terminology.

## applyPersonaStyling(items, options)

Applies FRIDAY persona styling to menu items.

**Parameters**:
- `items` (Array<MenuItem>, required): Menu items to style
- `options` (Object, optional):
  - `timeOfDay` (string, optional): 'morning', 'afternoon', 'evening', 'night'
  - `role` (string, optional): 'admin' or 'regular'
  - `context` (string, optional): Menu context

**Returns**: `Array<MenuItem>` - Styled menu items

**Behavior**:
1. Add emoji color indicators based on `color_type`:
   - 'primary' → 🔵
   - 'danger' → 🔴
   - 'secondary' → ⚪️
2. Add time-based contextual emojis if `timeOfDay` provided
3. Apply Iron Man-style terminology to help text
4. Return styled items

**Example**:
```javascript
const styled = keyboardPersona.applyPersonaStyling(items, {
  timeOfDay: 'morning',
  role: 'admin'
});
```

---

## getColorIndicator(colorType)

Gets emoji color indicator for color type.

**Parameters**:
- `colorType` (string, required): 'primary', 'danger', or 'secondary'

**Returns**: `string` - Emoji indicator (🔵, 🔴, or ⚪️)

**Behavior**:
1. Map color type to emoji
2. Return emoji string

---

## getTimeBasedEmoji(timeOfDay)

Gets time-based contextual emoji.

**Parameters**:
- `timeOfDay` (string, required): 'morning', 'afternoon', 'evening', or 'night'

**Returns**: `string` - Time-based emoji (🌅, ☀️, 🌙, 🌃)

---

## formatHelpText(text, context)

Formats help text with FRIDAY persona style.

**Parameters**:
- `text` (string, required): Help text to format
- `context` (Object, optional): Context for formatting

**Returns**: `string` - Formatted help text with FRIDAY persona

**Behavior**:
1. Apply Iron Man-style terminology
2. Add contextual guidance
3. Return formatted text

---

## getPersonaTheme(role)

Gets FRIDAY persona theme for role.

**Parameters**:
- `role` (string, required): 'admin' or 'regular'

**Returns**: `Object` - Theme configuration
- `colorScheme` (string): Color scheme identifier
- `emojiPattern` (string): Emoji pattern
- `style` (string): Style identifier

---

## Integration Points

- **Keyboard Engine**: Uses persona module for styling
- **FRIDAY Persona Service**: Extends existing persona-service.js
- **Time Detection**: Uses existing getTimeOfDay() from persona-service.js

