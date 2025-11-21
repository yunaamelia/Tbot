/**
 * Unit tests for FRIDAY Persona Service
 *
 * Tasks: T018, T019
 * Requirements: FR-001, FR-002
 * Feature: 002-friday-enhancement
 */

const personaService = require('../../../src/lib/friday/persona-service');

describe('FRIDAY Persona Service', () => {
  describe('getTimeOfDay()', () => {
    it('should return "morning" for 6:00 AM - 11:59 AM', () => {
      const testCases = [
        { hour: 6, expected: 'morning' },
        { hour: 9, expected: 'morning' },
        { hour: 11, expected: 'morning' },
      ];

      testCases.forEach(({ hour, expected }) => {
        const mockDate = new Date(`2025-11-21T${hour.toString().padStart(2, '0')}:00:00Z`);
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

        const timeOfDay = personaService.getTimeOfDay();
        expect(timeOfDay).toBe(expected);

        jest.restoreAllMocks();
      });
    });

    it('should return "afternoon" for 12:00 PM - 5:59 PM', () => {
      const testCases = [
        { hour: 12, expected: 'afternoon' },
        { hour: 15, expected: 'afternoon' },
        { hour: 17, expected: 'afternoon' },
      ];

      testCases.forEach(({ hour, expected }) => {
        const mockDate = new Date(`2025-11-21T${hour.toString().padStart(2, '0')}:00:00Z`);
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

        const timeOfDay = personaService.getTimeOfDay();
        expect(timeOfDay).toBe(expected);

        jest.restoreAllMocks();
      });
    });

    it('should return "evening" for 6:00 PM - 11:59 PM', () => {
      const testCases = [
        { hour: 18, expected: 'evening' },
        { hour: 20, expected: 'evening' },
        { hour: 23, expected: 'evening' },
      ];

      testCases.forEach(({ hour, expected }) => {
        const mockDate = new Date(`2025-11-21T${hour.toString().padStart(2, '0')}:00:00Z`);
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

        const timeOfDay = personaService.getTimeOfDay();
        expect(timeOfDay).toBe(expected);

        jest.restoreAllMocks();
      });
    });

    it('should return "night" for 0:00 AM - 5:59 AM', () => {
      const testCases = [
        { hour: 0, expected: 'night' },
        { hour: 2, expected: 'night' },
        { hour: 5, expected: 'night' },
      ];

      testCases.forEach(({ hour, expected }) => {
        const mockDate = new Date(`2025-11-21T${hour.toString().padStart(2, '0')}:00:00Z`);
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

        const timeOfDay = personaService.getTimeOfDay();
        expect(timeOfDay).toBe(expected);

        jest.restoreAllMocks();
      });
    });
  });

  describe('greeting template selection', () => {
    it('should select morning template for morning time', async () => {
      const mockDate = new Date('2025-11-21T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const greeting = await personaService.getGreeting(123456789, 'morning');
      expect(greeting).toBeDefined();
      expect(typeof greeting).toBe('string');
      expect(greeting.toLowerCase()).toMatch(/pagi|morning|selamat pagi/i);

      jest.restoreAllMocks();
    });

    it('should select afternoon template for afternoon time', async () => {
      const mockDate = new Date('2025-11-21T14:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const greeting = await personaService.getGreeting(123456789, 'afternoon');
      expect(greeting).toBeDefined();
      expect(typeof greeting).toBe('string');
      expect(greeting.toLowerCase()).toMatch(/siang|afternoon|selamat siang/i);

      jest.restoreAllMocks();
    });

    it('should select evening template for evening time', async () => {
      const mockDate = new Date('2025-11-21T20:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const greeting = await personaService.getGreeting(123456789, 'evening');
      expect(greeting).toBeDefined();
      expect(typeof greeting).toBe('string');
      expect(greeting.toLowerCase()).toMatch(/malam|evening|selamat malam/i);

      jest.restoreAllMocks();
    });

    it('should select night template for night time', async () => {
      const mockDate = new Date('2025-11-21T02:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const greeting = await personaService.getGreeting(123456789, 'night');
      expect(greeting).toBeDefined();
      expect(typeof greeting).toBe('string');
      expect(greeting.toLowerCase()).toMatch(/malam|night|selamat malam/i);

      jest.restoreAllMocks();
    });

    it('should use current time when timeOfDay is not provided', async () => {
      const mockDate = new Date('2025-11-21T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const greeting = await personaService.getGreeting(123456789);
      expect(greeting).toBeDefined();
      expect(typeof greeting).toBe('string');

      jest.restoreAllMocks();
    });
  });
});
