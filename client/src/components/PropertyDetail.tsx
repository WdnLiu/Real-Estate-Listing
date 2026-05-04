import { useState, useEffect } from 'react';
import { Property } from '../types';
import ContactForm from './ContactForm';
import OfferForm from './OfferForm';

interface Props {
  id: number;
  onBack: () => void;
}

export default function PropertyDetail({ id, onBack }: Props) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setProperty)
      .catch(() => setError('Property not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="empty">Loading…</p>;
  if (error || !property) return <p className="empty">{error}</p>;

  const {
    title,
    price,
    currency,
    areaSqm,
    rooms,
    bathrooms,
    floor,
    hasElevator,
    extras,
    location,
    description,
    images,
    listingUrl,
    contactPhone,
  } = property;

  return (
    <div className="detail">
      <button className="back-btn" onClick={onBack}>
        ← Back
      </button>

      <div className="detail-images">
        {images.length > 0 ? (
          images.map((img) => <img key={img.url} src={img.url} alt={title} />)
        ) : (
          <div className="card-image-placeholder detail-placeholder" />
        )}
      </div>

      <div className="detail-body">
        <h1>{title}</h1>
        <p className="card-location">
          {[location.address, location.neighborhood, location.district, location.city]
            .filter(Boolean)
            .join(', ')}
        </p>
        <p className="card-price">
          {price.toLocaleString()} {currency}
        </p>
        <div className="card-meta">
          <span>
            {rooms} bed · {bathrooms} bath
          </span>
          <span>{areaSqm} m²</span>
          {floor !== null && <span>Floor {floor}</span>}
        </div>
        <div className="detail-extras">
          <span
            className={`detail-extra-tag ${hasElevator ? 'detail-extra-yes' : 'detail-extra-no'}`}
          >
            {hasElevator ? 'Elevator' : 'No elevator'}
          </span>
          {extras.map((e) => (
            <span key={e} className="detail-extra-tag">
              {e}
            </span>
          ))}
        </div>
        <p className="detail-description">{description}</p>
        <div className="card-actions">
          {contactPhone && <a href={`tel:${contactPhone}`}>{contactPhone}</a>}
          {listingUrl && (
            <a
              href={listingUrl.startsWith('http') ? listingUrl : `https://${listingUrl}`}
              target="_blank"
              rel="noreferrer"
            >
              View original listing ↗
            </a>
          )}
        </div>
      </div>

      <div className="detail-forms">
        <ContactForm propertyId={id} />
        <OfferForm propertyId={id} askingPrice={price} currency={currency} />
      </div>
    </div>
  );
}
