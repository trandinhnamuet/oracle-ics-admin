import { fetchWithAuth } from '@/lib/fetch-wrapper';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export interface TicketAttachment {
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface SupportTicket {
  id: number;
  user_id?: number;
  title: string;
  customer_name: string;
  email: string;
  phone?: string;
  address?: string;
  service?: string;
  content: string;
  attachment_url?: string;
  attachments?: string; // JSON: TicketAttachment[]
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  admin_note?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  user?: { id: number; email: string; fullName?: string };
}

export function parseAttachments(ticket: SupportTicket): TicketAttachment[] {
  if (!ticket.attachments) return [];
  try {
    return JSON.parse(ticket.attachments) as TicketAttachment[];
  } catch {
    return [];
  }
}

export interface CreateTicketPayload {
  title: string;
  customer_name: string;
  email: string;
  phone?: string;
  address?: string;
  service?: string;
  content: string;
  attachment_url?: string;
  attachments?: string; // JSON stringified TicketAttachment[]
}

export async function uploadSupportFiles(
  files: File[],
): Promise<TicketAttachment[]> {
  const form = new FormData();
  for (const file of files) form.append('files', file);

  const res = await fetchWithAuth('/support-tickets/upload-files', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Tải file thất bại');
  }
  return res.json();
}

export async function createSupportTicket(data: CreateTicketPayload): Promise<SupportTicket> {
  const res = await fetchWithAuth('/support-tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Gửi yêu cầu thất bại');
  }
  return res.json();
}

export async function getMyTickets(): Promise<SupportTicket[]> {
  const res = await fetchWithAuth('/support-tickets/my');
  if (!res.ok) throw new Error('Không thể tải danh sách yêu cầu');
  return res.json();
}

export async function getAllTickets(): Promise<SupportTicket[]> {
  const res = await fetchWithAuth('/support-tickets');
  if (!res.ok) throw new Error('Không thể tải danh sách yêu cầu');
  return res.json();
}

export async function getTicketStats(): Promise<Record<string, number>> {
  const res = await fetchWithAuth('/support-tickets/stats');
  if (!res.ok) throw new Error('Không thể tải thống kê');
  return res.json();
}

export async function updateTicket(
  id: number,
  data: { status?: string; priority?: string; admin_note?: string },
): Promise<SupportTicket> {
  const res = await fetchWithAuth(`/support-tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Cập nhật thất bại');
  }
  return res.json();
}

export async function deleteTicket(id: number): Promise<void> {
  const res = await fetchWithAuth(`/support-tickets/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Xóa thất bại');
}

