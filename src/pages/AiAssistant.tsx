import { useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

type Message = { role: 'user' | 'assistant'; content: string };

const prompts = [
  'What should the front desk focus on today?',
  'Summarise today’s arrivals, departures and occupancy.',
  'What is our current outstanding balance?',
  'Suggest a practical revenue action for today.',
];

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const send = async (value = message) => {
    const question = value.trim();
    if (!question || sending) return;
    setMessages((current) => [...current, { role: 'user', content: question }]);
    setMessage('');
    setError('');
    setSending(true);
    try {
      const response = await api.post('/ai-assistant/chat', { message: question });
      setMessages((current) => [...current, { role: 'assistant', content: response.data.answer }]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'The assistant could not answer right now.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-full bg-[#f8f8f6] p-4 text-[#353532]">
        <header className="mb-4 border-b border-[#deded9] bg-white px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#777773]">Phase 5 · Intelligence</p><h2 className="mt-1 text-lg font-semibold">Anzak AI Assistant</h2><p className="mt-1 text-[11px] text-[#777773]">Ask practical questions about anonymised property operations and performance.</p></header>
        <div className="grid min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-[230px_1fr]">
          <aside className="border border-[#deded9] bg-white p-3"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#777773]">Suggested questions</p><div className="space-y-1">{prompts.map((prompt) => <button key={prompt} onClick={() => send(prompt)} disabled={sending} className="w-full border border-[#e4e4df] px-3 py-2 text-left text-[11px] hover:bg-[#f5f5f1] disabled:opacity-50">{prompt}</button>)}</div><p className="mt-5 text-[10px] leading-4 text-[#888883]">The assistant receives aggregate metrics only—never guest identities or payment details.</p></aside>
          <section className="flex min-h-[520px] flex-col border border-[#deded9] bg-white"><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.length === 0 && <div className="flex h-full items-center justify-center text-center"><div><p className="text-sm font-medium">How can I help with hotel operations?</p><p className="mt-1 text-[11px] text-[#777773]">Use a suggested question or ask your own.</p></div></div>}{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`max-w-[82%] border px-3 py-2 text-[12px] leading-5 ${item.role === 'user' ? 'ml-auto border-[#d8d4ff] bg-[#f0efff] text-[#35306d]' : 'border-[#deded9] bg-[#fafaf8] text-[#353532]'}`}><p className="mb-1 text-[9px] font-semibold uppercase tracking-wide opacity-60">{item.role === 'user' ? 'You' : 'Anzak AI'}</p><p className="whitespace-pre-wrap">{item.content}</p></div>)}{sending && <div className="w-fit border border-[#deded9] bg-[#fafaf8] px-3 py-2 text-[11px] text-[#777773]">Reviewing property metrics…</div>}{error && <p className="border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">{error}</p>}</div><form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex gap-2 border-t border-[#deded9] p-3"><input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} placeholder="Ask about occupancy, arrivals, revenue or balances…" className="flex-1 border border-[#d4d4cf] px-3 py-2 text-[12px] outline-none focus:border-[#777773]" /><button disabled={!message.trim() || sending} className="bg-[#292b35] px-4 py-2 text-[11px] font-semibold text-white disabled:bg-[#b8b8b2]">Send</button></form></section>
        </div>
      </div>
    </Layout>
  );
}
