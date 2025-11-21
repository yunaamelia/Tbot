/**
 * Unit tests for Product Add Wizard Manager
 *
 * Tests wizard state management, step navigation, validation, and data handling
 */

const wizardManager = require('../../../../src/lib/admin/wizard/product-add-wizard');
const redisClient = require('../../../../src/lib/shared/redis-client');

// Mock dependencies
jest.mock('../../../../src/lib/shared/redis-client', () => {
  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    status: 'ready',
  };

  return {
    getRedis: jest.fn(() => mockRedis),
    closeRedis: jest.fn(() => Promise.resolve()),
    testConnection: jest.fn(() => Promise.resolve(true)),
  };
});

describe('Product Add Wizard Manager Unit Tests', () => {
  let mockRedis;
  const testUserId = 123456789;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis = redisClient.getRedis();
    // Ensure Redis mock has ready status for tests
    mockRedis.status = 'ready';
  });

  afterAll(async () => {
    try {
      await redisClient.closeRedis();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('startWizard()', () => {
    test('When wizard is started, Then state is stored in Redis with TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const state = await wizardManager.startWizard(testUserId);

      expect(state).toBeDefined();
      expect(state.step).toBe('name');
      expect(state.data).toEqual({
        name: null,
        description: null,
        price: null,
        stock: null,
        category: null,
      });
      expect(state.messageId).toBeNull();
      expect(state.createdAt).toBeDefined();

      expect(mockRedis.setex).toHaveBeenCalled();
      const [key, ttl, stateJson] = mockRedis.setex.mock.calls[0];
      expect(key).toMatch(/wizard:product_add:/);
      expect(ttl).toBe(3600); // 1 hour TTL
      const savedState = JSON.parse(stateJson);
      expect(savedState.step).toBe('name');
    });

    test('When Redis is not available, Then error is thrown', async () => {
      mockRedis.status = 'end';
      mockRedis.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));

      await expect(wizardManager.startWizard(testUserId)).rejects.toThrow(
        'Tidak dapat terhubung ke server'
      );
    });
  });

  describe('getWizardState()', () => {
    test('When wizard state exists, Then state is returned', async () => {
      const expectedState = {
        step: 'price',
        data: {
          name: 'Test Product',
          description: null,
          price: null,
          stock: null,
          category: null,
        },
        messageId: 123,
        createdAt: Date.now(),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(expectedState));

      const state = await wizardManager.getWizardState(testUserId);

      expect(state).toEqual(expectedState);
      expect(mockRedis.get).toHaveBeenCalled();
    });

    test('When wizard state does not exist, Then null is returned', async () => {
      mockRedis.get.mockResolvedValue(null);

      const state = await wizardManager.getWizardState(testUserId);

      expect(state).toBeNull();
    });

    test('When Redis is not ready, Then null is returned', async () => {
      mockRedis.status = 'end';

      const state = await wizardManager.getWizardState(testUserId);

      expect(state).toBeNull();
    });
  });

  describe('updateWizardState()', () => {
    test('When wizard state is updated, Then updated state is saved to Redis', async () => {
      const currentState = {
        step: 'name',
        data: {
          name: null,
          description: null,
          price: null,
          stock: null,
          category: null,
        },
        messageId: null,
        createdAt: Date.now(),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(currentState));
      mockRedis.setex.mockResolvedValue('OK');

      const updatedState = await wizardManager.updateWizardState(testUserId, {
        step: 'description',
        data: { name: 'Test Product' },
      });

      expect(updatedState.step).toBe('description');
      expect(updatedState.data.name).toBe('Test Product');
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    test('When wizard session does not exist, Then error is thrown', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        wizardManager.updateWizardState(testUserId, { step: 'description' })
      ).rejects.toThrow('Wizard session not found');
    });
  });

  describe('endWizard()', () => {
    test('When wizard is ended, Then state is removed from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      await wizardManager.endWizard(testUserId);

      expect(mockRedis.del).toHaveBeenCalled();
      const [key] = mockRedis.del.mock.calls[0];
      expect(key).toMatch(/wizard:product_add:/);
    });

    test('When Redis is not ready, Then cleanup is skipped gracefully', async () => {
      mockRedis.status = 'end';

      await expect(wizardManager.endWizard(testUserId)).resolves.not.toThrow();
    });
  });

  describe('getWizardSteps()', () => {
    test('When steps are retrieved, Then all steps are returned', () => {
      const steps = wizardManager.getWizardSteps();

      expect(steps).toBeDefined();
      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);

      // Check step structure
      steps.forEach((step) => {
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('label');
        expect(step).toHaveProperty('required');
        expect(typeof step.required).toBe('boolean');
      });
    });
  });

  describe('getStepIndex()', () => {
    test('When valid step ID is provided, Then index is returned', () => {
      const index = wizardManager.getStepIndex('name');
      expect(typeof index).toBe('number');
      expect(index).toBeGreaterThanOrEqual(0);
    });

    test('When invalid step ID is provided, Then -1 is returned', () => {
      const index = wizardManager.getStepIndex('invalid_step');
      expect(index).toBe(-1);
    });
  });

  describe('getNextStep()', () => {
    test('When current step has next step, Then next step ID is returned', () => {
      const nextStep = wizardManager.getNextStep('name');
      expect(nextStep).toBeDefined();
      expect(typeof nextStep).toBe('string');
    });

    test('When current step is last step, Then null is returned', () => {
      const steps = wizardManager.getWizardSteps();
      const lastStep = steps[steps.length - 1];
      const nextStep = wizardManager.getNextStep(lastStep.id);
      expect(nextStep).toBeNull();
    });
  });

  describe('getPreviousStep()', () => {
    test('When current step has previous step, Then previous step ID is returned', () => {
      const steps = wizardManager.getWizardSteps();
      if (steps.length > 1) {
        const previousStep = wizardManager.getPreviousStep(steps[1].id);
        expect(previousStep).toBe(steps[0].id);
      }
    });

    test('When current step is first step, Then null is returned', () => {
      const steps = wizardManager.getWizardSteps();
      const firstStep = steps[0];
      const previousStep = wizardManager.getPreviousStep(firstStep.id);
      expect(previousStep).toBeNull();
    });
  });

  describe('isStepComplete()', () => {
    test('When required step has data, Then step is complete', () => {
      const data = {
        name: 'Test Product',
        description: null,
        price: 10000,
        stock: 10,
        category: null,
      };

      const isComplete = wizardManager.isStepComplete('name', data);
      expect(isComplete).toBe(true);
    });

    test('When required step is missing data, Then step is not complete', () => {
      const data = {
        name: null,
        description: null,
        price: null,
        stock: null,
        category: null,
      };

      const isComplete = wizardManager.isStepComplete('name', data);
      expect(isComplete).toBe(false);
    });

    test('When optional step is empty, Then step is complete', () => {
      const data = {
        name: 'Test Product',
        description: null,
        price: 10000,
        stock: 10,
        category: null,
      };

      const isComplete = wizardManager.isStepComplete('description', data);
      expect(isComplete).toBe(true); // Optional steps are always complete
    });
  });

  describe('validateStepData()', () => {
    test('When name is valid, Then validation passes', () => {
      const result = wizardManager.validateStepData('name', 'Valid Product Name');
      expect(result.valid).toBe(true);
    });

    test('When name is too short, Then validation fails', () => {
      const result = wizardManager.validateStepData('name', 'A');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('When name is too long, Then validation fails', () => {
      const longName = 'A'.repeat(256);
      const result = wizardManager.validateStepData('name', longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('When price is valid, Then validation passes', () => {
      const result = wizardManager.validateStepData('price', '10000');
      expect(result.valid).toBe(true);
    });

    test('When price is invalid, Then validation fails', () => {
      const result = wizardManager.validateStepData('price', 'invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('When price is negative, Then validation fails', () => {
      const result = wizardManager.validateStepData('price', '-100');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('When stock is valid, Then validation passes', () => {
      const result = wizardManager.validateStepData('stock', '10');
      expect(result.valid).toBe(true);
    });

    test('When stock is invalid, Then validation fails', () => {
      const result = wizardManager.validateStepData('stock', 'invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('When stock is negative, Then validation fails', () => {
      const result = wizardManager.validateStepData('stock', '-5');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('When description is too long, Then validation fails', () => {
      const longDescription = 'A'.repeat(1001);
      const result = wizardManager.validateStepData('description', longDescription);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('When category is too long, Then validation fails', () => {
      const longCategory = 'A'.repeat(101);
      const result = wizardManager.validateStepData('category', longCategory);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('completeWizard()', () => {
    test('When all required data is complete, Then product data is returned', async () => {
      const wizardState = {
        step: 'confirm',
        data: {
          name: 'Test Product',
          description: 'Test Description',
          price: '10000',
          stock: '10',
          category: 'Test Category',
        },
        messageId: 123,
        createdAt: Date.now(),
      };
      // Mock getWizardState - completeWizard calls getWizardState once
      // getWizardState calls redis.get once
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(wizardState));
      mockRedis.del.mockResolvedValueOnce(1);

      const productData = await wizardManager.completeWizard(testUserId);

      expect(productData).toBeDefined();
      expect(productData.name).toBe('Test Product');
      expect(productData.description).toBe('Test Description');
      expect(productData.price).toBe(10000);
      expect(productData.stock_quantity).toBe(10);
      expect(productData.category).toBe('Test Category');
      expect(productData.availability_status).toBe('available');
    });

    test('When required data is missing, Then error is thrown', async () => {
      const wizardState = {
        step: 'confirm',
        data: {
          name: null,
          description: null,
          price: null,
          stock: null,
          category: null,
        },
        messageId: null,
        createdAt: Date.now(),
      };
      // Mock getWizardState - completeWizard calls getWizardState once
      // getWizardState calls redis.get once
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(wizardState));

      await expect(wizardManager.completeWizard(testUserId)).rejects.toThrow(
        'Data produk belum lengkap'
      );
    });

    test('When wizard session does not exist, Then error is thrown', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(wizardManager.completeWizard(testUserId)).rejects.toThrow(
        'Wizard session not found'
      );
    });

    test('When stock is zero, Then availability_status is out_of_stock', async () => {
      const wizardState = {
        step: 'confirm',
        data: {
          name: 'Test Product',
          description: null,
          price: '10000',
          stock: '0',
          category: null,
        },
        messageId: null,
        createdAt: Date.now(),
      };
      // Mock getWizardState - completeWizard calls getWizardState once
      // getWizardState calls redis.get once
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(wizardState));
      mockRedis.del.mockResolvedValueOnce(1);

      const productData = await wizardManager.completeWizard(testUserId);

      expect(productData.availability_status).toBe('out_of_stock');
    });
  });

  describe('setWizardMessageId()', () => {
    test('When message ID is set, Then state is updated', async () => {
      const currentState = {
        step: 'name',
        data: {
          name: null,
          description: null,
          price: null,
          stock: null,
          category: null,
        },
        messageId: null,
        createdAt: Date.now(),
      };
      // setWizardMessageId calls getWizardState (redis.get once)
      // Then updateWizardState calls getWizardState again (redis.get second time)
      // Then updateWizardState calls redis.setex
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(currentState)) // First call in setWizardMessageId -> getWizardState
        .mockResolvedValueOnce(JSON.stringify(currentState)); // Second call in updateWizardState -> getWizardState
      mockRedis.setex.mockResolvedValueOnce('OK');

      await wizardManager.setWizardMessageId(testUserId, 123);

      expect(mockRedis.get).toHaveBeenCalledTimes(2); // Called twice
      expect(mockRedis.setex).toHaveBeenCalledTimes(1);
    });

    test('When wizard session does not exist, Then no error is thrown', async () => {
      // setWizardMessageId calls getWizardState (redis.get once)
      // If state is null, it should return early without calling updateWizardState
      mockRedis.get.mockResolvedValueOnce(null);

      await expect(wizardManager.setWizardMessageId(testUserId, 123)).resolves.not.toThrow();
      // Should call get once but not setex if state doesn't exist
      expect(mockRedis.get).toHaveBeenCalledTimes(1);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });
});
