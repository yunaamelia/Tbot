/**
 * Command Registry - Registers and manages hierarchical admin commands
 *
 * Task: T064
 * Requirements: FR-050
 * Feature: 002-friday-enhancement
 */

const logger = require('../../shared/logger').child('command-registry');

class CommandRegistry {
  constructor() {
    this.commands = new Map(); // path -> { handler, options }
  }

  /**
   * Register a command in the hierarchy
   * @param {string} path Command path (e.g., 'admin.product.add' or 'admin product add')
   * @param {Function} handler Command handler function (telegramUserId, args?) => Promise<Response>
   * @param {Object} options Command options
   * @param {Array<string>} options.permissions Required permissions
   * @param {string} options.description Command description
   * @param {string} options.usage Usage example
   */
  registerCommand(path, handler, options = {}) {
    try {
      // Normalize path (convert spaces to dots, lowercase)
      const normalizedPath = this.normalizePath(path);

      if (!normalizedPath || normalizedPath.length === 0) {
        throw new Error('Command path cannot be empty');
      }

      if (typeof handler !== 'function') {
        throw new Error('Command handler must be a function');
      }

      // Store command
      this.commands.set(normalizedPath, {
        handler,
        options: {
          permissions: options.permissions || [],
          description: options.description || '',
          usage: options.usage || '',
        },
        path: normalizedPath,
      });

      logger.debug('Command registered', { path: normalizedPath, options });
    } catch (error) {
      logger.error('Error registering command', error, { path });
      throw error;
    }
  }

  /**
   * Get command by path
   * @param {string} path Command path
   * @returns {Object|undefined} Command object or undefined
   */
  getCommand(path) {
    const normalizedPath = this.normalizePath(path);
    return this.commands.get(normalizedPath);
  }

  /**
   * Get all registered commands
   * @returns {Array} Array of command objects
   */
  getAllCommands() {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands at a specific path level
   * @param {string} path Parent path (e.g., 'admin.product')
   * @returns {Array} Array of commands at that path level
   */
  getCommandsByPath(path) {
    const normalizedPath = this.normalizePath(path);
    const commands = [];

    for (const [cmdPath, cmd] of this.commands.entries()) {
      if (cmdPath.startsWith(normalizedPath + '.') || cmdPath === normalizedPath) {
        // Get direct children only (not grandchildren)
        const remaining = cmdPath.substring(normalizedPath.length + 1);
        if (remaining && !remaining.includes('.')) {
          commands.push(cmd);
        } else if (cmdPath === normalizedPath) {
          commands.push(cmd);
        }
      }
    }

    return commands;
  }

  /**
   * Get all child paths at a specific level
   * @param {string} path Parent path
   * @returns {Array<string>} Array of child path segments
   */
  getChildPaths(path) {
    const normalizedPath = this.normalizePath(path);
    const childSet = new Set();

    for (const cmdPath of this.commands.keys()) {
      if (cmdPath.startsWith(normalizedPath + '.')) {
        const remaining = cmdPath.substring(normalizedPath.length + 1);
        if (remaining) {
          const firstSegment = remaining.split('.')[0];
          childSet.add(firstSegment);
        }
      }
    }

    return Array.from(childSet);
  }

  /**
   * Check if path has any registered commands
   * @param {string} path Command path
   * @returns {boolean} True if path has commands
   */
  hasCommands(path) {
    const normalizedPath = this.normalizePath(path);
    // Check if exact path exists or has children
    if (this.commands.has(normalizedPath)) {
      return true;
    }
    // Check if any commands start with this path
    for (const cmdPath of this.commands.keys()) {
      if (cmdPath.startsWith(normalizedPath + '.')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Normalize command path (convert spaces to dots, lowercase, trim)
   * @param {string} path Raw path
   * @returns {string} Normalized path
   */
  normalizePath(path) {
    if (!path || typeof path !== 'string') {
      return '';
    }
    return path
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '.') // Convert spaces to dots
      .replace(/\.+/g, '.') // Collapse multiple dots
      .replace(/^\.|\.$/g, ''); // Remove leading/trailing dots
  }

  /**
   * Clear all registered commands (for testing)
   */
  clear() {
    this.commands.clear();
    logger.debug('Command registry cleared');
  }

  /**
   * Find commands matching partial path (for suggestions)
   * @param {string} partialPath Partial command path
   * @returns {Array<string>} Array of matching command paths
   */
  findMatchingCommands(partialPath) {
    const normalized = this.normalizePath(partialPath);
    const matches = [];

    for (const cmdPath of this.commands.keys()) {
      if (cmdPath.includes(normalized)) {
        matches.push(cmdPath);
      } else {
        // Try fuzzy matching - split and check if all segments are present
        const normalizedParts = normalized.split('.').filter((p) => p.length > 0);
        const cmdParts = cmdPath.split('.');

        if (
          normalizedParts.length > 0 &&
          normalizedParts.every((part) =>
            cmdParts.some((cmdPart) => cmdPart.includes(part) || part.includes(cmdPart))
          )
        ) {
          matches.push(cmdPath);
        }
      }
    }

    return matches;
  }
}

// Export singleton instance
module.exports = new CommandRegistry();
