import { useMemo } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import { MapPin } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAP_STYLE = 'mapbox://styles/mapbox/light-v11';

function formatCoordinate(value, positive, negative) {
  const numericValue = Number(value);
  return `${Math.abs(numericValue).toFixed(6)}° ${numericValue >= 0 ? positive : negative}`;
}

export default function ExactLocation({ latitude, longitude, address }) {
  const coordinates = useMemo(() => {
    const nextLatitude = Number(latitude);
    const nextLongitude = Number(longitude);
    if (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude)) return null;
    if (nextLatitude < -90 || nextLatitude > 90 || nextLongitude < -180 || nextLongitude > 180) return null;
    return { latitude: nextLatitude, longitude: nextLongitude };
  }, [latitude, longitude]);

  const initialViewState = useMemo(() => ({
    longitude: coordinates?.longitude ?? 77.5946,
    latitude: coordinates?.latitude ?? 12.9716,
    zoom: coordinates ? 15 : 11,
    pitch: 0,
    bearing: 0,
  }), [coordinates]);

  return (
    <section className="tiffin-exact-location" aria-labelledby="exact-location-title">
      <div className="tiffin-exact-location-heading">
        <div>
          <span className="tiffin-exact-location-icon"><MapPin size={17} /></span>
          <div>
            <h2 id="exact-location-title">Exact Location</h2>
            <p>{address || 'Service location'}</p>
          </div>
        </div>
        {coordinates && (
          <span className="tiffin-exact-location-coordinates" aria-label="Service coordinates">
            {formatCoordinate(coordinates.latitude, 'N', 'S')} · {formatCoordinate(coordinates.longitude, 'E', 'W')}
          </span>
        )}
      </div>

      <div className={`tiffin-location-map${!coordinates || !MAPBOX_TOKEN ? ' is-unavailable' : ''}`}>
        {coordinates && MAPBOX_TOKEN ? (
          <Map
            key={`${coordinates.latitude}-${coordinates.longitude}`}
            initialViewState={initialViewState}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={MAP_STYLE}
            attributionControl={false}
            reuseMaps
          >
            <NavigationControl position="top-right" showCompass={false} />
            <Marker latitude={coordinates.latitude} longitude={coordinates.longitude} anchor="bottom">
              <div className="tiffin-exact-location-marker" aria-label="Exact service location">
                <MapPin size={32} fill="currentColor" strokeWidth={2.2} />
              </div>
            </Marker>
          </Map>
        ) : (
          <div className="tiffin-location-map-message">
            <MapPin size={26} />
            <span>{coordinates ? 'Map preview is unavailable right now.' : 'Exact coordinates are not available for this provider yet.'}</span>
          </div>
        )}
      </div>

      {coordinates && (
        <div className="tiffin-location-readout">
          <span>{formatCoordinate(coordinates.latitude, 'N', 'S')}</span>
          <span>{formatCoordinate(coordinates.longitude, 'E', 'W')}</span>
        </div>
      )}
    </section>
  );
}
