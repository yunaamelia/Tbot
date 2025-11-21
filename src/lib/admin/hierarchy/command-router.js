/**
 * Command Router - Routes hierarchical commands to registered handlers
 *
 * Task: T066, T069, T070
 * Requirements: FR-050, FR-051
 * Feature: 002-friday-enhancement
 */

const commandRegistry = require('./command-registry');
const commandHelp = require('./command-help');
const accessControl = require('../../security/access-control');
const { UnauthorizedError } = require('../../shared/errors');
const logger = require('../../shared/logger').child('command-router');

/**
 * Route a hierarchical command to the appropriate handler
 * @param {string} path Command path (e.g., 'admin product add')
 * @param {number} telegramUserId Telegram user ID for permission checking
 * @param {string} args Command arguments (optional)
 * @returns {Promise<CommandResult>} Routing result
 */
async function routeCommand(path, telegramUserId, args = '') {
  try {
    // Normalize path
    const normalizedPath = commandRegistry.normalizePath(path);

    // Check if it's root admin command (show menu)
    if (normalizedPath === 'admin' || normalizedPath === '') {
      return {
        success: true,
        handler: async () => {
          const help = await commandHelp.getHelp('admin', telegramUserId);
          return {
            text: commandHelp.formatHelpMessage(help),
            parse_mode: 'Markdown',
          };
        },
      };
    }

    // Try to find exact command
    let command = commandRegistry.getCommand(normalizedPath);

    // If not found, try fuzzy matching
    if (!command) {
      const matches = commandRegistry.findMatchingCommands(normalizedPath);
      if (matches.length === 1) {
        // Single match - use it
        command = commandRegistry.getCommand(matches[0]);
      } else if (matches.length > 1) {
        // Multiple matches - return suggestions
        return {
          success: false,
          error: 'Perintah tidak jelas. Beberapa kemungkinan ditemukan:',
          suggestions: matches.slice(0, 5),
        };
      }
    }

    // If still not found, provide suggestions
    if (!command) {
      const suggestions = await commandHelp.getSuggestions(normalizedPath, telegramUserId);
      return {
        success: false,
        error: 'Perintah tidak ditemukan.',
        suggestions: suggestions.length > 0 ? suggestions.slice(0, 5) : [],
      };
    }

    // Check permissions (T069)
    if (command.options.permissions && command.options.permissions.length > 0) {
      try {
        // Check if user has at least one of the required permissions
        let hasPermission = false;
        for (const permission of command.options.permissions) {
          try {
            await accessControl.requirePermission(telegramUserId, permission);
            hasPermission = true;
            break;
          } catch (error) {
            // Continue checking other permissions
            if (error.name === 'UnauthorizedError') {
              continue;
            }
            throw error;
          }
        }

        if (!hasPermission) {
          return {
            success: false,
            error: 'Akses ditolak. Anda tidak memiliki izin untuk menjalankan perintah ini.',
          };
        }
      } catch (error) {
        if (error.name === 'UnauthorizedError') {
          return {
            success: false,
            error: error.message || 'Akses ditolak.',
          };
        }
        throw error;
      }
    }

    // Return handler
    return {
      success: true,
      handler: async (userId, commandArgs) => {
        try {
          // Double-check permissions before execution
          if (command.options.permissions && command.options.permissions.length > 0) {
            let hasPermission = false;
            for (const permission of command.options.permissions) {
              try {
                await accessControl.requirePermission(userId, permission);
                hasPermission = true;
                break;
              } catch (error) {
                // Continue
              }
            }
            if (!hasPermission) {
              throw new UnauthorizedError('Akses ditolak.');
            }
          }

          // Execute handler
          const result = await command.handler(userId, commandArgs || args);
          logger.info('Command executed', { path: normalizedPath, userId });
          return result;
        } catch (error) {
          logger.error('Error executing command', error, { path: normalizedPath, userId });
          throw error;
        }
      },
    };
  } catch (error) {
    logger.error('Error routing command', error, { path, telegramUserId });
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: error.message || 'Akses ditolak.',
      };
    }

    // For other errors, provide suggestions (T070)
    const suggestions = await commandHelp.getSuggestions(path, telegramUserId);
    return {
      success: false,
      error: error.message || 'Terjadi kesalahan saat merutekan perintah.',
      suggestions: suggestions.slice(0, 5),
    };
  }
}

/**
 * Get help information for commands (delegates to commandHelp)
 * @param {string} path Command path (optional)
 * @param {number} telegramUserId Telegram user ID (optional)
 * @returns {Promise<HelpInfo>} Help information
 */
async function getHelp(path = 'admin', telegramUserId) {
  return commandHelp.getHelp(path, telegramUserId);
}

/**
 * Get suggestions for partial/invalid path (delegates to commandHelp)
 * @param {string} path Partial command path
 * @param {number} telegramUserId Telegram user ID (optional)
 * @returns {Promise<Array<string>>} Array of suggested paths
 */
async function getSuggestions(path, telegramUserId) {
  return commandHelp.getSuggestions(path, telegramUserId);
}

module.exports = {
  routeCommand,
  getHelp,
  getSuggestions,
};
