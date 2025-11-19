/**
 * Indonesian language handler (i18n)
 * All user-facing messages MUST be in Indonesian (Bahasa Indonesia)
 */

const messages = {
  // General messages
  welcome: 'Selamat datang di Toko Akun Premium!',
  error_generic: 'Maaf, terjadi kesalahan. Silakan coba lagi nanti.',
  error_not_found: 'Data tidak ditemukan.',
  error_unauthorized: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',

  // Product messages
  product_not_found: 'Produk tidak ditemukan.',
  product_out_of_stock: 'Maaf, produk ini sudah habis. Silakan pilih produk lain.',
  product_list_empty: 'Tidak ada produk yang tersedia saat ini.',

  // Order messages
  order_created: 'Pesanan Anda telah dibuat dengan ID: {orderId}',
  order_not_found: 'Pesanan tidak ditemukan.',
  order_cancelled: 'Pesanan telah dibatalkan.',

  // Payment messages
  payment_pending: 'Menunggu verifikasi pembayaran...',
  payment_verified: 'Pembayaran telah diverifikasi. Pesanan Anda sedang diproses.',
  payment_failed: 'Verifikasi pembayaran gagal. Silakan hubungi admin.',
  payment_timeout: 'Verifikasi pembayaran timeout. Silakan hubungi admin atau coba lagi.',

  // Store messages
  store_closed: 'Maaf, toko sedang tutup. Silakan coba lagi nanti.',
  store_opened: 'Toko telah dibuka. Selamat berbelanja!',

  // Admin messages
  admin_unauthorized: 'Anda bukan admin. Akses ditolak.',
  stock_updated: 'Stok produk telah diperbarui.',
  payment_verified_manual: 'Pembayaran telah diverifikasi secara manual.',

  // Notification messages
  notification_order_status: 'Status pesanan Anda telah berubah: {status}',
  notification_payment_received: 'Pembayaran Anda telah diterima.',
  notification_account_delivered: 'Akun premium Anda telah dikirim. Silakan cek pesan Anda.',

  // Error messages (T150, FR-034)
  error_network: 'Terjadi kesalahan koneksi. Silakan coba lagi.',
  error_database: 'Terjadi kesalahan pada database. Silakan hubungi admin.',
  error_payment_gateway: 'Terjadi kesalahan pada gateway pembayaran. Silakan coba lagi.',
  error_stock_conflict: 'Stok produk tidak mencukupi. Silakan pilih produk lain.',
  error_connection_timeout: 'Koneksi timeout. Silakan coba lagi.',
  error_redis_connection: 'Terjadi kesalahan pada koneksi cache. Silakan coba lagi.',
  error_invalid_input: 'Input tidak valid. Silakan periksa kembali data yang Anda masukkan.',
  error_validation_failed: 'Validasi gagal. Silakan periksa kembali data yang Anda masukkan.',
  error_rate_limit_exceeded: 'Terlalu banyak permintaan. Silakan tunggu sebentar dan coba lagi.',
  error_encryption_failed: 'Terjadi kesalahan saat mengenkripsi data. Silakan hubungi admin.',
  error_decryption_failed: 'Terjadi kesalahan saat mendekripsi data. Silakan hubungi admin.',
  error_file_upload_failed:
    'Gagal mengunggah file. Pastikan file tidak terlalu besar dan formatnya benar.',
  error_payment_proof_invalid:
    'Bukti pembayaran tidak valid. Pastikan file adalah foto atau screenshot yang jelas.',
  error_order_state_invalid: 'Status pesanan tidak valid untuk operasi ini.',
  error_checkout_expired: 'Sesi checkout telah kedaluwarsa. Silakan mulai checkout lagi.',
  error_quantity_invalid: 'Jumlah produk tidak valid. Silakan pilih jumlah yang tersedia.',
  error_price_mismatch: 'Harga produk tidak sesuai. Silakan refresh dan coba lagi.',
  error_webhook_signature_invalid: 'Tanda tangan webhook tidak valid. Permintaan ditolak.',
  error_admin_action_failed: 'Aksi admin gagal. Silakan coba lagi atau hubungi administrator.',
  error_customer_not_found: 'Data pelanggan tidak ditemukan.',
  error_product_inactive: 'Produk tidak aktif. Silakan pilih produk lain.',
  error_order_already_processed: 'Pesanan ini sudah diproses dan tidak dapat diubah.',
  error_payment_already_verified: 'Pembayaran ini sudah diverifikasi sebelumnya.',
  error_backup_failed: 'Gagal membuat backup. Silakan hubungi administrator.',
  error_recovery_failed: 'Gagal memulihkan data. Silakan hubungi administrator.',
  error_telegram_api: 'Terjadi kesalahan pada Telegram API. Silakan coba lagi nanti.',
  error_service_unavailable: 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.',
  error_internal_server:
    'Terjadi kesalahan pada server. Silakan hubungi admin jika masalah berlanjut.',

  // Checkout messages (T075)
  checkout_started: 'Checkout dimulai. Silakan konfirmasi pesanan Anda.',
  checkout_session_not_found: 'Sesi checkout tidak ditemukan. Silakan mulai checkout lagi.',
  checkout_cancelled: 'Checkout dibatalkan.',
  checkout_order_summary: '📋 *Ringkasan Pesanan*',
  checkout_payment_method_select: '💳 *Pilih Metode Pembayaran*',
  checkout_qris_instructions:
    'Silakan scan QRIS berikut untuk pembayaran:\n\n{qrCodeUrl}\n\nJumlah: *Rp {amount}*\n\nPembayaran akan diverifikasi secara otomatis setelah Anda melakukan pembayaran.',
  checkout_manual_instructions:
    'Silakan transfer ke rekening berikut:\n\n🏦 Bank: {bankName}\n📝 Nomor Rekening: {accountNumber}\n👤 Atas Nama: {accountHolder}\n💰 Jumlah: *Rp {amount}*\n\nSetelah transfer, silakan kirim bukti transfer Anda (foto atau screenshot).',
  checkout_payment_proof_received:
    '✅ Bukti pembayaran telah diterima. Admin akan memverifikasi pembayaran Anda segera.',
  checkout_payment_verified: '✅ Pembayaran Anda telah diverifikasi! Pesanan Anda sedang diproses.',
  checkout_payment_pending: '⏳ Menunggu verifikasi pembayaran...',
  checkout_timeout:
    '⏰ Checkout Anda telah timeout karena tidak ada aktivitas. Silakan mulai checkout lagi.',
};

/**
 * Get translated message
 * @param {string} key Message key
 * @param {Object} params Parameters to replace in message (e.g., {orderId: '123'})
 * @returns {string} Translated message in Indonesian
 */
function t(key, params = {}) {
  let message = messages[key] || key;

  // Replace parameters in message
  if (params && Object.keys(params).length > 0) {
    Object.keys(params).forEach((paramKey) => {
      const placeholder = `{${paramKey}}`;
      message = message.replace(new RegExp(placeholder, 'g'), params[paramKey]);
    });
  }

  return message;
}

/**
 * Add or update message
 * @param {string} key Message key
 * @param {string} value Message value
 */
function addMessage(key, value) {
  messages[key] = value;
}

module.exports = {
  t,
  addMessage,
  messages,
};
