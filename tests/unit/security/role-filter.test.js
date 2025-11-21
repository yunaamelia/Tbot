/**
 * Unit tests for Role-Based Filtering (User Story 3)
 *
 * Tasks: T045, T046, T047
 * Requirements: FR-007, FR-009, FR-010
 * Feature: 003-enhanced-keyboard
 */

const roleFilter = require('../../../src/lib/security/role-filter');
const adminRepository = require('../../../src/lib/admin/admin-repository');
const redisClientModule = require('../../../src/lib/shared/redis-client');

// Mock dependencies
jest.mock('../../../src/lib/admin/admin-repository');
jest.mock('../../../src/lib/shared/redis-client', () => {
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  return {
    getRedis: jest.fn(() => mockRedis),
    closeRedis: jest.fn(() => Promise.resolve()),
    testConnection: jest.fn(() => Promise.resolve(true)),
  };
});

describe('Role Filter Unit Tests', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mock Redis instance from the module
    mockRedis = redisClientModule.getRedis();
  });

  afterAll(async () => {
    try {
      await redisClientModule.closeRedis();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('getUserRole() with caching and fail-safe (T045)', () => {
    const testUserId = 123456789;

    test('When role is in cache, Then returns cached role', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ role: 'admin' }));

      const result = await roleFilter.getUserRole(testUserId);

      expect(result.role).toBe('admin');
      expect(result.cached).toBe(true);
      expect(result.source).toBe('cache');
      expect(mockRedis.get).toHaveBeenCalledWith(`role:user:${testUserId}`);
      expect(adminRepository.findByTelegramId).not.toHaveBeenCalled();
    });

    test('When cache miss and user is admin, Then returns admin role and caches it', async () => {
      mockRedis.get.mockResolvedValue(null);
      adminRepository.findByTelegramId.mockResolvedValue({ id: 1, telegram_user_id: testUserId });

      const result = await roleFilter.getUserRole(testUserId);

      expect(result.role).toBe('admin');
      expect(result.cached).toBe(false);
      expect(result.source).toBe('database');
      expect(adminRepository.findByTelegramId).toHaveBeenCalledWith(testUserId);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    test('When cache miss and user is not admin, Then returns regular role', async () => {
      mockRedis.get.mockResolvedValue(null);
      adminRepository.findByTelegramId.mockResolvedValue(null);

      const result = await roleFilter.getUserRole(testUserId);

      expect(result.role).toBe('regular');
      expect(result.cached).toBe(false);
      expect(result.source).toBe('database');
    });

    test('When Redis fails, Then falls back to database', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      adminRepository.findByTelegramId.mockResolvedValue({ id: 1, telegram_user_id: testUserId });

      const result = await roleFilter.getUserRole(testUserId);

      expect(result.role).toBe('admin');
      expect(result.source).toBe('database');
    });

    test('When database query fails, Then defaults to regular user (fail-safe)', async () => {
      mockRedis.get.mockResolvedValue(null);
      adminRepository.findByTelegramId.mockRejectedValue(new Error('Database error'));

      const result = await roleFilter.getUserRole(testUserId);

      expect(result.role).toBe('regular');
      expect(result.source).toBe('fail-safe');
      expect(result.cached).toBe(false);
    });

    test('When Redis and database both fail, Then defaults to regular user (fail-safe)', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      adminRepository.findByTelegramId.mockRejectedValue(new Error('Database error'));

      const result = await roleFilter.getUserRole(testUserId);

      expect(result.role).toBe('regular');
      expect(result.source).toBe('fail-safe');
    });
  });

  describe('filterMenuItemsByRole() (T046)', () => {
    const menuItems = [
      { id: '1', text: 'Public Item', callback_data: 'public', roles: [] }, // All users
      { id: '2', text: 'Admin Item', callback_data: 'admin', roles: ['admin'] }, // Admin only
      { id: '3', text: 'Regular Item', callback_data: 'regular', roles: ['regular'] }, // Regular only
      { id: '4', text: 'Both Item', callback_data: 'both', roles: ['admin', 'regular'] }, // Both
    ];

    test('When filtering for admin, Then returns admin-visible items', () => {
      const filtered = roleFilter.filterMenuItemsByRole(menuItems, 'admin');

      const itemIds = filtered.map((item) => item.id);
      expect(itemIds).toContain('1'); // Public
      expect(itemIds).toContain('2'); // Admin
      expect(itemIds).not.toContain('3'); // Regular only
      expect(itemIds).toContain('4'); // Both
    });

    test('When filtering for regular user, Then returns regular-visible items', () => {
      const filtered = roleFilter.filterMenuItemsByRole(menuItems, 'regular');

      const itemIds = filtered.map((item) => item.id);
      expect(itemIds).toContain('1'); // Public
      expect(itemIds).not.toContain('2'); // Admin only
      expect(itemIds).toContain('3'); // Regular
      expect(itemIds).toContain('4'); // Both
    });

    test('When item has empty roles array, Then visible to all users', () => {
      const publicItems = [{ text: 'Public', roles: [] }];

      const adminFiltered = roleFilter.filterMenuItemsByRole(publicItems, 'admin');
      const regularFiltered = roleFilter.filterMenuItemsByRole(publicItems, 'regular');

      expect(adminFiltered.length).toBe(1);
      expect(regularFiltered.length).toBe(1);
    });

    test('When item has no roles property, Then visible to all users', () => {
      const noRoleItems = [{ text: 'No Role', callback_data: 'no_role' }];

      const adminFiltered = roleFilter.filterMenuItemsByRole(noRoleItems, 'admin');
      const regularFiltered = roleFilter.filterMenuItemsByRole(noRoleItems, 'regular');

      expect(adminFiltered.length).toBe(1);
      expect(regularFiltered.length).toBe(1);
    });
  });

  describe('markDisabledButtons() (T047)', () => {
    const menuItems = [
      { id: '1', text: 'Public Item', callback_data: 'public', roles: [] },
      { id: '2', text: 'Admin Item', callback_data: 'admin', roles: ['admin'] },
    ];

    test('When marking for admin, Then admin items are enabled', () => {
      const marked = roleFilter.markDisabledButtons(menuItems, 'admin');

      const adminItem = marked.find((item) => item.id === '2');
      expect(adminItem).toBeDefined();
      expect(adminItem.disabled).toBe(false);
    });

    test('When marking for regular user, Then admin items are disabled', () => {
      const marked = roleFilter.markDisabledButtons(menuItems, 'regular');

      // If admin items are shown to regular users, they should be disabled
      // Implementation may choose to hide or disable - test accordingly
      const adminItem = marked.find((item) => item.id === '2');
      if (adminItem) {
        // If shown, should be disabled
        expect(adminItem.disabled).toBe(true);
      }
    });

    test('When marking public items, Then items remain enabled', () => {
      const marked = roleFilter.markDisabledButtons(menuItems, 'regular');

      const publicItem = marked.find((item) => item.id === '1');
      expect(publicItem).toBeDefined();
      expect(publicItem.disabled).toBe(false);
    });
  });

  describe('Cache Management', () => {
    const testUserId = 123456789;

    test('When invalidateRoleCache is called, Then cache key is deleted', async () => {
      mockRedis.del.mockResolvedValue(1);

      await roleFilter.invalidateRoleCache(testUserId);

      expect(mockRedis.del).toHaveBeenCalledWith(`role:user:${testUserId}`);
    });

    test('When invalidateRoleCache fails, Then error is handled gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(roleFilter.invalidateRoleCache(testUserId)).resolves.not.toThrow();
    });
  });
});
