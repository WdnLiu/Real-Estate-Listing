import { useState } from 'react';

type Mode = 'info' | 'visit';

interface Props {
  propertyId: number;
}

export default function ContactForm({ propertyId }: Props) {
  const [mode, setMode] = useState<Mode>('info');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, type: mode,
          message: mode === 'info' ? message : undefined,
          visitDate: mode === 'visit' ? date : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError('Failed to send. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="form-box">
        <p className="form-success">
          {mode === 'visit' ? 'Visit request sent. We will confirm shortly.' : 'Message sent. We will get back to you soon.'}
        </p>
      </div>
    );
  }

  return (
    <div className="form-box">
      <h3 className="form-title">Contact</h3>
      <div className="form-mode-toggle">
        <button type="button" className={mode === 'info' ? 'active' : ''} onClick={() => setMode('info')}>Ask a question</button>
        <button type="button" className={mode === 'visit' ? 'active' : ''} onClick={() => setMode('visit')}>Request a visit</button>
      </div>
      <form onSubmit={handleSubmit} className="form-fields">
        <input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <input required type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode === 'visit' ? (
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
        ) : (
          <textarea required placeholder="Your question…" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        )}
        {error && <p className="ai-error">{error}</p>}
        <button type="submit" className="form-submit" disabled={loading}>
          {loading ? 'Sending…' : mode === 'visit' ? 'Request visit' : 'Send message'}
        </button>
      </form>
    </div>
  );
}
