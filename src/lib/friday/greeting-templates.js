/**
 * FRIDAY greeting templates for time-based personalized greetings
 *
 * Task: T020
 * Requirements: FR-001, FR-002
 * Feature: 002-friday-enhancement
 */

const greetingTemplates = {
  morning: {
    greeting: 'Selamat pagi!',
    message:
      'Saya FRIDAY, asisten AI Anda. Siap membantu Anda menemukan akun premium terbaik untuk kebutuhan Anda. Apa yang bisa saya bantu hari ini?',
  },
  afternoon: {
    greeting: 'Selamat siang!',
    message:
      'Saya FRIDAY, asisten AI Anda. Siap membantu Anda menemukan akun premium terbaik untuk kebutuhan Anda. Apa yang bisa saya bantu hari ini?',
  },
  evening: {
    greeting: 'Selamat malam!',
    message:
      'Saya FRIDAY, asisten AI Anda. Siap membantu Anda menemukan akun premium terbaik untuk kebutuhan Anda. Apa yang bisa saya bantu hari ini?',
  },
  night: {
    greeting: 'Selamat malam!',
    message:
      'Saya FRIDAY, asisten AI Anda. Siap membantu Anda menemukan akun premium terbaik untuk kebutuhan Anda. Apa yang bisa saya bantu hari ini?',
  },
};

/**
 * Get greeting template for time of day
 * @param {string} timeOfDay - One of: 'morning', 'afternoon', 'evening', 'night'
 * @returns {Object} Greeting template with greeting and message
 */
function getGreetingTemplate(timeOfDay) {
  if (!timeOfDay || !greetingTemplates[timeOfDay]) {
    // Default to afternoon if invalid
    return greetingTemplates.afternoon;
  }
  return greetingTemplates[timeOfDay];
}

/**
 * Get all greeting templates
 * @returns {Object} All greeting templates
 */
function getAllTemplates() {
  return greetingTemplates;
}

module.exports = {
  getGreetingTemplate,
  getAllTemplates,
  greetingTemplates,
};
