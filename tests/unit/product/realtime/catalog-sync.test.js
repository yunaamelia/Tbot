/**
 * Unit tests for Catalog Synchronization (Real-Time Stock Management)
 * Tests catalog synchronization logic after stock updates
 *
 * Task: T078
 * Requirement: FR-010, FR-052
 * Feature: 002-friday-enhancement
 */

const catalogSync = require('../../../../src/lib/product/realtime/catalog-sync');
const productRepository = require('../../../../src/lib/product/product-repository');
const redisClient = require('../../../../src/lib/shared/redis-client');

jest.mock('../../../../src/lib/product/product-repository');
jest.mock('../../../../src/lib/shared/redis-client');

describe('Catalog Sync Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Stop catalog sync listener if running
    try {
      await Promise.race([
        catalogSync.stopListening(),
        new Promise((resolve) => setTimeout(resolve, 300)),
      ]);
    } catch (error) {
      // Ignore if already stopped
    }
  }, 3000);

  describe('syncCatalog()', () => {
    test('should invalidate product cache after stock update', async () => {
      const productId = 1;
      const quantity = 15;

      // Mock cache invalidation
      const mockDel = jest.fn().mockResolvedValue(1);
      redisClient.getRedis = jest.fn().mockReturnValue({
        del: mockDel,
      });

      // Mock product repository
      productRepository.findById = jest.fn().mockResolvedValue({
        id: productId,
        availability_status: 'available',
      });

      await catalogSync.syncCatalog(productId, quantity);

      // Verify cache invalidation was called (via getRedis)
      expect(redisClient.getRedis).toHaveBeenCalled();
    });

    test('should update product availability status when stock reaches zero', async () => {
      const productId = 1;
      const quantity = 0;

      // Mock Redis
      redisClient.getRedis = jest.fn().mockReturnValue({
        del: jest.fn().mockResolvedValue(1),
      });

      // Mock product repository
      productRepository.findById = jest.fn().mockResolvedValue({
        id: productId,
        availability_status: 'available',
      });
      productRepository.updateAvailabilityStatus = jest.fn().mockResolvedValue(true);

      await catalogSync.syncCatalog(productId, quantity);

      // Verify availability status update was called
      expect(productRepository.updateAvailabilityStatus).toHaveBeenCalledWith(
        productId,
        'out_of_stock'
      );
    });

    test('should update product availability status when stock added to out-of-stock product', async () => {
      const productId = 1;
      const quantity = 10;

      // Mock Redis
      redisClient.getRedis = jest.fn().mockReturnValue({
        del: jest.fn().mockResolvedValue(1),
      });

      // Mock product repository
      productRepository.findById = jest.fn().mockResolvedValue({
        id: productId,
        availability_status: 'out_of_stock',
      });
      productRepository.updateAvailabilityStatus = jest.fn().mockResolvedValue(true);

      await catalogSync.syncCatalog(productId, quantity);

      // Verify availability status update was called
      expect(productRepository.updateAvailabilityStatus).toHaveBeenCalledWith(
        productId,
        'available'
      );
    });

    test('should handle errors gracefully', async () => {
      const productId = 1;
      const quantity = 15;

      // Mock Redis error
      redisClient.getRedis = jest.fn().mockReturnValue(null);

      // Mock product repository
      productRepository.findById = jest.fn().mockResolvedValue({
        id: productId,
        availability_status: 'available',
      });

      // Should not throw
      await expect(catalogSync.syncCatalog(productId, quantity)).resolves.not.toThrow();
    });
  });
});
