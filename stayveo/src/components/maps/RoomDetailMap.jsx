import { useState, useMemo } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import { MapPin, Navigation } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import './RoomDetailMap.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAP_STYLE = 'mapbox://styles/mapbox/light-v11';

export default function RoomDetailMap({ latitude, longitude, address }) {
  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude);

  const initialViewState = useMemo(() => {
    return {
      longitude: longitude || 77.5946,
      latitude: latitude || 12.9716,
      zoom: 15,
      pitch: 0,
      bearing: 0,
    };
  }, [latitude, longitude]);

  const [viewState, setViewState] = useState(initialViewState);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rd-map-fallback">
        <MapPin size={24} />
        <h4>Mapbox token missing</h4>
        <p>Add VITE_MAPBOX_TOKEN to your environment configuration.</p>
      </div>
    );
  }

  if (!hasCoordinates) {
    return (
      <div className="rd-map-fallback">
        <MapPin size={24} />
        <h4>No Coordinates Available</h4>
        <p>Location coordinates are not specified for this property.</p>
      </div>
    );
  }

  const handleOpenInMaps = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
  };

  return (
    <div className="rd-map-container">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        dragPan={true}
        scrollZoom={false}
        doubleClickZoom={false}
        dragRotate={false}
        touchZoomRotate={false}
        attributionControl={false}
        reuseMaps
      >
        <Marker latitude={latitude} longitude={longitude} anchor="bottom">
          <div className="rd-map-marker" aria-label="Property location">
            <MapPin size={24} fill="currentColor" strokeWidth={2.5} />
          </div>
        </Marker>
      </Map>

      <button className="rd-map-directions-btn" onClick={handleOpenInMaps}>
        <Navigation size={14} />
        <span>Directions</span>
      </button>
    </div>
  );
}
