import { useMemo, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import { Crosshair, LocateFixed, MapPin } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import './LocationPicker.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAP_STYLE = 'mapbox://styles/mapbox/light-v11';

const DEFAULT_VIEW_STATE = {
  longitude: 77.5946,
  latitude: 12.9716,
  zoom: 12,
  pitch: 0,
  bearing: 0,
};

function formatCoordinate(value) {
  return Number(value).toFixed(6);
}

export default function LocationPicker({
  latitude,
  longitude,
  address,
  onChange,
  className = '',
}) {
  const initialSelectedLocation = useMemo(() => {
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      return { latitude, longitude, address: address || '' };
    }
    return null;
  }, [address, latitude, longitude]);

  const [viewState, setViewState] = useState(() => ({
    ...DEFAULT_VIEW_STATE,
    ...(initialSelectedLocation
      ? {
          latitude: initialSelectedLocation.latitude,
          longitude: initialSelectedLocation.longitude,
          zoom: 15,
        }
      : {}),
  }));
  const [selectedLocation, setSelectedLocation] = useState(initialSelectedLocation);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const commitLocation = ({ latitude: nextLatitude, longitude: nextLongitude, source }) => {
    const nextLocation = {
      latitude: nextLatitude,
      longitude: nextLongitude,
      address: address || '',
      source,
    };

    setSelectedLocation(nextLocation);
    setLocationError('');
    setViewState((current) => ({
      ...current,
      latitude: nextLatitude,
      longitude: nextLongitude,
      zoom: Math.max(current.zoom, 15),
    }));

    onChange?.(nextLocation);
  };

  const handleMapClick = (event) => {
    const { lng, lat } = event.lngLat;
    commitLocation({
      latitude: lat,
      longitude: lng,
      source: 'map-click',
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Current location is not supported by this browser.');
      return;
    }

    setIsLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLatitude = position.coords.latitude;
        const nextLongitude = position.coords.longitude;

        commitLocation({
          latitude: nextLatitude,
          longitude: nextLongitude,
          source: 'browser-geolocation',
        });
        setIsLocating(false);
      },
      (error) => {
        setLocationError(error.message || 'Location permission was denied.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  };

  const handlePinMapCenter = () => {
    commitLocation({
      latitude: viewState.latitude,
      longitude: viewState.longitude,
      source: 'map-center',
    });
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`location-picker location-picker-empty ${className}`}>
        <div className="location-picker-empty-content">
          <MapPin size={26} />
          <h4>Mapbox token required</h4>
          <p>Add VITE_MAPBOX_TOKEN to your Vite environment and restart the dev server.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`location-picker ${className}`}>
      <Map
        {...viewState}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        onMove={(event) => setViewState(event.viewState)}
        onClick={handleMapClick}
        attributionControl={false}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />

        {selectedLocation && (
          <Marker
            latitude={selectedLocation.latitude}
            longitude={selectedLocation.longitude}
            anchor="bottom"
          >
            <div className="location-picker-marker" aria-label="Selected service location">
              <MapPin size={30} fill="currentColor" strokeWidth={2.2} />
            </div>
          </Marker>
        )}
      </Map>

      <div className="location-picker-actions">
        <button
          type="button"
          className="location-picker-current"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <LocateFixed size={16} className="location-picker-spin" />
          ) : (
            <Crosshair size={16} />
          )}
          <span>{isLocating ? 'Locating...' : 'Use Current Location'}</span>
        </button>
        <button
          type="button"
          className="location-picker-current location-picker-pin"
          onClick={handlePinMapCenter}
        >
          <MapPin size={16} />
          <span>Pin Location</span>
        </button>
      </div>

      <div className="location-picker-readout">
        {selectedLocation ? (
          <>
            <span>Lat {formatCoordinate(selectedLocation.latitude)}</span>
            <span>Lng {formatCoordinate(selectedLocation.longitude)}</span>
          </>
        ) : (
          <span>Click the map to pin the exact PG entrance</span>
        )}
      </div>

      {locationError && (
        <div className="location-picker-error" role="status">
          {locationError}
        </div>
      )}
    </div>
  );
}
