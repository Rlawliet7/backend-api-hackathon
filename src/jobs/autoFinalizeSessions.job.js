import cron from 'node-cron';
import { OfflineCheckoutSession } from '../models/index.js';
import { finalizeSession } from '../services/posSession.service.js';
import env from '../config/env.js';

/**
 * Fallback otomatis (Bab 11.1 poin 4): cron job berjalan sesuai SESSION_AUTOCLOSE_CRON
 * (default tiap ~30 detik), mengecek sesi "open" yang lastScanAt-nya sudah lebih lama
 * dari SESSION_TIMEOUT_SECONDS (default 120 detik) → auto-finalisasi sebagai order
 * "completed" dengan paymentMethod "cash". handledBy = null menandakan ini otomatis, bukan admin.
 *
 * Sesi yang timeout tapi items-nya kosong (mis. device error sebelum sempat scan apa pun)
 * di-cancel saja, bukan di-finalize (menghindari order kosong / senilai 0).
 */
const autoFinalizeTimedOutSessions = async () => {
  const cutoff = new Date(Date.now() - env.SESSION_TIMEOUT_SECONDS * 1000);

  const timedOutSessions = await OfflineCheckoutSession.find({
    status: 'open',
    lastScanAt: { $lte: cutoff },
  });

  for (const session of timedOutSessions) {
    try {
      if (session.items.length === 0) {
        session.status = 'cancelled';
        await session.save();
        console.log(`[autoFinalizeSessions] Sesi ${session._id} (${session.deviceId}) dibatalkan otomatis: kosong.`);
        continue;
      }

      const { order } = await finalizeSession(session, { voucherCode: null, handledBy: null });
      console.log(`[autoFinalizeSessions] Sesi ${session._id} (${session.deviceId}) auto-finalized -> order ${order.orderCode}.`);
    } catch (err) {
      // Jangan sampai satu sesi bermasalah menghentikan proses sesi lain.
      console.error(`[autoFinalizeSessions] Gagal auto-finalize sesi ${session._id}:`, err.message);
    }
  }
};

/**
 * Daftarkan cron job. Dipanggil sekali di app.js saat server start.
 */
export const startAutoFinalizeSessionsJob = () => {
  cron.schedule(env.SESSION_AUTOCLOSE_CRON, autoFinalizeTimedOutSessions);
  console.log(`[autoFinalizeSessions] Job terjadwal: "${env.SESSION_AUTOCLOSE_CRON}" (timeout ${env.SESSION_TIMEOUT_SECONDS}s).`);
};