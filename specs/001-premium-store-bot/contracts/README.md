# API Contracts

This directory contains API contract specifications for the Premium Account Store Telegram Bot.

## Contracts

### telegram-webhook.yaml
OpenAPI 3.0 specification for Telegram Bot API webhook endpoint. Defines the structure of updates received from Telegram when users interact with the bot.

**Endpoint**: `POST /webhook`  
**Purpose**: Receive real-time updates from Telegram Bot API  
**Authentication**: Webhook secret validation (Telegram provides)

### payment-callback.yaml
OpenAPI 3.0 specification for payment gateway callback endpoints. Defines webhook endpoints for QRIS payment verification and status polling.

**Endpoints**:
- `POST /api/payment/callback/qris` - Receives payment verification callbacks from Duitku
- `GET /api/payment/callback/status` - Polling endpoint for payment status (fallback)

**Authentication**: HMAC signature verification (Duitku provides)

## Usage

These contracts define the expected request/response formats for:
1. Telegram Bot API webhook integration
2. Payment gateway callback integration

Implementation must adhere to these contracts to ensure proper integration with external services.

## Testing

Integration tests should validate that:
- Webhook endpoints accept valid Telegram Update objects
- Payment callbacks are processed correctly
- Error handling follows contract specifications
- All required fields are present and validated

