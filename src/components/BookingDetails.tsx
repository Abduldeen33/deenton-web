import { useEffect, useState } from 'react';
import { sendReservationEmail } from '../api/reservations';
import { can, canOperate } from '../store/permissions';
import ReservationFinancialDetails from './ReservationFinancialDetails';

export default function BookingDetails({ reservation: r, busy, onClose, onCheckIn, onCheckOut, onPayment, onEdit }: {
  reservation: any; busy: boolean; onClose: () => void;
  onCheckIn: () => void; onCheckOut: () => void; onPayment: () => void; onEdit: () => void;
}) {
  const [email, setEmail] = useState(r.guest?.email || '');
  const [sending, setSending] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  const active = ['RESERVED', 'ARRIVED', 'STAYOVER', 'DUE_OUT'].includes(r.status);
  const date = (value: string) => new Date(value.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC' });
  const button = 'rounded border px-4 py-2 text-sm disabled:opacity-50';
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <section role="dialog" aria-modal="true" aria-label="Guest reservation" className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-xl bg-white p-6 text-sm text-slate-800 shadow-xl">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div><h2 className="text-lg font-semibold">{r.guest?.firstName} {r.guest?.lastName}</h2><p>Reservation #{r.resNumber}</p></div>
        <button autoFocus onClick={onClose} className={button}>Close booking</button>
      </header>
      <dl className="grid grid-cols-2 gap-3 rounded border bg-slate-50 p-4">
        <div><dt className="text-slate-500">Booking status</dt><dd>{r.status === 'RESERVED' ? 'Confirmed reservation' : r.status.replaceAll('_', ' ')}</dd></div>
        <div><dt className="text-slate-500">Room</dt><dd>{r.room?.roomNumber} — {r.room?.roomType?.name}</dd></div>
        <div><dt className="text-slate-500">Arrival</dt><dd>{date(r.arrivalDate)}</dd></div>
        <div><dt className="text-slate-500">Departure</dt><dd>{date(r.departureDate)}</dd></div>
        <div><dt className="text-slate-500">Guests</dt><dd>{r.adults} adults · {r.children} children</dd></div>
      </dl>
      {r.nights != null && <p className="mt-2">Booked nights: <strong>{r.nights}</strong> · Checkout day is not an extra night.</p>}
      <div className="my-4 flex flex-wrap gap-2">
        {can('checkin_checkout') && r.status === 'RESERVED' && <button disabled={busy} onClick={onCheckIn} className={button + ' bg-green-600 text-white'}>Check In</button>}
        {can('checkin_checkout') && ['ARRIVED', 'STAYOVER', 'DUE_OUT'].includes(r.status) && <button disabled={busy} onClick={onCheckOut} className={button + ' bg-orange-600 text-white'}>Check Out</button>}
        {can('record_payments') && <button disabled={busy} onClick={onPayment} className={button}>Collect Payment</button>}
        {canOperate() && can('create_reservations') && <button disabled={busy} onClick={onEdit} className={button}>Edit booking</button>}
        {can('view_billing') && <a href={'/billing?reservation=' + encodeURIComponent(r.id)} className={button}>View folio / invoice</a>}
      </div>
      {!can('checkin_checkout') && active && <p className="mb-4 text-slate-600">Check-in and checkout require an authorized Front Desk supervisor, manager or administrator.</p>}
      {r.status === 'RESERVED' && <p className="mb-4 text-slate-600">Check-in is allowed with an unpaid balance. Any outstanding charges remain on the guest folio; use Collect Payment when payment is received.</p>}
      {active && canOperate() && can('create_reservations') && <form className="border-t pt-4" onSubmit={async e => {
        e.preventDefault(); if (sending) return;
        setSending(true); setMessage(''); setError('');
        try { await sendReservationEmail(r.id, email.trim()); setMessage('Booking confirmation emailed successfully.'); }
        catch (e: any) { setError(String(e.response?.data?.message || 'Unable to send confirmation. Please check the email address and backend email configuration.')); }
        finally { setSending(false); }
      }}>
        <label className="block font-medium" htmlFor="booking-confirmation-email">Booking confirmation email</label>
        <input id="booking-confirmation-email" required type="email" value={email} onChange={e => setEmail(e.target.value)} className="my-2 w-full rounded border px-3 py-2" />
        <button disabled={sending || busy} type="submit" className={button + ' bg-blue-600 text-white'}>{sending ? 'Sending confirmation…' : 'Email booking confirmation'}</button>
        <p className="mt-2 text-xs text-slate-500">Sends confirmation for this existing booking; does not create another reservation or record payment.</p>
      </form>}
      {can('view_billing') && <ReservationFinancialDetails id={r.id} revision={`${r.financials?.paidUsd}:${r.financials?.totalOutstandingUsd}:${busy}`} />}
      {message && <p role="status" className="mt-3 text-green-700">{message}</p>}
      {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    </section>
  </div>;
}
