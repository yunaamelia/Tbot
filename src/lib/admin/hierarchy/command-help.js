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

module.exports = {
  getHelp,
  getSuggestions,
  formatHelpMessage,
};
