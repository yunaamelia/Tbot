/**
 * Command Help System - Provides help information and suggestions for commands
 *
 * Task: T065
 * Requirements: FR-050, FR-051
 * Feature: 002-friday-enhancement
 */

const commandRegistry = require('./command-registry');
const accessControl = require('../../security/access-control');
const logger = require('../../shared/logger').child('command-help');

/**
 * Get help information for commands at specified path level
 * @param {string} path Command path (default: root 'admin')
 * @param {number} telegramUserId Telegram user ID for permission filtering
 * @returns {Promise<HelpInfo>} Help information
 */
async function getHelp(path = 'admin', telegramUserId) {
  try {
    const normalizedPath = commandRegistry.normalizePath(path);
    const help = {
      path: normalizedPath,
      description: '',
      commands: [],
    };

    // Check if path has direct command
    const directCommand = commandRegistry.getCommand(normalizedPath);
    if (directCommand && directCommand.options.description) {
      help.description = directCommand.options.description;
    }

    // Get commands at this path level
    const commands = commandRegistry.getCommandsByPath(normalizedPath);
    const childPaths = commandRegistry.getChildPaths(normalizedPath);

    // Filter by permissions if user ID provided
    for (const cmd of commands) {
      if (cmd.options.permissions && cmd.options.permissions.length > 0) {
        if (telegramUserId) {
          // Check if user has required permissions
          let hasPermission = false;
          try {
            for (const permission of cmd.options.permissions) {
              try {
                await accessControl.requirePermission(telegramUserId, permission);
                hasPermission = true;
                break; // User has at least one required permission
              } catch (error) {
                // Continue checking other permissions
              }
            }
          } catch (error) {
            // User doesn't have permissions, skip this command
            continue;
          }
          if (!hasPermission) {
            continue;
          }
        }
      }

      help.commands.push({
        path: cmd.path,
        description: cmd.options.description || '',
        usage: cmd.options.usage || '',
      });
    }

    // Add child paths as groups (if they have commands)
    for (const childPath of childPaths) {
      const fullChildPath = normalizedPath ? `${normalizedPath}.${childPath}` : childPath;
      if (commandRegistry.hasCommands(fullChildPath)) {
        // Check if user has access to any commands in this group
        if (telegramUserId) {
          const childCommands = commandRegistry.getCommandsByPath(fullChildPath);
          let hasAccess = false;
          for (const childCmd of childCommands) {
            if (!childCmd.options.permissions || childCmd.options.permissions.length === 0) {
              hasAccess = true;
              break;
            }
            for (const permission of childCmd.options.permissions) {
              try {
                await accessControl.requirePermission(telegramUserId, permission);
                hasAccess = true;
                break;
              } catch (error) {
                // Continue
              }
            }
            if (hasAccess) break;
          }
          if (!hasAccess) {
            continue;
          }
        }

        help.commands.push({
          path: fullChildPath,
          description: `Commands under ${childPath}`,
          usage: '',
        });
      }
    }

    logger.debug('Help retrieved', { path: normalizedPath, commandCount: help.commands.length });

    return help;
  } catch (error) {
    logger.error('Error getting help', error, { path });
    throw error;
  }
}

/**
 * Get command suggestions for partial/invalid path
 * @param {string} path Partial command path
 * @param {number} telegramUserId Telegram user ID for permission filtering
 * @returns {Promise<Array<string>>} Array of suggested command paths
 */
async function getSuggestions(path, telegramUserId) {
  try {
    const normalizedPath = commandRegistry.normalizePath(path);
    const suggestions = commandRegistry.findMatchingCommands(normalizedPath);

    // Filter by permissions if user ID provided
    if (telegramUserId && suggestions.length > 0) {
      const filtered = [];
      for (const cmdPath of suggestions) {
        const cmd = commandRegistry.getCommand(cmdPath);
        if (cmd) {
          if (!cmd.options.permissions || cmd.options.permissions.length === 0) {
            filtered.push(cmdPath);
            continue;
          }
          // Check if user has required permissions
          let hasPermission = false;
          for (const permission of cmd.options.permissions) {
            try {
              await accessControl.requirePermission(telegramUserId, permission);
              hasPermission = true;
              break;
            } catch (error) {
              // Continue
            }
          }
          if (hasPermission) {
            filtered.push(cmdPath);
          }
        }
      }
      return filtered.slice(0, 10); // Limit to 10 suggestions
    }

    return suggestions.slice(0, 10);
  } catch (error) {
    logger.error('Error getting suggestions', error, { path });
    return [];
  }
}

