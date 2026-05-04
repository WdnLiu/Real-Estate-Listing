import { Property } from '../types';

interface Props {
  property: Property;
  onSelect: (id: number) => void;
}

export default function PropertyCard({ property, onSelect }: Props) {
  const {
    id,
    title,
    price,
    currency,
    areaSqm,
    rooms,
    bathrooms,
    floor,
    location,
    description,
    images,
  } = property;

  const primaryImage = images.find((img) => img.isPrimary)?.url ?? images[0]?.url;
  const locationLabel = [location.neighborhood ?? location.district, location.city]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="card" onClick={() => onSelect(id)} role="button" tabIndex={0}>
      <div className="card-image">
        {primaryImage ? (
          <img src={primaryImage} alt={title} />
        ) : (
          <div className="card-image-placeholder" />
        )}
      </div>
      <div className="card-body">
        <p className="card-location">{locationLabel}</p>
        <p className="card-address">{location.address}</p>
        <h2 className="card-title">{title}</h2>
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
        <p className="card-description">{description}</p>
      </div>
    </div>
  );
}
