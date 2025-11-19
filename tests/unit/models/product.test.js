/**
 * Unit tests for Product model (T155)
 */

const Product = require('../../../src/models/product');
const { ValidationError } = require('../../../src/lib/shared/errors');

describe('Product Model', () => {
  describe('constructor', () => {
    it('should create product with valid data', () => {
      const data = {
        name: 'Test Product',
        price: 100000,
        stock_quantity: 10,
        category: 'premium',
      };

      const product = new Product(data);
      expect(product.name).toBe('Test Product');
      expect(product.price).toBe(100000);
      expect(product.stock_quantity).toBe(10);
      expect(product.category).toBe('premium');
    });

    it('should set default values', () => {
      const data = {
        name: 'Test Product',
        price: 100000,
        stock_quantity: 10,
      };

      const product = new Product(data);
      expect(product.description).toBeNull();
      expect(product.features).toEqual([]);
      expect(product.media_files).toEqual([]);
      expect(product.availability_status).toBe('available');
    });

    it('should auto-update availability_status when stock is 0', () => {
      const data = {
        name: 'Test Product',
        price: 100000,
        stock_quantity: 0,
        availability_status: 'available',
      };

      const product = new Product(data);
      expect(product.availability_status).toBe('out_of_stock');
    });

    it('should auto-update availability_status when stock is added', () => {
      const data = {
        name: 'Test Product',
        price: 100000,
        stock_quantity: 5,
        availability_status: 'out_of_stock',
      };

      const product = new Product(data);
      expect(product.availability_status).toBe('available');
    });
  });

  describe('validate()', () => {
    it('should throw ValidationError if name is missing', () => {
      const data = {
        price: 100000,
        stock_quantity: 10,
      };

      expect(() => new Product(data)).toThrow(ValidationError);
    });

    it('should throw ValidationError if name is empty string', () => {
      const data = {
        name: '',
        price: 100000,
        stock_quantity: 10,
      };

      expect(() => new Product(data)).toThrow(ValidationError);
    });

    it('should throw ValidationError if name exceeds 255 characters', () => {
      const data = {
        name: 'a'.repeat(256),
        price: 100000,
        stock_quantity: 10,
      };

      expect(() => new Product(data)).toThrow(ValidationError);
    });

    it('should throw ValidationError if price is negative', () => {
      const data = {
        name: 'Test Product',
        price: -100,
        stock_quantity: 10,
      };

      expect(() => new Product(data)).toThrow(ValidationError);
    });

    it('should throw ValidationError if stock_quantity is negative', () => {
      const data = {
        name: 'Test Product',
        price: 100000,
        stock_quantity: -1,
      };

      expect(() => new Product(data)).toThrow(ValidationError);
    });

    it('should throw ValidationError if availability_status is invalid', () => {
      const data = {
        name: 'Test Product',
        price: 100000,
        stock_quantity: 10,
        availability_status: 'invalid_status',
      };

      expect(() => new Product(data)).toThrow(ValidationError);
    });
  });

  describe('isAvailable()', () => {
    it('should return true when product is available', () => {
      const product = new Product({
        name: 'Test Product',
        price: 100000,
        stock_quantity: 10,
        availability_status: 'available',
      });

      expect(product.isAvailable()).toBe(true);
    });

    it('should return false when stock is 0', () => {
      const product = new Product({
        name: 'Test Product',
        price: 100000,
        stock_quantity: 0,
        availability_status: 'available',
      });

      expect(product.isAvailable()).toBe(false);
    });

    it('should return false when status is out_of_stock', () => {
      // Note: When stock > 0 and status is out_of_stock, validate() auto-updates to 'available'
      // So we need to set stock to 0 to test out_of_stock status
      const product = new Product({
        name: 'Test Product',
        price: 100000,
        stock_quantity: 0,
        availability_status: 'out_of_stock',
      });

      expect(product.isAvailable()).toBe(false);
    });
  });

  describe('toDatabase()', () => {
    it('should convert product to database format', () => {
      const product = new Product({
        id: 1,
        name: 'Test Product',
        price: 100000,
        stock_quantity: 10,
        features: ['feature1', 'feature2'],
        media_files: ['image1.jpg'],
      });

      const dbFormat = product.toDatabase();
      expect(dbFormat.id).toBe(1);
      expect(dbFormat.name).toBe('Test Product');
      expect(typeof dbFormat.features).toBe('string');
      expect(typeof dbFormat.media_files).toBe('string');
    });
  });
});