/**
 * Format help information as Telegram message
 * @param {HelpInfo} help Help information
 * @returns {string} Formatted help message
 */
function formatHelpMessage(help) {
  let message = `📋 *Help: ${help.path || 'admin'}*\n\n`;

  if (help.description) {
    message += `${help.description}\n\n`;
  }

  if (help.commands.length === 0) {
    message += 'Tidak ada perintah tersedia di level ini.\n';
    return message;
  }

  message += '*Perintah yang tersedia:*\n\n';

  for (const cmd of help.commands) {
    const displayPath = cmd.path.replace(/\./g, ' ');
    message += `• *${displayPath}*`;
    if (cmd.description) {
      message += `\n  ${cmd.description}`;
    }
    if (cmd.usage) {
      message += `\n  \`${cmd.usage}\``;
    }
    message += '\n\n';
  }

  return message;
}

/**
 * Create inline keyboard for admin commands
 * @param {string} path Command path (default: root 'admin')
 * @param {number} telegramUserId Telegram user ID for permission filtering
 * @returns {Promise<Object>} Inline keyboard markup
 */
async function createAdminKeyboard(path = 'admin', telegramUserId) {
  try {
    const { Markup } = require('telegraf');
    const buttonStateManager = require('../../ui/button-state-manager');
    const { isStoreOpen } = require('../../shared/store-config');

    // Get all commands from registry (without permission filtering for keyboard display)
    // Permission will be checked when command is executed
    const normalizedPath = commandRegistry.normalizePath(path);
    const keyboardRows = [];

    // Get all registered commands
    const allCommands = commandRegistry.getAllCommands();
    const commandsAtPath =
      normalizedPath === 'admin'
        ? allCommands
        : allCommands.filter((cmd) => cmd.path.startsWith(normalizedPath + '.'));

    // Get store status for dynamic button states
    let storeStatus = null;
    try {
      storeStatus = await isStoreOpen();
    } catch (error) {
      logger.debug('Could not get store status', { error: error.message });
    }

    // Group commands by category
    const categories = {};
    const categoryButtons = [];
    const categorySet = new Set();

    for (const cmd of commandsAtPath) {
      const pathParts = cmd.path.split('.');
      const hasUsage = cmd.options.usage && cmd.options.usage.length > 0; // Executable command

      if (hasUsage && pathParts.length >= 3) {
        // Direct executable command (e.g., admin.product.add)
        const category = pathParts[1]; // 'product', 'stock', 'store'
        const commandName = pathParts[pathParts.length - 1]; // 'add', 'update', 'open'

        if (!categories[category]) {
          categories[category] = [];
        }

        // Format button text with emoji and dynamic states
        let buttonText = commandName.charAt(0).toUpperCase() + commandName.slice(1);
        const emojiMap = {
          add: '➕',
          tambah: '➕',
          update: '🔄',
          open: '✅',
          buka: '✅',
          close: '❌',
          tutup: '❌',
          delete: '🗑️',
          hapus: '🗑️',
        };

        const descLower = (cmd.options.description || '').toLowerCase();
        for (const [key, emoji] of Object.entries(emojiMap)) {
          if (descLower.includes(key) || commandName.toLowerCase() === key) {
            buttonText = `${emoji} ${buttonText}`;
            break;
          }
        }

        // Dynamic state indicators for store commands
        const callbackData = `admin_cmd_${cmd.path.replace(/\./g, '_')}`;
        if (category === 'store') {
          if (commandName === 'open' && storeStatus === true) {
            buttonText = `🔒 ${buttonText}`; // Store already open
          } else if (commandName === 'close' && storeStatus === false) {
            buttonText = `🔓 ${buttonText}`; // Store already closed
          }
        }

        // Check if button is currently processing
        const isProcessing = await buttonStateManager.isButtonProcessing(
          callbackData,
          telegramUserId
        );
        if (isProcessing) {
          // Remove emoji prefix if exists (use string methods instead of regex to avoid ESLint error)
          let cleanText = buttonText;
          if (
            cleanText.startsWith('✅') ||
            cleanText.startsWith('❌') ||
            cleanText.startsWith('🔒') ||
            cleanText.startsWith('🔓')
          ) {
            cleanText = cleanText.substring(2).trim();
          }
          buttonText = `⏳ ${cleanText}`;
        }

        categories[category].push({
          text: buttonText,
          callback_data: callbackData,
          description: cmd.options.description,
          usage: cmd.options.usage,
          isProcessing,
        });

        // Track category
        if (!categorySet.has(category)) {
          categorySet.add(category);
          const categoryEmoji = {
            product: '📦',
            stock: '📊',
            store: '🏪',
            order: '📋',
            user: '👤',
            payment: '💳',
          };

          let categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
          if (categoryEmoji[category]) {
            categoryLabel = `${categoryEmoji[category]} ${categoryLabel}`;
          }

          // Add store status indicator to store category
          if (category === 'store' && storeStatus !== null) {
            const statusEmoji = storeStatus ? '🟢' : '🔴';
            categoryLabel = `${statusEmoji} ${categoryLabel}`;
          }

          categoryButtons.push({
            text: categoryLabel,
            callback_data: `admin_menu_${category}`,
          });
        }
      }
    }

    // Build keyboard: Show direct commands first (grouped by category)
    const commandRows = [];
    for (const commands of Object.values(categories)) {
      if (commands.length > 0) {
        // Group commands in rows of 2-3 for better responsiveness
        let currentRow = [];
        commands.forEach((cmd, index) => {
          // Disable button if processing
          if (cmd.isProcessing) {
            // Note: Telegram doesn't support disabled buttons in callback queries
            // We'll handle this by showing loading indicator in text
            currentRow.push(Markup.button.callback(cmd.text, cmd.callback_data));
          } else {
            currentRow.push(Markup.button.callback(cmd.text, cmd.callback_data));
          }

          if (currentRow.length >= 3 || index === commands.length - 1) {
            commandRows.push(currentRow);
            currentRow = [];
          }
        });
      }
    }

    // Add category navigation buttons if there are categories
    if (categoryButtons.length > 0 && path === 'admin') {
      // Add category buttons in responsive layout (2-3 per row)
      const categoryRow = [];
      categoryButtons.forEach((btn, index) => {
        categoryRow.push(Markup.button.callback(btn.text, btn.callback_data));
        if (categoryRow.length >= 3 || index === categoryButtons.length - 1) {
          keyboardRows.push(categoryRow);
          categoryRow.length = 0; // Clear array
        }
      });

      // Add separator row with store status if applicable
      if (storeStatus !== null && categories.store && categories.store.length > 0) {
        const statusText = storeStatus ? '🟢 Toko Terbuka' : '🔴 Toko Tertutup';
        keyboardRows.push([Markup.button.callback(statusText, 'admin_status_store')]);
      }

      // Add command rows
      if (commandRows.length > 0) {
        keyboardRows.push(...commandRows);
      }
    } else {
      // Just show commands
      keyboardRows.push(...commandRows);
    }

    // Add navigation/action buttons at bottom with refresh
    const actionRow = [];
    if (path !== 'admin') {
      actionRow.push(Markup.button.callback('◀️ Kembali', 'admin_menu_back'));
    }
    actionRow.push(
      Markup.button.callback('🔄 Refresh', `admin_refresh_${path === 'admin' ? 'main' : path}`)
    );
    actionRow.push(Markup.button.callback('📋 Bantuan', 'admin_help'));

    const navRow = [];
    navRow.push(Markup.button.callback('🏠 Beranda', 'nav_home'));

    if (actionRow.length > 0) {
      keyboardRows.push(actionRow);
    }
    if (navRow.length > 0) {
      keyboardRows.push(navRow);
    }

    return Markup.inlineKeyboard(keyboardRows);
  } catch (error) {
    logger.error('Error creating admin keyboard', error, { path, telegramUserId });
    // Return minimal keyboard on error
    const { Markup } = require('telegraf');
    return Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Refresh', 'admin_refresh_main')],
      [Markup.button.callback('📋 Help', 'admin_help')],
      [Markup.button.callback('🏠 Home', 'nav_home')],
    ]);
  }
}

module.exports = {
  getHelp,
  getSuggestions,
  formatHelpMessage,
  createAdminKeyboard,
};
