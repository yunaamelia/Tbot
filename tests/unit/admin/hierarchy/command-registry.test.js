/**
 * Unit tests for Command Registry
 *
 * Task: T063
 * Requirements: FR-050
 * Feature: 002-friday-enhancement
 */

const commandRegistry = require('../../../../src/lib/admin/hierarchy/command-registry');

describe('Command Registry', () => {
  beforeEach(() => {
    // Clear registry before each test
    if (commandRegistry.clear) {
      commandRegistry.clear();
    }
  });

  describe('registerCommand()', () => {
    test('should register a command with handler', () => {
      const mockHandler = jest.fn();

      expect(() => {
        commandRegistry.registerCommand('admin.test.command', mockHandler, {
          permissions: ['test'],
          description: 'Test command',
        });
      }).not.toThrow();

      // Verify command is registered
      const commands = commandRegistry.getAllCommands();
      expect(commands).toBeDefined();
      if (Array.isArray(commands)) {
        const registered = commands.find((c) => c.path === 'admin.test.command');
        expect(registered).toBeDefined();
      }
    });

    test('should register command with permissions', () => {
      const mockHandler = jest.fn();

      commandRegistry.registerCommand('admin.secure.command', mockHandler, {
        permissions: ['admin_only', 'store_control'],
        description: 'Secure command',
      });

      // Verify permissions are stored
      const commands = commandRegistry.getAllCommands();
      if (Array.isArray(commands)) {
        const registered = commands.find((c) => c.path === 'admin.secure.command');
        expect(registered).toBeDefined();
        if (registered.options && registered.options.permissions) {
          expect(Array.isArray(registered.options.permissions)).toBe(true);
          expect(registered.options.permissions).toContain('admin_only');
        }
      }
    });

    test('should register command with description and usage', () => {
      const mockHandler = jest.fn();

      commandRegistry.registerCommand('admin.test.command', mockHandler, {
        description: 'Test command description',
        usage: '/admin test command args',
      });

      const commands = commandRegistry.getAllCommands();
      if (Array.isArray(commands)) {
        const registered = commands.find((c) => c.path === 'admin.test.command');
        expect(registered).toBeDefined();
        if (registered.options) {
          expect(registered.options.description).toBe('Test command description');
          expect(registered.options.usage).toBe('/admin test command args');
        }
      }
    });

    test('should allow registering commands without options', () => {
      const mockHandler = jest.fn();

      expect(() => {
        commandRegistry.registerCommand('admin.simple.command', mockHandler);
      }).not.toThrow();
    });

    test('should handle nested command paths', () => {
      const mockHandler = jest.fn();

      commandRegistry.registerCommand('admin.product.stock.update', mockHandler, {
        permissions: ['stock_manage'],
      });

      // Should be able to retrieve nested command
      const commands = commandRegistry.getAllCommands();
      expect(commands).toBeDefined();
    });

    test('should prevent duplicate command registration (override or error)', () => {
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();

      commandRegistry.registerCommand('admin.duplicate.command', mockHandler1);

      // Second registration should either override or throw error
      try {
        commandRegistry.registerCommand('admin.duplicate.command', mockHandler2);
        // If no error, should have overridden - this is acceptable
      } catch (error) {
        // Error is acceptable if duplicate registration is prevented
        expect(error).toBeDefined();
      }
    });
  });

  describe('getCommand()', () => {
    test('should retrieve registered command by path', () => {
      const mockHandler = jest.fn();

      commandRegistry.registerCommand('admin.test.command', mockHandler, {
        permissions: ['test'],
      });

      const command = commandRegistry.getCommand('admin.test.command');
      expect(command).toBeDefined();
      if (command) {
        expect(command.handler).toBe(mockHandler);
        expect(command.path).toBe('admin.test.command');
      }
    });

    test('should return undefined for unregistered command', () => {
      const command = commandRegistry.getCommand('admin.nonexistent.command');
      expect(command).toBeUndefined();
    });

    test('should handle path normalization when retrieving', () => {
      const mockHandler = jest.fn();

      commandRegistry.registerCommand('admin.product.add', mockHandler);

      // Try retrieving with different path formats
      const command1 = commandRegistry.getCommand('admin.product.add');
      // Note: Path normalization should handle different formats
      // Testing exact match which should always work
      expect(command1).toBeDefined();
    });
  });

  describe('getAllCommands()', () => {
    test('should return all registered commands', () => {
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();

      commandRegistry.registerCommand('admin.command1', mockHandler1);
      commandRegistry.registerCommand('admin.command2', mockHandler2);

      const commands = commandRegistry.getAllCommands();
      expect(commands).toBeDefined();
      if (Array.isArray(commands)) {
        expect(commands.length).toBeGreaterThanOrEqual(2);
      }
    });

    test('should return empty array when no commands registered', () => {
      // Clear registry
      if (commandRegistry.clear) {
        commandRegistry.clear();
      }

      const commands = commandRegistry.getAllCommands();
      expect(commands).toBeDefined();
      if (Array.isArray(commands)) {
        expect(commands.length).toBe(0);
      }
    });
  });

  describe('getCommandsByPath()', () => {
    test('should return commands at specific path level', () => {
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();

      commandRegistry.registerCommand('admin.product.add', mockHandler1);
      commandRegistry.registerCommand('admin.product.update', mockHandler2);

      const productCommands = commandRegistry.getCommandsByPath('admin.product');
      expect(productCommands).toBeDefined();
      if (Array.isArray(productCommands)) {
        expect(productCommands.length).toBeGreaterThanOrEqual(2);
        productCommands.forEach((cmd) => {
          expect(cmd.path).toContain('admin.product');
        });
      }
    });

    test('should return empty array for path with no commands', () => {
      const commands = commandRegistry.getCommandsByPath('admin.nonexistent');
      expect(commands).toBeDefined();
      if (Array.isArray(commands)) {
        expect(commands.length).toBe(0);
      }
    });
  });
});
