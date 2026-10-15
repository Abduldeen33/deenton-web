import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PaymentReceipt from '../components/PaymentReceipt';
import Layout from '../components/Layout';
import api from '../api/client';
import { can, canOperate } from '../store/permissions';

const chargeTypes = ['ACCOMMODATION', 'RESTAURANT', 'LAUNDRY', 'MINIBAR', 'SERVICE', 'TAX', 'OTHER'];
const paymentMethods = ['CASH', 'CARD', 'BANK_TRANSFER', 'ORANGE_MONEY', 'AFRIMONEY', 'MOBILE_MONEY', 'COMPLIMENTARY'];

const chargeColors: any = {
  ACCOMMODATION: 'text-blue-400',
  RESTAURANT: 'text-orange-400',
  LAUNDRY: 'text-cyan-400',
  MINIBAR: 'text-purple-400',
  SERVICE: 'text-yellow-400',
  TAX: 'text-red-400',
  OTHER: 'text-slate-400',
};

export default function Billing() {
  const [searchParams] = useSearchParams();
  const requestedReservation = searchParams.get('reservation');
  useEffect(() => { if (requestedReservation && can('view_billing')) void openFolio(requestedReservation); }, [requestedReservation]);
  const [receipt, setReceipt] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const paymentLock = useRef(false);
  const paymentKey = useRef(crypto.randomUUID());
  const [savedRate, setSavedRate] = useState('');
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedFolio, setSelectedFolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [chargeForm, setChargeForm] = useState({
    chargeType: 'RESTAURANT',
    description: '',
    amount: '',
    quantity: '1',
  });
  const [paymentForm, setPaymentForm] = useState({
    method: 'CASH',
    amount: '',
    currency: 'SLL',
    exchangeRate: '',
    reference: '',
    email: '',
  });

  const load = () => {
    setLoading(true);
    if (!can('view_billing')) { setLoading(false); return; }
    api.get('/billing/reservations')
      .then((res) => {
        const active = res.data.filter((r: any) =>
          ['ARRIVED', 'STAYOVER', 'DUE_OUT', 'RESERVED', 'CHECKED_OUT'].includes(r.status)
        );
        setReservations(active);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); api.get('/billing/settings').then(r => { const rate = r.data.posExchangeRate ? String(r.data.posExchangeRate) : ''; setSavedRate(rate); setPaymentForm(p => ({ ...p, exchangeRate: rate })); }).catch(console.error); }, []);

  const openFolio = async (reservationId: string) => {
    try {
      const res = await api.get(`/billing/reservation/${reservationId}`);
      setSelectedFolio(res.data);
      setPaymentForm((prev) => ({
        ...prev,
        email: res.data.reservation?.guest?.email ?? prev.email,
      }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to load this guest folio');
    }
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('post_charges')) return;
    try {
      await api.post('/billing/charge', {
        folioId: selectedFolio.id,
        chargeType: chargeForm.chargeType,
        description: chargeForm.description,
        amount: Number(chargeForm.amount),
        quantity: Number(chargeForm.quantity),
      });
      setShowChargeForm(false);
      setChargeForm({ chargeType: 'RESTAURANT', description: '', amount: '', quantity: '1' });
      openFolio(selectedFolio.reservationId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add charge');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('record_payments') || paymentLock.current) return;
    paymentLock.current = true; setPaymentBusy(true);
    try {
      const paymentResult = await api.post('/billing/payment', {
        idempotencyKey: paymentKey.current,
        folioId: selectedFolio.id,
        method: paymentForm.method,
        amount: Number(paymentForm.amount),
        currency: paymentForm.currency,
        ...(paymentForm.exchangeRate && { exchangeRate: Number(paymentForm.exchangeRate) }),
        reference: paymentForm.reference,
        ...(paymentForm.email?.trim() ? { email: paymentForm.email.trim() } : {}),
      });
      setReceipt(paymentResult.data.id);
      setShowPaymentForm(false);
      setPaymentForm({ method: 'CASH', amount: '', currency: 'SLL', exchangeRate: savedRate, reference: '', email: selectedFolio.reservation?.guest?.email ?? '' });
      openFolio(selectedFolio.reservationId);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally { paymentLock.current = false; setPaymentBusy(false); }
  };

  const handleSendInvoice = async () => {
    if (!selectedFolio) return;
    try {
      await api.post(`/billing/folio/${selectedFolio.id}/send-invoice`, {
        email: paymentForm.email || selectedFolio.reservation?.guest?.email,
      });
      setShowInvoicePreview(false);
      alert('Invoice email sent successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send invoice email');
    }
  };

  const voidPayment = async (payment: any) => {
    const reason = prompt('Reason for voiding this payment?');
    if (reason === null) return;
    try {
      await api.patch(`/billing/payment/${payment.id}/void`, { reason });
      openFolio(selectedFolio.reservationId);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to void payment');
    }
  };

  const formatAmount = (amount: number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency, maximumFractionDigits: currency === 'SLL' ? 0 : 2,
    }).format(Number(amount));

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (!can('view_billing')) return <Layout><p className="p-6">Your account does not have access to Billing.</p></Layout>;

  return (
    <Layout>
      <div className="billing-pms min-h-full bg-[#f8f8f6] p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Billing & Cashiering</h2>
          <a href="/front-desk-cash" className="text-sm text-indigo-600 underline">Cash summary & House accounts</a>
          <p className="text-slate-400 text-sm mt-1">Manage guest folios, charges and payments</p>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Reservations List */}
            <div className="lg:col-span-1">
              <h3 className="text-white font-semibold mb-4">Guest Folios</h3>
              <div className="space-y-3">
                {reservations.length === 0 ? (
                  <p className="text-slate-400 text-sm">No guest folios</p>
                ) : (
                  reservations.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => openFolio(res.id)}
                      className={`bg-slate-800 border rounded-xl p-4 cursor-pointer transition-colors ${
                        selectedFolio?.reservationId === res.id
                          ? 'border-blue-600'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <p className="text-white font-medium">
                        {res.guest?.firstName} {res.guest?.lastName}
                      </p>
                      <p className="text-slate-400 text-sm">
                        Room {res.room?.roomNumber} · #{res.resNumber}
                      </p>
                      <div className="flex justify-between mt-2">
                        <span className="text-slate-500 text-xs">{res.status}</span>
                        <span className={`text-sm font-bold ${Number(res.balance) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          ${res.balance}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Folio Detail */}
            <div className="lg:col-span-2">
              {!selectedFolio ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                  <p className="text-slate-400">Select a guest to view their folio</p>
                </div>
              ) : (
                <div className="bg-slate-800 border border-slate-700 rounded-xl">
                  {/* Folio Header */}
                  <div className="p-6 border-b border-slate-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          {selectedFolio.reservation?.guest?.firstName} {selectedFolio.reservation?.guest?.lastName}
                        </h3>
                        <p className="text-slate-400 text-sm">
                          Room {selectedFolio.reservation?.room?.roomNumber} ·
                          #{selectedFolio.reservation?.resNumber} ·
                          {formatDate(selectedFolio.reservation?.arrivalDate)} →
                          {formatDate(selectedFolio.reservation?.departureDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-sm">Balance</p>
                        <p className={`text-2xl font-bold ${selectedFolio.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          ${selectedFolio.balance?.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4 flex-wrap">
                      {can('post_charges') && <button
                        onClick={() => setShowChargeForm(true)}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg"
                      >
                        + Add Charge
                      </button>}
                      {can('record_payments') && <button
                        onClick={() => {
                          setPaymentForm({
                            ...paymentForm,
                            amount: paymentForm.currency === 'SLL' ? (Number(paymentForm.exchangeRate) > 0 ? (selectedFolio.balance * Number(paymentForm.exchangeRate)).toFixed(2) : '') : selectedFolio.balance?.toFixed(2),
                            email: selectedFolio.reservation?.guest?.email ?? paymentForm.email,
                          });
                          paymentKey.current = crypto.randomUUID();
                          setShowPaymentForm(true);
                        }}
                        disabled={selectedFolio.balance <= 0}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white text-sm rounded-lg"
                      >
                        + Record Payment
                      </button>}
                      <button
                        onClick={() => {
                          setPaymentForm((prev) => ({
                            ...prev,
                            email: selectedFolio.reservation?.guest?.email ?? prev.email,
                          }));
                          setShowInvoicePreview(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg"
                      >
                        Send Invoice
                      </button>
                    </div>
                  </div>

                  {/* Charges */}
                  <div className="p-6 border-b border-slate-700">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-white font-semibold">Charges</h4>
                      <span className="text-white font-bold">Total: ${selectedFolio.totalCharges?.toFixed(2)}</span>
                    </div>
                    {selectedFolio.charges?.length === 0 ? (
                      <p className="text-slate-400 text-sm">No charges posted</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedFolio.charges?.map((charge: any) => (
                          <div key={charge.id} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium ${chargeColors[charge.chargeType]}`}>
                                  {charge.chargeType}
                                </span>
                                <span className="text-slate-500 text-xs">{formatTime(charge.postedAt)}</span>
                              </div>
                              <p className="text-white text-sm">{charge.description}</p>
                              {charge.quantity > 1 && (
                                <p className="text-slate-400 text-xs">{charge.quantity} × ${charge.amount}</p>
                              )}
                            </div>
                            <p className="text-white font-medium">${Number(charge.total).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payments */}
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-white font-semibold">Payments</h4>
                      <span className="text-green-400 font-bold">Paid: ${selectedFolio.totalPayments?.toFixed(2)}</span>
                    </div>
                    {selectedFolio.payments?.length === 0 ? (
                      <p className="text-slate-400 text-sm">No payments recorded</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedFolio.payments?.map((payment: any) => (
                          <div key={payment.id} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-400 text-xs font-medium">{payment.method.replace('_', ' ')}</span>
                                <span className="text-slate-500 text-xs">{formatTime(payment.paymentDate)}</span>
                              </div>
                              <button type="button" onClick={() => setReceipt(payment.id)} className="text-xs text-indigo-600 underline">{payment.receiptNumber || "View receipt"}</button>
                              {payment.reference && (
                                <p className="text-slate-400 text-xs">Ref: {payment.reference}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={payment.isVoided ? 'text-slate-500 line-through' : 'text-green-400 font-medium'}>{formatAmount(payment.amount, payment.currency)}</p>
                              {payment.currency === 'SLL' && <p className="text-xs text-slate-500">{formatAmount(payment.amountUsd, 'USD')}</p>}
                              {payment.isVoided ? <p className="text-xs text-red-400">Voided{payment.voidReason ? `: ${payment.voidReason}` : ''}</p> : can('manage_staff') && <button onClick={() => voidPayment(payment)} className="text-xs text-red-400 hover:text-red-300">Void</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Preview Modal */}
      {showInvoicePreview && selectedFolio && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Invoice Preview</h3>
              <button onClick={() => setShowInvoicePreview(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Guest</p>
                <p className="text-white font-medium">
                  {selectedFolio.reservation?.guest?.firstName} {selectedFolio.reservation?.guest?.lastName}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Reservation</p>
                <p className="text-white font-medium">#{selectedFolio.reservation?.resNumber}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Amount due</p>
                <p className="text-green-400 font-bold text-xl">${selectedFolio.balance?.toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Send to email</label>
                <input
                  type="email"
                  value={paymentForm.email}
                  onChange={(e) => setPaymentForm({ ...paymentForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInvoicePreview(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={handleSendInvoice} disabled={!canOperate()} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm">Send Invoice</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Charge Modal */}
      {showChargeForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Add Charge</h3>
              <button onClick={() => setShowChargeForm(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddCharge} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Charge Type</label>
                <select
                  value={chargeForm.chargeType}
                  onChange={(e) => setChargeForm({ ...chargeForm, chargeType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  {chargeTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description *</label>
                <input
                  required
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  placeholder="e.g. Dinner at The Bay Restaurant"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Amount ($) *</label>
                  <input
                    required
                    type="number"
                    value={chargeForm.amount}
                    onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={chargeForm.quantity}
                    onChange={(e) => setChargeForm({ ...chargeForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowChargeForm(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg text-sm">Post Charge</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Record Payment</h3>
              <button onClick={() => setShowPaymentForm(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form aria-busy={paymentBusy} onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Currency</label>
                <select value={paymentForm.currency} onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                  <option value="USD">USD — US Dollar</option>
                  <option value="SLL">SLL — Sierra Leonean Leone</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Amount ({paymentForm.currency}) *</label>
                <input
                  required
                  type="number"
                  value={paymentForm.amount}
                  min="0.01" step="0.01" max="99999999.99"
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              {(
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Exchange rate (Leones per 1 USD; required for Leones payments)</label>
                  <datalist id="billing-rates">{savedRate && <option value={savedRate}>Hotel saved rate</option>}</datalist>
                  <input list="billing-rates" required={paymentForm.currency === 'SLL'} type="number" step="0.0001" min="0.0001" value={paymentForm.exchangeRate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, exchangeRate: e.target.value })}
                    placeholder="e.g. 23000"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Guest invoice email</label>
                <input
                  type="email"
                  value={paymentForm.email}
                  onChange={(e) => setPaymentForm({ ...paymentForm, email: e.target.value })}
                  placeholder="guest@email.com"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Reference {['MOBILE_MONEY', 'ORANGE_MONEY', 'AFRIMONEY'].includes(paymentForm.method) && '(Transaction ID) *'}
                </label>
                <input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder={['MOBILE_MONEY', 'ORANGE_MONEY', 'AFRIMONEY'].includes(paymentForm.method) ? 'Mobile money transaction ID' : 'Optional reference'}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentForm(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg text-sm">Cancel</button>
                <button disabled={paymentBusy} type="submit" className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-semibold rounded-lg text-sm">{paymentBusy ? 'Recording…' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {receipt && <PaymentReceipt id={receipt} onClose={() => setReceipt('')} />}
    </Layout>
  );
}
