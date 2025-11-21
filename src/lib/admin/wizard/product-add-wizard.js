/**
 * Product Add Wizard Manager
 * Manages multi-step wizard for adding products via admin command
 *
 * Wizard Steps:
 * 1. Name (required)
 * 2. Description (optional)
 * 3. Price (required)
 * 4. Stock (required)
 * 5. Category (optional)
 * 6. Confirm & Create
 */

const { getRedis } = require('../../shared/redis-client');
const logger = require('../../shared/logger').child('product-add-wizard');

const WIZARD_PREFIX = 'wizard:product_add:';
const WIZARD_TTL = 3600; // 1 hour timeout

/**
 * Get wizard state key
 * @param {number} telegramUserId Telegram user ID
 * @returns {string} Redis key
 */
function getWizardKey(telegramUserId) {
  return `${WIZARD_PREFIX}${telegramUserId}`;
}

/**
 * Start wizard session
 * @param {number} telegramUserId Telegram user ID
 * @returns {Promise<Object>} Wizard state
 */
async function startWizard(telegramUserId) {
  try {
    const redis = getRedis();

    // Check if Redis is connected
    if (!redis || redis.status !== 'ready') {
      // Try to connect if not connected
      if (redis && redis.status !== 'ready' && redis.status !== 'connecting') {
        try {
          await redis.connect();
        } catch (connectError) {
          logger.error('Error connecting to Redis for wizard', connectError, {
            telegramUserId,
          });
          throw new Error('Tidak dapat terhubung ke server. Silakan coba lagi nanti.');
        }
      }
    }

    const key = getWizardKey(telegramUserId);

    const state = {
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

    await redis.setex(key, WIZARD_TTL, JSON.stringify(state));
    logger.info('Wizard started', { telegramUserId, step: state.step });

    return state;
  } catch (error) {
    logger.error('Error starting wizard', error, { telegramUserId });

    // Return user-friendly error message
    if (error.message && error.message.includes('writeable')) {
      throw new Error('Tidak dapat terhubung ke server. Silakan coba lagi nanti.');
    }

    throw error;
  }
}

/**
 * Get wizard state
 * @param {number} telegramUserId Telegram user ID
 * @returns {Promise<Object|null>} Wizard state or null if not found
 */
async function getWizardState(telegramUserId) {
  try {
    const redis = getRedis();

    // Check if Redis is connected
    if (!redis || redis.status !== 'ready') {
      logger.debug('Redis not ready, returning null wizard state', {
        telegramUserId,
        redisStatus: redis?.status || 'no-client',
      });
      return null;
    }

    const key = getWizardKey(telegramUserId);

    const stateStr = await redis.get(key);
    if (!stateStr) {
      return null;
    }

    return JSON.parse(stateStr);
  } catch (error) {
    // Handle Redis connection errors gracefully
    if (error.message && error.message.includes('writeable')) {
      logger.debug('Redis not available, returning null wizard state', {
        telegramUserId,
        error: error.message,
      });
      return null;
    }

    logger.error('Error getting wizard state', error, { telegramUserId });
    return null;
  }
}

/**
 * Update wizard state
 * @param {number} telegramUserId Telegram user ID
 * @param {Object} updates State updates
 * @returns {Promise<Object>} Updated wizard state
 */
async function updateWizardState(telegramUserId, updates) {
  try {
    const redis = getRedis();

    // Check if Redis is connected
    if (!redis || redis.status !== 'ready') {
      // Try to connect if not connected
      if (redis && redis.status !== 'ready' && redis.status !== 'connecting') {
        try {
          await redis.connect();
        } catch (connectError) {
          logger.error('Error connecting to Redis for wizard update', connectError, {
            telegramUserId,
          });
          throw new Error('Tidak dapat terhubung ke server. Silakan coba lagi nanti.');
        }
      }
    }

    const key = getWizardKey(telegramUserId);

    const currentState = await getWizardState(telegramUserId);
    if (!currentState) {
      throw new Error('Wizard session not found');
    }

    const updatedState = {
      ...currentState,
      ...updates,
      data: {
        ...currentState.data,
        ...(updates.data || {}),
      },
    };

    await redis.setex(key, WIZARD_TTL, JSON.stringify(updatedState));
    logger.info('Wizard state updated', { telegramUserId, step: updatedState.step, updates });

    return updatedState;
  } catch (error) {
    logger.error('Error updating wizard state', error, { telegramUserId, updates });

    // Return user-friendly error message
    if (error.message && error.message.includes('writeable')) {
      throw new Error('Tidak dapat terhubung ke server. Silakan coba lagi nanti.');
    }

    throw error;
  }
}

/**
 * Set wizard message ID
 * @param {number} telegramUserId Telegram user ID
 * @param {number} messageId Message ID
 * @returns {Promise<void>}
 */
async function setWizardMessageId(telegramUserId, messageId) {
  try {
    const state = await getWizardState(telegramUserId);
    if (state) {
      await updateWizardState(telegramUserId, { messageId });
    }
  } catch (error) {
    // Handle errors gracefully - messageId is not critical
    logger.debug('Error setting wizard message ID', {
      telegramUserId,
      messageId,
      error: error.message,
    });
  }
}

/**
 * Get wizard steps
 * @returns {Array} Array of wizard steps
 */
function getWizardSteps() {
  return [
    { id: 'name', label: 'Nama Produk', required: true },
    { id: 'description', label: 'Deskripsi Produk', required: false },
    { id: 'price', label: 'Harga', required: true },
    { id: 'stock', label: 'Stok', required: true },
    { id: 'category', label: 'Kategori', required: false },
    { id: 'confirm', label: 'Konfirmasi', required: false },
  ];
}

/**
 * Get current step index
 * @param {string} step Step ID
 * @returns {number} Step index
 */
function getStepIndex(step) {
  const steps = getWizardSteps();
  return steps.findIndex((s) => s.id === step);
}

/**
 * Get next step
 * @param {string} currentStep Current step ID
 * @returns {string|null} Next step ID or null if last step
 */
function getNextStep(currentStep) {
  const steps = getWizardSteps();
  const currentIndex = getStepIndex(currentStep);

  if (currentIndex < 0 || currentIndex >= steps.length - 1) {
    return null;
  }

  return steps[currentIndex + 1].id;
}

/**
 * Get previous step
 * @param {string} currentStep Current step ID
 * @returns {string|null} Previous step ID or null if first step
 */
function getPreviousStep(currentStep) {
  const steps = getWizardSteps();
  const currentIndex = getStepIndex(currentStep);

  if (currentIndex <= 0) {
    return null;
  }

  return steps[currentIndex - 1].id;
}

/**
 * Check if step is complete
 * @param {string} step Step ID
 * @param {Object} data Wizard data
 * @returns {boolean} True if step is complete
 */
function isStepComplete(step, data) {
  const steps = getWizardSteps();
  const stepDef = steps.find((s) => s.id === step);

  if (!stepDef) {
    return false;
  }

  if (step === 'confirm') {
    // Confirm step is always available if all required steps are complete
    return data.name && data.price !== null && data.stock !== null;
  }

  if (stepDef.required) {
    return data[step] !== null && data[step] !== '';
  }

  // Optional steps are always "complete" (user can skip)
  return true;
}

/**
 * Validate step data
 * @param {string} step Step ID
 * @param {string} value Step value
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
function validateStepData(step, value) {
  if (!value || value.trim() === '') {
    const steps = getWizardSteps();
    const stepDef = steps.find((s) => s.id === step);
    if (stepDef && stepDef.required) {
      return { valid: false, error: `${stepDef.label} harus diisi` };
    }
    return { valid: true }; // Optional fields can be empty
  }

  switch (step) {
    case 'name':
      if (value.trim().length < 2) {
        return { valid: false, error: 'Nama produk harus minimal 2 karakter' };
      }
      if (value.trim().length > 255) {
        return { valid: false, error: 'Nama produk maksimal 255 karakter' };
      }
      return { valid: true };

    case 'description':
      if (value.trim().length > 1000) {
        return { valid: false, error: 'Deskripsi maksimal 1000 karakter' };
      }
      return { valid: true };

    case 'price': {
      const price = parseFloat(value);
      if (isNaN(price) || price < 0) {
        return { valid: false, error: 'Harga harus berupa angka positif' };
      }
      if (price > 999999999) {
        return { valid: false, error: 'Harga maksimal Rp 999.999.999' };
      }
      return { valid: true };
    }

    case 'stock': {
      const stock = parseInt(value, 10);
      if (isNaN(stock) || stock < 0) {
        return { valid: false, error: 'Stok harus berupa angka non-negatif' };
      }
      if (stock > 999999) {
        return { valid: false, error: 'Stok maksimal 999.999' };
      }
      return { valid: true };
    }

    case 'category':
      if (value.trim().length > 100) {
        return { valid: false, error: 'Kategori maksimal 100 karakter' };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

/**
 * Complete wizard and get product data
 * @param {number} telegramUserId Telegram user ID
 * @returns {Promise<Object>} Product data
 */
async function completeWizard(telegramUserId) {
  try {
    const state = await getWizardState(telegramUserId);
    if (!state) {
      throw new Error('Wizard session not found');
    }

    const { data } = state;

    // Validate required fields
    if (!data.name || !data.price || data.stock === null) {
      throw new Error('Data produk belum lengkap');
    }

    // Clean up wizard state (don't fail if cleanup fails)
    try {
      await endWizard(telegramUserId);
    } catch (cleanupError) {
      logger.warn('Error cleaning up wizard state after completion', {
        telegramUserId,
        error: cleanupError.message,
      });
      // Don't throw - wizard completion succeeded
    }

    return {
      name: data.name.trim(),
      description: data.description ? data.description.trim() : null,
      price: parseFloat(data.price),
      stock_quantity: parseInt(data.stock, 10),
      category: data.category ? data.category.trim() : null,
      features: [],
      media_files: [],
      availability_status: parseInt(data.stock, 10) > 0 ? 'available' : 'out_of_stock',
    };
  } catch (error) {
    logger.error('Error completing wizard', error, { telegramUserId });
    throw error;
  }
}

/**
 * End wizard session
 * @param {number} telegramUserId Telegram user ID
 * @returns {Promise<void>}
 */
async function endWizard(telegramUserId) {
  try {
    const redis = getRedis();

    // Check if Redis is connected
    if (!redis || redis.status !== 'ready') {
      logger.debug('Redis not ready, skipping wizard cleanup', {
        telegramUserId,
        redisStatus: redis?.status || 'no-client',
      });
      return; // Don't throw - cleanup should not fail the operation
    }

    const key = getWizardKey(telegramUserId);

    await redis.del(key);
    logger.info('Wizard ended', { telegramUserId });
  } catch (error) {
    // Handle Redis connection errors gracefully
    if (error.message && error.message.includes('writeable')) {
      logger.debug('Redis not available, skipping wizard cleanup', {
        telegramUserId,
        error: error.message,
      });
      return; // Don't throw - cleanup should not fail the operation
    }

    logger.error('Error ending wizard', error, { telegramUserId });
    // Don't throw - cleanup should not fail the operation
  }
}

module.exports = {
  startWizard,
  getWizardState,
  updateWizardState,
  setWizardMessageId,
  getWizardSteps,
  getStepIndex,
  getNextStep,
  getPreviousStep,
  isStepComplete,
  validateStepData,
  completeWizard,
  endWizard,
};
