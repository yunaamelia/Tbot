/**
 * Unit tests for i18n module (T154)
 */

const i18n = require('../../../../src/lib/shared/i18n');

describe('i18n', () => {
  describe('t()', () => {
    it('should return message for existing key', () => {
      const message = i18n.t('welcome');
      expect(message).toBe('Selamat datang di Toko Akun Premium!');
    });

    it('should return key if message not found', () => {
      const message = i18n.t('nonexistent_key');
      expect(message).toBe('nonexistent_key');
    });

    it('should replace parameters in message', () => {
      const message = i18n.t('order_created', { orderId: '123' });
      expect(message).toBe('Pesanan Anda telah dibuat dengan ID: 123');
    });

    it('should replace multiple parameters', () => {
      const message = i18n.t('checkout_qris_instructions', {
        qrCodeUrl: 'https://example.com/qr',
        amount: '100000',
      });
      expect(message).toContain('https://example.com/qr');
      expect(message).toContain('Rp 100000');
    });

    it('should handle empty params object', () => {
      const message = i18n.t('welcome', {});
      expect(message).toBe('Selamat datang di Toko Akun Premium!');
    });

    it('should replace all occurrences of parameter', () => {
      i18n.addMessage('test_multiple', 'Hello {name}, welcome {name}');
      const message = i18n.t('test_multiple', { name: 'John' });
      expect(message).toBe('Hello John, welcome John');
    });
  });

  describe('addMessage()', () => {
    it('should add new message', () => {
      i18n.addMessage('test_key', 'Test message');
      expect(i18n.t('test_key')).toBe('Test message');
    });

    it('should update existing message', () => {
      const original = i18n.t('welcome');
      i18n.addMessage('welcome', 'Updated welcome');
      expect(i18n.t('welcome')).toBe('Updated welcome');
      // Restore original
      i18n.addMessage('welcome', original);
    });
  });

  describe('messages object', () => {
    it('should export messages object', () => {
      expect(i18n.messages).toBeDefined();
      expect(typeof i18n.messages).toBe('object');
    });

    it('should contain all required error messages', () => {
      expect(i18n.messages.error_generic).toBeDefined();
      expect(i18n.messages.error_not_found).toBeDefined();
      expect(i18n.messages.error_unauthorized).toBeDefined();
      expect(i18n.messages.error_database).toBeDefined();
      expect(i18n.messages.error_payment_gateway).toBeDefined();
    });
  });
});
