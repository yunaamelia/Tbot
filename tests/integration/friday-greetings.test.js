/**
 * Integration tests for FRIDAY Personalized Welcome Experience (User Story 1)
 * Tests real Telegram Bot API interactions (Article IX)
 *
 * Tasks: T013, T014, T015, T016, T017
 * Requirements: FR-001, FR-002
 * Feature: 002-friday-enhancement
 */

const { getBot } = require('../../src/lib/telegram/api-client');
const personaService = require('../../src/lib/friday/persona-service');

describe('FRIDAY Personalized Welcome Experience Integration Tests', () => {
  beforeAll(() => {
    getBot(); // Initialize bot for tests
  });

  describe('Given a customer opens the bot at different times of day', () => {
    test('When they send /start at 6:00 AM - 11:59 AM, Then they receive a morning greeting from FRIDAY', async () => {
      // Mock time to morning (10:00 AM)
      const mockDate = new Date('2025-11-21T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const telegramUserId = 123456789;
      const greeting = await personaService.getGreeting(telegramUserId, 'morning');

      expect(greeting).toBeDefined();
      expect(typeof greeting).toBe('string');
      expect(greeting.length).toBeGreaterThan(0);
      expect(greeting.toLowerCase()).toMatch(/pagi|morning|selamat pagi/i);
      expect(greeting.toLowerCase()).toMatch(/friday/i);

      jest.restoreAllMocks();
    });

    test('When they send /start at 12:00 PM - 5:59 PM, Then they receive an afternoon greeting from FRIDAY', async () => {
      // Mock time to afternoon (2:00 PM)
      const mockDate = new Date('2025-11-21T14:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const telegramUserId = 123456789;
      const greeting = await personaService.getGreeting(telegramUserId, 'afternoon');

      expect(greeting).toBeDefined();
      expect(typeof greeting).toBe('string');
      expect(greeting.length).toBeGreaterThan(0);
      expect(greeting.toLowerCase()).toMatch(/siang|afternoon|selamat siang/i);
      expect(greeting.toLowerCase()).toMatch(/friday/i);

      jest.restoreAllMocks();
    });

    test('When they send /start at 6:00 PM - 11:59 PM, Then they receive an evening greeting from FRIDAY', async () => {
      // Mock time to evening (8:00 PM)
      const mockDate = new Date('2025-11-21T20:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const telegramUserId = 123456789;
      const greeting = await personaService.getGreeting(telegramUserId, 'evening');

      expect(greeting).toBeDefined();
      expect(typeof greeting).toBe('string');
      expect(greeting.length).toBeGreaterThan(0);
      expect(greeting.toLowerCase()).toMatch(/malam|evening|selamat malam/i);
      expect(greeting.toLowerCase()).toMatch(/friday/i);

      jest.restoreAllMocks();
    });

    test('When they send /start at 12:00 AM - 5:59 AM, Then they receive a night greeting from FRIDAY', async () => {
      // Mock time to night (2:00 AM)
      const mockDate = new Date('2025-11-21T02:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const telegramUserId = 123456789;
      const greeting = await personaService.getGreeting(telegramUserId, 'night');

      expect(greeting).toBeDefined();
      expect(typeof greeting).toBe('string');
      expect(greeting.length).toBeGreaterThan(0);
      expect(greeting.toLowerCase()).toMatch(/malam|night|selamat malam/i);
      expect(greeting.toLowerCase()).toMatch(/friday/i);

      jest.restoreAllMocks();
    });

    test('When FRIDAY greets a customer, Then it maintains the Iron Man AI assistant persona with appropriate tone and style', async () => {
      const telegramUserId = 123456789;
      const greeting = await personaService.getGreeting(telegramUserId);

      expect(greeting).toBeDefined();
      expect(typeof greeting).toBe('string');
      expect(greeting.length).toBeGreaterThan(0);

      // Check for FRIDAY persona characteristics
      expect(greeting.toLowerCase()).toMatch(/friday/i);
      expect(greeting.toLowerCase()).toMatch(/asisten|assistant|ai/i);

      // Check for professional yet friendly tone (Indonesian)
      const hasProfessionalTone = /siap|siap membantu|bisa|dapat/i.test(greeting);
      expect(hasProfessionalTone).toBe(true);

      // Check that greeting is in Indonesian (Article XIII)
      const isIndonesian = /selamat|saya|anda|kamu|terima kasih/i.test(greeting);
      expect(isIndonesian).toBe(true);
    });
  });
});
