/**
 * Product Add Wizard Handler
 * Handles UI/UX for product add wizard with step-by-step flow
 */

const wizardManager = require('./product-add-wizard');
const { Markup } = require('telegraf');
const logger = require('../../shared/logger').child('product-add-wizard-handler');

/**
 * Escape HTML special characters
 * @param {string} text Text to escape
 * @returns {string} Escaped text
 */
function escapeHTML(text) {
  if (!text || typeof text !== 'string') {
    return String(text || '');
  }
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Get step message
 * @param {string} step Step ID
 * @param {Object} data Wizard data
 * @returns {Object} Message text and keyboard
 */
function getStepMessage(step, data) {
  const steps = wizardManager.getWizardSteps();
  const currentIndex = wizardManager.getStepIndex(step);
  const totalSteps = steps.length;

  let message = `📝 <b>Tambah Produk Baru</b>\n\n`;
  message += `Langkah ${currentIndex + 1} dari ${totalSteps}: <b>${steps[currentIndex].label}</b>\n\n`;

  // Show current data summary
  if (data.name) {
    message += `✅ Nama: <b>${escapeHTML(data.name)}</b>\n`;
  }
  if (data.description) {
    message += `✅ Deskripsi: <b>${escapeHTML(data.description.substring(0, 50))}${data.description.length > 50 ? '...' : ''}</b>\n`;
  }
  if (data.price !== null) {
    message += `✅ Harga: <b>Rp ${parseFloat(data.price).toLocaleString('id-ID')}</b>\n`;
  }
  if (data.stock !== null) {
    message += `✅ Stok: <b>${data.stock}</b> unit\n`;
  }
  if (data.category) {
    message += `✅ Kategori: <b>${escapeHTML(data.category)}</b>\n`;
  }

  message += `\n`;

  // Step-specific instructions
  switch (step) {
    case 'name':
      message += `💬 <i>Masukkan nama produk (minimal 2 karakter):</i>`;
      break;

    case 'description':
      message += `💬 <i>Masukkan deskripsi produk (opsional, maksimal 1000 karakter):</i>\n`;
      message += `💡 <i>Tekan "Lewati" jika tidak ingin menambahkan deskripsi.</i>`;
      break;

    case 'price':
      message += `💬 <i>Masukkan harga produk dalam angka (tanpa titik atau koma):</i>\n`;
      message += `📝 <i>Contoh: 50000 untuk Rp 50.000</i>`;
      break;

    case 'stock':
      message += `💬 <i>Masukkan jumlah stok produk:</i>\n`;
      message += `📝 <i>Contoh: 10 untuk 10 unit</i>`;
      break;

    case 'category':
      message += `💬 <i>Masukkan kategori produk (opsional, maksimal 100 karakter):</i>\n`;
      message += `💡 <i>Tekan "Lewati" jika tidak ingin menambahkan kategori.</i>`;
      break;

    case 'confirm':
      message += `📋 <b>Konfirmasi Data Produk</b>\n\n`;
      message += `Nama: <b>${escapeHTML(data.name)}</b>\n`;
      message += `Deskripsi: <b>${data.description ? escapeHTML(data.description) : 'Tidak ada'}</b>\n`;
      message += `Harga: <b>Rp ${parseFloat(data.price).toLocaleString('id-ID')}</b>\n`;
      message += `Stok: <b>${data.stock}</b> unit\n`;
      message += `Kategori: <b>${data.category ? escapeHTML(data.category) : 'Tidak ada'}</b>\n\n`;
      message += `💬 <i>Apakah data di atas sudah benar? Tekan "Buat Produk" untuk membuat produk baru.</i>`;
      break;

    default:
      message += `💬 <i>Silakan masukkan data:</i>`;
  }

  // Build keyboard
  const keyboard = [];
  const actionRow = [];

  // Back button (except for first step)
  if (step !== 'name') {
    const prevStep = wizardManager.getPreviousStep(step);
    if (prevStep) {
      actionRow.push(Markup.button.callback('◀️ Kembali', `wizard_back_${prevStep}`));
    }
  }

  // Skip button (only for optional steps)
  if (step === 'description' || step === 'category') {
    const nextStep = wizardManager.getNextStep(step);
    if (nextStep) {
      actionRow.push(Markup.button.callback('⏭️ Lewati', `wizard_skip_${step}`));
    }
  }

  // Confirm/Create button (only for confirm step)
  if (step === 'confirm') {
    actionRow.push(Markup.button.callback('✅ Buat Produk', 'wizard_confirm_create'));
  }

  // Cancel button (always available)
  actionRow.push(Markup.button.callback('❌ Batal', 'wizard_cancel'));

  if (actionRow.length > 0) {
    keyboard.push(actionRow);
  }

  // Ensure keyboard is properly created
  // Markup.inlineKeyboard returns an object with reply_markup property containing inline_keyboard
  const keyboardMarkup = Markup.inlineKeyboard(keyboard);

  // Ensure reply_markup is properly structured
  // Use reply_markup property if available, otherwise use the object directly
  let replyMarkup = keyboardMarkup;
  if (keyboardMarkup && keyboardMarkup.reply_markup) {
    replyMarkup = keyboardMarkup.reply_markup;
  } else if (!keyboardMarkup || !keyboardMarkup.inline_keyboard) {
    // Fallback: create minimal keyboard if none exists
    replyMarkup =
      Markup.inlineKeyboard([[Markup.button.callback('❌ Batal', 'wizard_cancel')]]).reply_markup ||
      Markup.inlineKeyboard([[Markup.button.callback('❌ Batal', 'wizard_cancel')]]);
  }

  return {
    text: message,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  };
}

/**
 * Start wizard and show first step
 * @param {number} telegramUserId Telegram user ID
 * @returns {Promise<Object>} Message text and keyboard
 */
async function startWizardFlow(telegramUserId) {
  try {
    const state = await wizardManager.startWizard(telegramUserId);
    const message = getStepMessage(state.step, state.data);
    return message;
  } catch (error) {
    logger.error('Error starting wizard flow', error, { telegramUserId });
    throw error;
  }
}

/**
 * Process user input for current step
 * @param {number} telegramUserId Telegram user ID
 * @param {string} input User input
 * @returns {Promise<Object>} Result { success: boolean, message?: Object, error?: string }
 */
async function processStepInput(telegramUserId, input) {
  try {
    const state = await wizardManager.getWizardState(telegramUserId);
    if (!state) {
      return {
        success: false,
        error: 'Sesi wizard tidak ditemukan. Silakan mulai ulang dengan /admin product add',
      };
    }

    const { step, data } = state;

    // Validate input
    const validation = wizardManager.validateStepData(step, input);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Update data
    const updatedData = { ...data };

    // Handle empty input for optional fields
    if ((step === 'description' || step === 'category') && (!input || input.trim() === '')) {
      updatedData[step] = null;
    } else {
      updatedData[step] = input.trim();
    }

    // Move to next step
    const nextStep = wizardManager.getNextStep(step);
    if (!nextStep) {
      // Last step - shouldn't happen here
      return {
        success: false,
        error: 'Langkah terakhir. Silakan konfirmasi untuk membuat produk.',
      };
    }

    // Update wizard state
    await wizardManager.updateWizardState(telegramUserId, {
      step: nextStep,
      data: updatedData,
    });

    // Get next step message
    const nextState = await wizardManager.getWizardState(telegramUserId);
    const message = getStepMessage(nextState.step, nextState.data);

    // Ensure reply_markup is properly structured
    if (!message.reply_markup || !message.reply_markup.inline_keyboard) {
      // If keyboard is missing, create a minimal one
      const { Markup } = require('telegraf');
      message.reply_markup = Markup.inlineKeyboard([
        [Markup.button.callback('❌ Batal', 'wizard_cancel')],
      ]);
    }

    return {
      success: true,
      message,
    };
  } catch (error) {
    logger.error('Error processing step input', error, { telegramUserId, input });
    return {
      success: false,
      error: error.message || 'Terjadi kesalahan saat memproses input.',
    };
  }
}

/**
 * Skip current step (for optional steps)
 * @param {number} telegramUserId Telegram user ID
 * @param {string} step Step to skip
 * @returns {Promise<Object>} Next step message
 */
async function skipStep(telegramUserId, step) {
  try {
    const state = await wizardManager.getWizardState(telegramUserId);
    if (!state) {
      throw new Error('Wizard session not found');
    }

    // Set step data to null
    const updatedData = { ...state.data, [step]: null };

    // Move to next step
    const nextStep = wizardManager.getNextStep(step);
    if (!nextStep) {
      throw new Error('No next step available');
    }

    // Update wizard state
    await wizardManager.updateWizardState(telegramUserId, {
      step: nextStep,
      data: updatedData,
    });

    // Get next step message
    const nextState = await wizardManager.getWizardState(telegramUserId);
    const message = getStepMessage(nextState.step, nextState.data);

    // Ensure reply_markup is properly structured
    if (!message.reply_markup || !message.reply_markup.inline_keyboard) {
      // If keyboard is missing, create a minimal one
      const { Markup } = require('telegraf');
      message.reply_markup = Markup.inlineKeyboard([
        [Markup.button.callback('❌ Batal', 'wizard_cancel')],
      ]);
    }

    return message;
  } catch (error) {
    logger.error('Error skipping step', error, { telegramUserId, step });
    throw error;
  }
}

/**
 * Go back to previous step
 * @param {number} telegramUserId Telegram user ID
 * @param {string} targetStep Step to go back to
 * @returns {Promise<Object>} Previous step message
 */
async function goBackToStep(telegramUserId, targetStep) {
  try {
    const state = await wizardManager.getWizardState(telegramUserId);
    if (!state) {
      throw new Error('Wizard session not found');
    }

    // Update wizard state
    await wizardManager.updateWizardState(telegramUserId, {
      step: targetStep,
    });

    // Get step message
    const updatedState = await wizardManager.getWizardState(telegramUserId);
    const message = getStepMessage(updatedState.step, updatedState.data);

    // Ensure reply_markup is properly structured
    if (!message.reply_markup || !message.reply_markup.inline_keyboard) {
      // If keyboard is missing, create a minimal one
      const { Markup } = require('telegraf');
      message.reply_markup = Markup.inlineKeyboard([
        [Markup.button.callback('❌ Batal', 'wizard_cancel')],
      ]);
    }

    return message;
  } catch (error) {
    logger.error('Error going back to step', error, { telegramUserId, targetStep });
    throw error;
  }
}

/**
 * Get confirmation summary
 * @param {number} telegramUserId Telegram user ID
 * @returns {Promise<Object>} Confirmation message
 */
async function getConfirmationSummary(telegramUserId) {
  try {
    const state = await wizardManager.getWizardState(telegramUserId);
    if (!state) {
      throw new Error('Wizard session not found');
    }

    return getStepMessage('confirm', state.data);
  } catch (error) {
    logger.error('Error getting confirmation summary', error, { telegramUserId });
    throw error;
  }
}

module.exports = {
  startWizardFlow,
  processStepInput,
  skipStep,
  goBackToStep,
  getConfirmationSummary,
  getStepMessage,
};
