import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

const chargeTypes = ['ACCOMMODATION', 'RESTAURANT', 'LAUNDRY', 'MINIBAR', 'SERVICE', 'TAX', 'OTHER'];
const paymentMethods = ['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'COMPLIMENTARY'];

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
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedFolio, setSelectedFolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [chargeForm, setChargeForm] = useState({
    chargeType: 'RESTAURANT',
    description: '',
    amount: '',
    quantity: '1',
  });
  const [paymentForm, setPaymentForm] = useState({
    method: 'CASH',
    amount: '',
    reference: '',
  });

  const load = () => {
    setLoading(true);
    api.get('/reservations')
      .then((res) => {
        const active = res.data.filter((r: any) =>
          ['ARRIVED', 'STAYOVER', 'DUE_OUT', 'RESERVED'].includes(r.status)
        );
        setReservations(active);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openFolio = async (reservationId: string) => {
    const res = await api.get(`/billing/reservation/${reservationId}`);
    setSelectedFolio(res.data);
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
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
    try {
      await api.post('/billing/payment', {
        folioId: selectedFolio.id,
        method: paymentForm.method,
        amount: Number(paymentForm.amount),
        reference: paymentForm.reference,
      });
      setShowPaymentForm(false);
      setPaymentForm({ method: 'CASH', amount: '', reference: '' });
      openFolio(selectedFolio.reservationId);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Billing & Cashiering</h2>
          <p className="text-slate-400 text-sm mt-1">Manage guest folios, charges and payments</p>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Reservations List */}
            <div className="lg:col-span-1">
              <h3 className="text-white font-semibold mb-4">Active Guests</h3>
              <div className="space-y-3">
                {reservations.length === 0 ? (
                  <p className="text-slate-400 text-sm">No active guests</p>
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

                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => setShowChargeForm(true)}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg"
                      >
                        + Add Charge
                      </button>
                      <button
                        onClick={() => {
                          setPaymentForm({ ...paymentForm, amount: selectedFolio.balance?.toFixed(2) });
                          setShowPaymentForm(true);
                        }}
                        disabled={selectedFolio.balance <= 0}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white text-sm rounded-lg"
                      >
                        + Record Payment
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
                              {payment.reference && (
                                <p className="text-slate-400 text-xs">Ref: {payment.reference}</p>
                              )}
                            </div>
                            <p className="text-green-400 font-medium">${Number(payment.amount).toFixed(2)}</p>
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
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
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
                <label className="block text-sm text-slate-400 mb-1">Amount ($) *</label>
                <input
                  required
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Reference {paymentForm.method === 'MOBILE_MONEY' && '(Transaction ID) *'}
                </label>
                <input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder={paymentForm.method === 'MOBILE_MONEY' ? 'Orange Money / Afrimoney transaction ID' : 'Optional reference'}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentForm(false)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-sm">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}