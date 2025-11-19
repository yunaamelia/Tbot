/**
 * Unit tests for Order model (T155)
 */

const Order = require('../../../src/models/order');
const { ValidationError } = require('../../../src/lib/shared/errors');

describe('Order Model', () => {
  describe('constructor', () => {
    it('should create order with valid data', () => {
      const data = {
        customer_id: 1,
        product_id: 1,
        quantity: 2,
        total_amount: 200000,
        payment_method: 'qris',
      };

      const order = new Order(data);
      expect(order.customer_id).toBe(1);
      expect(order.product_id).toBe(1);
      expect(order.quantity).toBe(2);
      expect(order.total_amount).toBe(200000);
      expect(order.payment_method).toBe('qris');
    });

    it('should set default values', () => {
      const data = {
        customer_id: 1,
        product_id: 1,
        quantity: 1,
        total_amount: 100000,
        payment_method: 'qris',
      };

      const order = new Order(data);
      expect(order.payment_status).toBe('pending');
      expect(order.order_status).toBe('pending_payment');
      expect(order.account_credentials).toBeNull();
    });
  });

  describe('validate()', () => {
    it('should throw ValidationError if customer_id is missing', () => {
      const data = {
        product_id: 1,
        quantity: 1,
        total_amount: 100000,
        payment_method: 'qris',
      };

      expect(() => new Order(data)).toThrow(ValidationError);
    });

    it('should throw ValidationError if product_id is missing', () => {
      const data = {
        customer_id: 1,
        quantity: 1,
        total_amount: 100000,
        payment_method: 'qris',
      };

      expect(() => new Order(data)).toThrow(ValidationError);
    });

    it('should throw ValidationError if quantity is invalid', () => {
      const data = {
        customer_id: 1,
        product_id: 1,
        quantity: 0,
        total_amount: 100000,
        payment_method: 'qris',
      };

      expect(() => new Order(data)).toThrow(ValidationError);
    });

    it('should throw ValidationError if total_amount is invalid', () => {
      const data = {
        customer_id: 1,
        product_id: 1,
        quantity: 1,
        total_amount: -100,
        payment_method: 'qris',
      };

      expect(() => new Order(data)).toThrow(ValidationError);
    });

    it('should throw ValidationError if payment_method is invalid', () => {
      const data = {
        customer_id: 1,
        product_id: 1,
        quantity: 1,
        total_amount: 100000,
        payment_method: 'invalid_method',
      };

      expect(() => new Order(data)).toThrow(ValidationError);
    });

    it('should throw ValidationError if order_status is invalid', () => {
      const data = {
        customer_id: 1,
        product_id: 1,
        quantity: 1,
        total_amount: 100000,
        payment_method: 'qris',
        order_status: 'invalid_status',
      };

      expect(() => new Order(data)).toThrow(ValidationError);
    });
  });

  describe('canTransitionTo()', () => {
    it('should return true for valid status transition', () => {
      const order = new Order({
        customer_id: 1,
        product_id: 1,
        quantity: 1,
        total_amount: 100000,
        payment_method: 'qris',
        order_status: 'pending_payment',
      });

      expect(order.canTransitionTo('payment_received')).toBe(true);
      expect(order.canTransitionTo('cancelled')).toBe(true);
    });

    it('should return false for invalid status transition', () => {
      const order = new Order({
        customer_id: 1,
        product_id: 1,
        quantity: 1,
        total_amount: 100000,
        payment_method: 'qris',
        order_status: 'pending_payment',
      });

      expect(order.canTransitionTo('processing')).toBe(false);
      expect(order.canTransitionTo('completed')).toBe(false);
    });

    it('should return false for terminal states', () => {
      const completedOrder = new Order({
        customer_id: 1,
        product_id: 1,
        quantity: 1,
        total_amount: 100000,
        payment_method: 'qris',
        order_status: 'completed',
      });

      expect(completedOrder.canTransitionTo('payment_received')).toBe(false);
    });
  });

  describe('toDatabase()', () => {
    it('should convert order to database format', () => {
      const order = new Order({
        id: 1,
        customer_id: 1,
        product_id: 1,
        quantity: 1,
        total_amount: 100000,
        payment_method: 'qris',
      });

      const dbFormat = order.toDatabase();
      expect(dbFormat.id).toBe(1);
      expect(dbFormat.customer_id).toBe(1);
      expect(dbFormat.product_id).toBe(1);
    });
  });
});
