import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';

const featureMap = {
  'booking-engine': {
    title: 'Booking Engine',
    status: 'Ready for Build',
    summary: 'Public guest reservation flow without OTA commission.',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    direct: 'Lower acquisition cost and higher direct bookings',
    modules: ['Public Booking Page', 'Rate Selection', 'Guest Checkout', 'Reservation Redirect'],
    channels: ['Website', 'Mobile Web', 'Guest Portal'],
    actions: ['Search dates', 'Choose room type', 'Confirm reservation', 'Send guest portal link'],
  },
  whatsapp: {
    title: 'WhatsApp Integration',
    status: 'In Design',
    summary: 'Send confirmations, reminders, and receipts via WhatsApp Business API.',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    direct: 'Faster guest communication and stronger conversion rates',
    modules: ['Message Templates', 'Meta API Provider', 'Delivery Logs', 'Guest Follow-up'],
    channels: ['WhatsApp Business', 'Guest Messaging', 'Receipts'],
    actions: ['Send confirmation', 'Send reminder', 'Send receipt', 'Track message delivery'],
  },
  'channel-manager': {
    title: 'Channel Manager',
    status: 'In Design',
    summary: 'Sync room availability to OTAs using channel integrations and iCal export.',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    direct: 'Better distribution control and fewer overbookings',
    modules: ['Inventory Sync', 'Rate Distribution', 'Mapping Rules', 'Exception Review'],
    channels: ['Booking.com', 'Expedia', 'Airbnb', 'iCal'],
    actions: ['Push availability', 'Sync rates', 'Apply restrictions', 'Review sync issues'],
  },
  loyalty: {
    title: 'Loyalty Program',
    status: 'Planned',
    summary: 'Guests earn points per stay and redeem them for discounts or free nights.',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    direct: 'Stronger guest retention and repeat stay revenue',
    modules: ['Guest Profiles', 'Points Ledger', 'Tier Rules', 'Redemption Engine'],
    channels: ['Guest Profiles', 'Email', 'Direct Bookings', 'Rewards Portal'],
    actions: ['Award points', 'Redeem rewards', 'Track balances', 'Trigger guest offers'],
  },
} as const;

