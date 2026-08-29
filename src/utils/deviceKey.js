import crypto from 'crypto';

/**
 * Generate API key mentah untuk device baru, format: dk_live_<random hex>
 * Key ini hanya ditampilkan SEKALI ke admin saat POST /devices, lalu tidak pernah disimpan mentah.
 */
export const generateApiKey = () => `dk_live_${crypto.randomBytes(24).toString('hex')}`;

/**
 * Hash API key dengan salt dari env, disimpan sebagai devices.apiKeyHash.
 * Pakai HMAC-SHA256 supaya deterministik (bisa dicocokkan lagi saat device call endpoint)
 * tanpa perlu simpan salt per-record seperti bcrypt.
 */
export const hashApiKey = (rawKey, salt) => {
  return crypto.createHmac('sha256', salt || '').update(rawKey).digest('hex');
};