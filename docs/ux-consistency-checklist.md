# UX Consistency Checklist

**Task: T164**  
**Requirement: FR-047, Article XIII**

This document ensures consistent rich media UI/UX across all user interactions (browsing, checkout, notifications).

## Rich Media Requirements

All user interactions MUST use:
- ✅ Inline keyboards for interactive buttons
- ✅ Media groups for multiple images/documents
- ✅ Rich text formatting (Markdown) where appropriate
- ✅ Clear, discoverable options
- ✅ Indonesian language for all text

## Interaction Points

### 1. Product Browsing (User Story 1)

**Status**: ✅ **COMPLIANT**

- ✅ Product cards displayed with inline keyboard navigation
- ✅ Next/Previous buttons for carousel navigation
- ✅ "Lihat Detail" button on each product card
- ✅ Stock status displayed visually
- ✅ All text in Indonesian

**Implementation**:
- `src/lib/product/product-card-formatter.js` - Formats cards with inline keyboards
- `src/lib/product/product-carousel-handler.js` - Handles navigation
- `src/bot.js` - Callback query handlers

---

### 2. Product Details (User Story 2)

**Status**: ✅ **COMPLIANT**

- ✅ Media groups for multiple product images/documents
- ✅ "Kembali" (Back) button to return to carousel
- ✅ "Beli" (Buy) button for purchase
- ✅ Rich text formatting for product information
- ✅ All text in Indonesian

**Implementation**:
- `src/lib/product/product-details-formatter.js` - Formats details with media
- `src/lib/telegram/media-group-builder.js` - Builds media groups
- `src/lib/product/product-details-handler.js` - Handles details view

---

### 3. Checkout Process (User Story 3)

**Status**: ✅ **COMPLIANT**

- ✅ Step-by-step wizard with inline keyboard buttons
- ✅ Order summary with formatted text
- ✅ Payment method selection buttons (QRIS/Transfer Bank)
- ✅ QRIS code/image display
- ✅ Payment instructions with formatting
- ✅ All text in Indonesian

**Implementation**:
- `src/lib/order/checkout-handler.js` - Manages checkout flow
- `src/lib/payment/qris-handler.js` - QRIS payment display
- `src/lib/payment/manual-verification.js` - Bank transfer instructions

---

### 4. Order Notifications (User Story 4)

**Status**: ✅ **COMPLIANT**

- ✅ Rich media notifications with progress indicators
- ✅ Status updates with formatted text
- ✅ Interactive elements where appropriate
- ✅ All text in Indonesian

**Implementation**:
- `src/lib/shared/notification-templates.js` - Notification templates
- `src/lib/admin/admin-notification-dispatcher.js` - Admin notifications

---

### 5. Admin Notifications (User Story 6)

**Status**: ✅ **COMPLIANT**

- ✅ Rich media notifications with action buttons
- ✅ "Verify Payment" and "Reject Payment" buttons
- ✅ Formatted order and payment information
- ✅ All text in Indonesian

**Implementation**:
- `src/lib/admin/admin-notification-dispatcher.js` - Formats admin notifications
- `src/bot.js` - Handles admin action callbacks

---

### 6. Customer Service (User Story 6)

**Status**: ✅ **COMPLIANT**

- ✅ FAQ list with inline keyboard navigation
- ✅ Help command with interactive buttons
- ✅ Chat interface with formatted messages
- ✅ Ticket creation with structured input
- ✅ All text in Indonesian

**Implementation**:
- `src/lib/customer-service/faq-handler.js` - FAQ handling
- `src/lib/customer-service/chat-handler.js` - Live chat
- `src/lib/customer-service/ticket-service.js` - Support tickets

---

## Consistency Rules

### Inline Keyboards

**Rule**: All interactive actions MUST use inline keyboards, not text commands.

**Examples**:
- ✅ Product navigation: Next/Previous buttons
- ✅ Product actions: "Lihat Detail", "Beli" buttons
- ✅ Payment methods: QRIS/Transfer Bank selection buttons
- ✅ Admin actions: Verify/Reject payment buttons

### Media Groups

**Rule**: Multiple images/documents MUST be sent as media groups.

**Examples**:
- ✅ Product details with multiple images
- ✅ Payment proof uploads (if multiple files)

### Text Formatting

**Rule**: Use Markdown formatting for emphasis and structure.

**Examples**:
- ✅ Product names: `*Product Name*`
- ✅ Prices: `*Rp 100,000*`
- ✅ Status indicators: `✅`, `⏳`, `❌`
- ✅ Section headers: `*Section Name*`

### Language

**Rule**: ALL user-facing text MUST be in Indonesian.

**Validation**: All messages use `i18n.t()` function from `src/lib/shared/i18n.js`

---

## Regression Detection

**Task: T165**  
**Requirement: FR-048, Article XIII**

### Process

1. **Before Release**:
   - Review all user interaction points
   - Verify inline keyboards are present
   - Verify media groups work correctly
   - Verify all text is in Indonesian
   - Test on real Telegram client

2. **Regression Detection**:
   - If any interaction lacks inline keyboards → **DEFECT**
   - If media groups fail to display → **DEFECT**
   - If text is not in Indonesian → **DEFECT**
   - If formatting is broken → **DEFECT**

3. **Handling**:
   - UX regressions are treated as **BLOCKING DEFECTS**
   - Must be fixed before release
   - Document in release notes if intentional change

### Checklist Before Release

- [ ] All product browsing uses inline keyboards
- [ ] All product details use media groups (when media available)
- [ ] All checkout steps use inline keyboards
- [ ] All notifications use rich formatting
- [ ] All admin notifications have action buttons
- [ ] All customer service interactions use inline keyboards
- [ ] All text is in Indonesian
- [ ] All formatting renders correctly in Telegram
- [ ] Tested on real Telegram client (not just API)

---

## Maintenance

This checklist should be reviewed:
- Before each release
- When adding new user interactions
- When modifying existing interactions
- When receiving UX-related bug reports

**Last Updated**: 2024-01-15  
**Maintained By**: Development Team