export default function GrowthFeaturePage() {
  const { slug } = useParams();
  const feature = useMemo(() => featureMap[(slug as keyof typeof featureMap) ?? 'booking-engine'], [slug]);

  if (!feature) {
    return (
      <Layout>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-800">Feature not found</h2>
          <Link to="/growth" className="mt-4 inline-block text-blue-600">Back to Growth</Link>
        </div>
      </Layout>
    );
  }

  const [checkIn, setCheckIn] = useState('2026-10-10');
  const [checkOut, setCheckOut] = useState('2026-10-12');
  const [roomType, setRoomType] = useState('Deluxe King');
  const [guests, setGuests] = useState('2');
  const [availability, setAvailability] = useState<{ days: number; price: number; directSavings: number } | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState('confirmation');
  const [recipient, setRecipient] = useState('+232 88 123 456');
  const [messageSent, setMessageSent] = useState(false);

  const [syncResult, setSyncResult] = useState<{ channel: string; status: string } | null>(null);

  const [points, setPoints] = useState(1480);
  const [redeemAmount, setRedeemAmount] = useState('250');
  const [ledger, setLedger] = useState([
    { label: 'Deluxe stay', points: 1200, type: 'earned', date: 'Today' },
    { label: 'Referral bonus', points: 280, type: 'earned', date: '2 days ago' },
  ]);

  const handleBookingCheck = () => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    const price = roomType === 'Deluxe King' ? 220 : roomType === 'Family Suite' ? 310 : 180;
    const directSavings = days * 45;
    setAvailability({ days, price: price * days, directSavings });
  };

  const handleSync = () => {
    const channel = feature.title === 'Channel Manager' ? 'Booking.com' : 'Airbnb';
    setSyncResult({ channel, status: 'Synced successfully' });
  };

  const handleRedeem = () => {
    const amount = Number(redeemAmount || 0);
    if (!amount || amount <= 0 || amount > points) return;
    setPoints((current) => current - amount);
    setLedger((current) => [{ label: 'Reward redemption', points: -amount, type: 'spent', date: 'Now' }, ...current]);
    setRedeemAmount('0');
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Growth module</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-800">{feature.title}</h2>
          </div>
          <div className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${feature.badge}`}>
            {feature.status}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm leading-6 text-slate-600">{feature.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {feature.modules.map((module) => (
              <span key={module} className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">{module}</span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
            <span className="font-semibold">Revenue impact:</span>
            <span>{feature.direct}</span>
          </div>
        </div>

        {slug === 'booking-engine' && (
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800">Direct booking check</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Check-in
                  <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Check-out
                  <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Room type
                  <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
                    <option>Deluxe King</option>
                    <option>Family Suite</option>
                    <option>Standard Twin</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Guests
                  <select value={guests} onChange={(e) => setGuests(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
                    <option value="2">2 guests</option>
                    <option value="3">3 guests</option>
                    <option value="4">4 guests</option>
                  </select>
                </label>
              </div>

              <button onClick={handleBookingCheck} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                Check availability
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800">Guest summary</h3>
              {availability ? (
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">Stay</p>
                    <p className="mt-1 text-lg font-bold text-slate-800">{availability.days} nights</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">Room</p>
                    <p className="mt-1 text-lg font-bold text-slate-800">{roomType}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">Direct booking total</p>
                    <p className="mt-1 text-lg font-bold text-slate-800">USD {availability.price.toFixed(0)}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                    <span className="font-semibold">Direct savings:</span> USD {availability.directSavings.toFixed(0)}
                  </div>
                  <button className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                    Create direct reservation
                  </button>
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-500">Pick dates and room type to preview availability.</p>
              )}
            </div>
          </div>
        )}

        {slug === 'whatsapp' && (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800">Send message</h3>
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Template
                  <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
                    <option value="confirmation">Booking confirmation</option>
                    <option value="reminder">Arrival reminder</option>
                    <option value="receipt">Payment receipt</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Guest number
                  <input value={recipient} onChange={(e) => setRecipient(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800" />
                </label>
              </div>
              <button onClick={() => setMessageSent(true)} className="mt-5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                Send via WhatsApp
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800">Preview</h3>
              <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                {selectedTemplate === 'confirmation' && 'Hello, your booking is confirmed for 2 nights at Mozza Hotel. We look forward to welcoming you.'}
                {selectedTemplate === 'reminder' && 'Reminder: your arrival is on 2026-10-10. Please confirm your check-in time via this WhatsApp number.'}
                {selectedTemplate === 'receipt' && 'Thank you for your payment. Your receipt has been attached and your stay is fully confirmed.'}
              </div>
              {messageSent && (
                <div className="mt-4 rounded-xl bg-green-100 p-3 text-sm font-medium text-green-700">
                  Message dispatched to {recipient} successfully.
                </div>
              )}
            </div>
          </div>
        )}

        {slug === 'channel-manager' && (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800">Channel sync</h3>
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Channel
                  <select className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
                    <option>Booking.com</option>
                    <option>Expedia</option>
                    <option>Airbnb</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  iCal export
                  <input value="https://sync.mozzahotel.com/ical/rooms" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800" />
                </label>
              </div>
              <button onClick={handleSync} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                Sync availability
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800">Sync status</h3>
              {syncResult ? (
                <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                  <p className="font-semibold">{syncResult.channel}</p>
                  <p className="mt-1">{syncResult.status}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No synchronization has been run yet.</p>
              )}
            </div>
          </div>
        )}

        {slug === 'loyalty' && (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800">Guest loyalty</h3>
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-lg font-bold text-amber-700">
                {points} points
              </div>
              <div className="mt-4 flex gap-3">
                <input value={redeemAmount} onChange={(e) => setRedeemAmount(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800" />
                <button onClick={handleRedeem} className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700">
                  Redeem
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800">Points history</h3>
              <div className="mt-4 space-y-3">
                {ledger.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{item.label}</span>
                      <span className={item.type === 'earned' ? 'text-emerald-600' : 'text-amber-600'}>{item.points > 0 ? '+' : ''}{item.points}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <Link to="/growth" className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Back to Growth overview
          </Link>
        </div>
      </div>
    </Layout>
  );
}
