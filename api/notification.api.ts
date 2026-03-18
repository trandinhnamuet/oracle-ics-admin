import { fetchWithAuth } from '@/lib/fetch-wrapper';

export type NotificationType =
  | 'wallet_credit'
  | 'wallet_debit'
  | 'support_ticket_created'
  | 'support_ticket_updated'
  | 'subscription_created'
  | 'subscription_expiring'
  | 'subscription_renewed'
  | 'subscription_expired'
  | 'vm_provisioned'
  | 'vm_started'
  | 'vm_stopped'
  | 'vm_restarted'
  | 'vm_terminated'
  | 'password_changed'
  | 'password_reset'
  | 'account_login'
  | 'general';

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  title_en: string | null;
  message_en: string | null;
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPage {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  server_time?: string; // Server timestamp for timezone detection
}

export async function getMyNotifications(page = 1, limit = 20): Promise<NotificationPage> {
  const res = await fetchWithAuth(`/notifications/my?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Không thể tải thông báo');
  return res.json();
}

export async function getUnreadCount(): Promise<number> {
  const res = await fetchWithAuth('/notifications/my/unread-count');
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export async function markAllRead(): Promise<void> {
  const res = await fetchWithAuth('/notifications/mark-all-read', { method: 'PATCH' });
  if (!res.ok) throw new Error('Không thể đánh dấu đã đọc');
}

export async function markOneRead(id: number): Promise<void> {
  const res = await fetchWithAuth(`/notifications/${id}/read`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Không thể đánh dấu đã đọc');
}

export async function clearReadNotifications(): Promise<void> {
  const res = await fetchWithAuth('/notifications/clear-read', { method: 'DELETE' });
  if (!res.ok) throw new Error('Không thể xoá thông báo đã đọc');
}

export async function deleteNotification(id: number): Promise<void> {
  const res = await fetchWithAuth(`/notifications/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Không thể xoá thông báo');
}
