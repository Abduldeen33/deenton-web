import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';

export default function FolioInvoicePreview({ id, email, onEmailChange, onSend, canSend, onClose }: {
  id: string; email: string; onEmailChange: (email: string) => void;
  onSend: () => Promise<void>; canSend: boolean; onClose: () => void;
}) {
  const [url, setUrl] = useState(''), [error, setError] = useState(''), [sending, setSending] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setUrl(''); setError('');
    api.get('/billing/folio/' + encodeURIComponent(id) + '/invoice', { responseType: 'blob', signal: controller.signal })
      .then(r => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(r.data); setUrl(objectUrl); } })
      .catch(async e => {
        let message = 'Unable to load invoice. Please close and retry.';
        if (e.response?.data instanceof Blob) {
          try { message = JSON.parse(await e.response.data.text()).message || message; } catch { /* Non-JSON proxy response */ }
        }
        if (!controller.signal.aborted) setError(String(message));
      });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id]);
  return createPortal(<div role="dialog" aria-modal="true" aria-label="Folio invoice" className="fixed inset-0 z-[200] overflow-auto bg-black/50 p-4">
    <section className="mx-auto max-w-5xl rounded bg-white p-4 text-sm text-slate-800">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Folio invoice — not a payment receipt</h2>
        <div className="flex gap-4">
          {url && <><a href={url} target="_blank" rel="noopener noreferrer" className="underline">Open PDF / Print</a><a href={url} download="folio-invoice.pdf" className="underline">Download invoice</a></>}
          <button autoFocus onClick={onClose}>Close invoice</button>
        </div>
      </div>
      {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
      {!url && !error && <p>Loading invoice…</p>}
      {url && <iframe title="Folio invoice PDF" src={url} className="h-[70vh] w-full border" />}
      <form className="mt-4 flex flex-wrap items-center gap-3" onSubmit={async e => {
        e.preventDefault(); if (sending || !canSend) return;
        setSending(true); try { await onSend(); } finally { setSending(false); }
      }}>
        <label htmlFor="folio-invoice-email">Send to email</label>
        <input id="folio-invoice-email" type="email" required value={email} onChange={e => onEmailChange(e.target.value)} className="rounded border px-3 py-2" />
        <button type="submit" disabled={!canSend || !url || sending} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{sending ? 'Sending…' : 'Send Invoice'}</button>
      </form>
    </section>
  </div>, document.body);
}
