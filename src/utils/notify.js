import { User, Notification } from '../models/index.js';

/**
 * Kirim notifikasi ke SEMUA user dengan role admin.
 * Dipakai untuk kasus: scan unmatched, atau info stok sudah dinormalkan kembali.
 */
export const notifyAllAdmins = async ({ title, message, type }) => {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  if (admins.length === 0) return;

  const notifications = admins.map((admin) => ({
    userId: admin._id,
    title,
    message,
    type,
  }));

  await Notification.insertMany(notifications);
};