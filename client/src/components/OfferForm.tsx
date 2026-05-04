import { useState } from 'react';

interface Props {
  propertyId: number;
  askingPrice: number;
  currency: string;
}

export default function OfferForm({ propertyId, askingPrice, currency }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [offer, setOffer] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, amount: Number(offer), note: note || undefined }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError('Failed to submit offer. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="form-box">
        <p className="form-success">Offer submitted. The seller will be in touch.</p>
      </div>
    );
  }

  const pct = offer ? Math.round((Number(offer) / askingPrice) * 100) : null;

  return (
    <div className="form-box">
      <h3 className="form-title">Make an offer</h3>
      <form onSubmit={handleSubmit} className="form-fields">
        <input
          required
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          required
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="form-offer-row">
          <input
            required
            type="number"
            min={1}
            placeholder={`Offer (asking: ${askingPrice.toLocaleString()} ${currency})`}
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
          />
          {pct !== null && (
            <span className={`form-offer-pct ${pct < 90 ? 'low' : pct >= 100 ? 'high' : ''}`}>
              {pct}% of asking
            </span>
          )}
        </div>
        <textarea
          placeholder="Additional note (optional)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="ai-error">{error}</p>}
        <button type="submit" className="form-submit" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit offer'}
        </button>
      </form>
    </div>
  );
}
