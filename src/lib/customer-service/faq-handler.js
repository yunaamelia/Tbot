/**
 * FAQ handler for common questions in Indonesian
 * Provides FAQ system for customer service (FR-014)
 *
 * Task: T139
 * Requirement: FR-014
 */

class FAQHandler {
  constructor() {
    // Common FAQ questions and answers in Indonesian
    this.faqs = [
      {
        id: 'payment',
        question: 'Bagaimana cara melakukan pembayaran?',
        answer:
          'Anda dapat melakukan pembayaran menggunakan dua metode:\n\n' +
          '1. *QRIS* - Pembayaran otomatis dengan scan QR code\n' +
          '2. *Transfer Bank Manual* - Transfer ke rekening yang tertera dan upload bukti transfer\n\n' +
          'Setelah pembayaran diverifikasi, akun premium Anda akan dikirim melalui pesan Telegram.',
      },
      {
        id: 'delivery',
        question: 'Berapa lama waktu pengiriman akun?',
        answer:
          'Akun premium akan dikirim dalam waktu maksimal 24 jam setelah pembayaran diverifikasi. ' +
          'Anda akan menerima notifikasi real-time melalui Telegram saat akun siap dikirim.',
      },
      {
        id: 'credentials',
        question: 'Bagaimana cara menggunakan akun yang saya beli?',
        answer:
          'Setelah pembayaran diverifikasi, Anda akan menerima kredensial akun (username dan password) ' +
          'melalui pesan Telegram yang terenkripsi. Ikuti instruksi yang diberikan untuk mengaktifkan akun.',
      },
      {
        id: 'refund',
        question: 'Apakah bisa refund jika akun tidak berfungsi?',
        answer:
          'Jika akun yang Anda terima tidak berfungsi, silakan buat tiket support dengan mengirim pesan ' +
          'ke bot atau gunakan perintah /help. Admin akan meninjau kasus Anda dan memberikan solusi yang sesuai.',
      },
      {
        id: 'stock',
        question: 'Kapan produk yang habis akan tersedia lagi?',
        answer:
          'Kami akan mengupdate stok secara berkala. Silakan cek kembali nanti atau hubungi admin untuk ' +
          'informasi lebih lanjut tentang ketersediaan produk.',
      },
      {
        id: 'support',
        question: 'Bagaimana cara menghubungi customer service?',
        answer:
          'Anda dapat menghubungi customer service dengan:\n\n' +
          '1. Menggunakan perintah /help untuk melihat FAQ\n' +
          '2. Mengirim pesan langsung ke bot untuk live chat dengan admin\n' +
          '3. Membuat tiket support jika ada masalah dengan pesanan Anda',
      },
    ];
  }

  /**
   * Get all FAQ items
   * @returns {Array} Array of FAQ objects
   */
  getAllFAQs() {
    return this.faqs;
  }

  /**
   * Get FAQ by ID
   * @param {string} faqId FAQ ID
   * @returns {Object|null} FAQ object or null
   */
  getFAQById(faqId) {
    return this.faqs.find((faq) => faq.id === faqId) || null;
  }

  /**
   * Search FAQs by keyword
   * @param {string} keyword Search keyword
   * @returns {Array} Array of matching FAQ objects
   */
  searchFAQs(keyword) {
    if (!keyword || keyword.trim().length === 0) {
      return this.faqs;
    }

    const lowerKeyword = keyword.toLowerCase();
    return this.faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(lowerKeyword) ||
        faq.answer.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Format FAQ list for display
   * @param {Array} faqs Array of FAQ objects
   * @returns {Object} Formatted message with text and inline keyboard
   */
  formatFAQList(faqs = null) {
    const faqList = faqs || this.faqs;
    let text = '*📋 FAQ - Pertanyaan yang Sering Diajukan*\n\n';

    faqList.forEach((faq, index) => {
      text += `${index + 1}. ${faq.question}\n`;
    });

    text += '\nKlik salah satu pertanyaan untuk melihat jawabannya.';

    // Create inline keyboard with FAQ buttons
    const keyboard = [];
    faqList.forEach((faq) => {
      keyboard.push([
        {
          text: faq.question.substring(0, 50) + (faq.question.length > 50 ? '...' : ''),
          callback_data: `faq_${faq.id}`,
        },
      ]);
    });

    // Add back button
    keyboard.push([{ text: '🔙 Kembali', callback_data: 'faq_back' }]);

    return {
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard,
      },
    };
  }

  /**
   * Format single FAQ answer for display
   * @param {string} faqId FAQ ID
   * @returns {Object|null} Formatted message or null if FAQ not found
   */
  formatFAQAnswer(faqId) {
    const faq = this.getFAQById(faqId);
    if (!faq) {
      return null;
    }

    const text = `*❓ ${faq.question}*\n\n${faq.answer}\n\n_Untuk pertanyaan lain, gunakan /help_`;

    return {
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Kembali ke FAQ', callback_data: 'faq_list' }],
          [{ text: '💬 Chat dengan Admin', callback_data: 'chat_start' }],
        ],
      },
    };
  }

  /**
   * Handle FAQ callback query
   * @param {string} callbackData Callback data (e.g., 'faq_payment', 'faq_list')
   * @returns {Object|null} Formatted message or null
   */
  handleCallback(callbackData) {
    if (callbackData === 'faq_list') {
      return this.formatFAQList();
    }

    if (callbackData.startsWith('faq_')) {
      const faqId = callbackData.replace('faq_', '');
      return this.formatFAQAnswer(faqId);
    }

    return null;
  }
}

module.exports = new FAQHandler();
