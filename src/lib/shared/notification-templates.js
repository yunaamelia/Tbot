/**
 * Notification templates for order status updates
 * All templates in Indonesian language with rich media support
 *
 * Task: T082
 * Requirement: FR-009, FR-010, FR-011, FR-045
 */

// Notification templates - all messages in Indonesian (FR-045)

class NotificationTemplates {
  /**
   * Payment received notification (T084, T088)
   * @param {Object} order Order data
   * @returns {Object} Notification message with rich media and progress indicator
   */
  paymentReceived(order) {
    const text =
      `✅ *Pembayaran Diterima*\n\n` +
      `Pesanan #${order.id}\n` +
      `Status: *Pembayaran Diterima - Sedang Diproses*\n\n` +
      `🔄 *Progress:* ████░░░░░░ 40%\n\n` +
      `Pembayaran Anda telah diverifikasi dan pesanan sedang diproses. ` +
      `Kami akan mengirimkan akun premium Anda segera.\n\n` +
      `📦 *Detail Pesanan:*\n` +
      `• Produk: ${order.productName || 'N/A'}\n` +
      `• Jumlah: ${order.quantity}\n` +
      `• Total: Rp ${order.total_amount.toLocaleString('id-ID')}`;

    return {
      text,
      parse_mode: 'Markdown',
      media_type: 'text',
      progress_indicator: '🔄',
    };
  }

  /**
   * Order processing notification (T085, T088)
   * @param {Object} order Order data
   * @returns {Object} Notification message with progress indicator
   */
  orderProcessing(order) {
    const text =
      `⚙️ *Mempersiapkan Akun Anda*\n\n` +
      `Pesanan #${order.id}\n` +
      `Status: *Sedang Diproses*\n\n` +
      `🔄 *Progress:* ████████░░ 80%\n\n` +
      `Tim kami sedang mempersiapkan akun premium Anda. ` +
      `Proses ini biasanya memakan waktu beberapa menit.\n\n` +
      `Kami akan mengirimkan akun Anda segera setelah siap.`;

    return {
      text,
      parse_mode: 'Markdown',
      media_type: 'text',
      progress_indicator: '⚙️',
    };
  }

  /**
   * Account delivered notification (T086, T088)
   * @param {Object} order Order data
   * @param {string} encryptedCredentials Encrypted credentials (will be decrypted for display)
   * @returns {Object} Notification message with secure delivery and progress indicator
   */
  accountDelivered(order, encryptedCredentials) {
    const text =
      `🎉 *Akun Premium Anda Telah Dikirim!*\n\n` +
      `Pesanan #${order.id}\n` +
      `Status: *Akun Dikirim*\n\n` +
      `✅ *Progress:* ██████████ 100%\n\n` +
      `Akun premium Anda telah siap dan dikirim melalui pesan terpisah. ` +
      `Silakan cek pesan berikutnya untuk detail akun Anda.\n\n` +
      `⚠️ *Penting:* Simpan informasi akun Anda dengan aman.`;

    return {
      text,
      parse_mode: 'Markdown',
      media_type: 'text',
      progress_indicator: '✅',
      credentials: encryptedCredentials, // Will be sent in separate secure message
    };
  }

  /**
   * Order completed notification (T087)
   * @param {Object} order Order data
   * @returns {Object} Notification message with completion confirmation
   */
  orderCompleted(order) {
    const text =
      `✨ *Pesanan Selesai*\n\n` +
      `Pesanan #${order.id} telah selesai!\n\n` +
      `Terima kasih telah berbelanja di toko kami. ` +
      `Kami harap Anda puas dengan pembelian Anda.\n\n` +
      `Jika ada pertanyaan atau butuh bantuan, silakan hubungi admin.`;

    return {
      text,
      parse_mode: 'Markdown',
      media_type: 'text',
      progress_indicator: '✅',
    };
  }

  /**
   * Payment failed notification (T089)
   * @param {Object} order Order data
   * @param {string} reason Failure reason
   * @returns {Object} Notification message with next steps
   */
  paymentFailed(order, reason) {
    const text =
      `❌ *Verifikasi Pembayaran Gagal*\n\n` +
      `Pesanan #${order.id}\n\n` +
      `Maaf, verifikasi pembayaran Anda gagal.\n\n` +
      `*Alasan:* ${reason || 'Tidak diketahui'}\n\n` +
      `*Langkah Selanjutnya:*\n` +
      `1. Pastikan bukti pembayaran yang Anda kirim jelas dan valid\n` +
      `2. Hubungi admin untuk bantuan lebih lanjut\n` +
      `3. Atau coba lagi dengan metode pembayaran lain\n\n` +
      `Jika Anda sudah melakukan pembayaran, silakan hubungi admin dengan menyertakan bukti pembayaran.`;

    return {
      text,
      parse_mode: 'Markdown',
      media_type: 'text',
      progress_indicator: '❌',
    };
  }

  /**
   * Payment timeout notification (T089)
   * @param {Object} order Order data
   * @returns {Object} Notification message
   */
  paymentTimeout(order) {
    const text =
      `⏰ *Pembayaran Timeout*\n\n` +
      `Pesanan #${order.id}\n\n` +
      `Verifikasi pembayaran Anda memakan waktu terlalu lama.\n\n` +
      `*Langkah Selanjutnya:*\n` +
      `1. Jika Anda sudah melakukan pembayaran, silakan hubungi admin\n` +
      `2. Atau coba lagi dengan metode pembayaran lain\n\n` +
      `Kami akan membantu menyelesaikan masalah pembayaran Anda.`;

    return {
      text,
      parse_mode: 'Markdown',
      media_type: 'text',
      progress_indicator: '⏰',
    };
  }
}

module.exports = new NotificationTemplates();
