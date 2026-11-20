const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
function token() {
  const raw = localStorage.getItem('tyler_barber_session');
  const session = raw ? JSON.parse(raw) : null;
  if (!session?.access_token) throw new Error('Please sign in as owner.');
  return session.access_token as string;
}
async function responseError(res: Response) {
  const body = await res.json().catch(() => ({}));
  throw new Error(body.error || `Receipt service unavailable (HTTP ${res.status}). Deploy the receipt API on the VPS first.`);
}
export async function uploadExpenseReceipt(file: File, expense: { description: string; amount: number; expense_date: string; category: string }) {
  if (!base) throw new Error('API not configured.');
  const data = new FormData();
  data.append('receipt', file);
  Object.entries(expense).forEach(([key, value]) => data.append(key, String(value)));
  const res = await fetch(`${base}/barber/admin/expenses/receipt`, {
    method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: data,
  });
  if (!res.ok) await responseError(res);
  return res.json();
}
export async function openExpenseReceipt(id: string) {
  if (!base) throw new Error('API not configured.');
  const res = await fetch(`${base}/barber/admin/expenses/${encodeURIComponent(id)}/receipt`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) await responseError(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'expense-receipt'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function downloadAccountantExport() {
  if (!base) throw new Error('API not configured.');
  const res = await fetch(`${base}/barber/admin/expenses/accountant-export`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) await responseError(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'barber-expenses.zip'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
