import { fetchJsonWithAuth } from '@/lib/fetch-wrapper';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function getTodayExchangeRates(params?: {
  currency_from?: string;
  currency_to?: string;
  direction?: string;
}) {
  const query = params
    ? '?' + Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
        .join('&')
    : '';
  const res = await fetchJsonWithAuth(`${BASE_URL}/exchange-rate/today${query}`);
  return res;
}
