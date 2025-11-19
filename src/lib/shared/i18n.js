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

  // Error messages
  error_network: 'Terjadi kesalahan koneksi. Silakan coba lagi.',
  error_database: 'Terjadi kesalahan pada database. Silakan hubungi admin.',
  error_payment_gateway: 'Terjadi kesalahan pada gateway pembayaran. Silakan coba lagi.',
  error_stock_conflict: 'Stok produk tidak mencukupi. Silakan pilih produk lain.',

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
