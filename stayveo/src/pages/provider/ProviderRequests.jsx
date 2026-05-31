import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker } from 'react-map-gl/mapbox';
import { ArrowLeft, Calendar, Check, Clock, Loader, MapPin, Phone, X } from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import {
  acceptServiceRequest,
  declineServiceRequest,
  getProviderServiceRequests,
} from '../../api/serviceRequests';
import { formatDistance } from '../../utils/calculateDistance';
import { useProviderLaundryRealtime } from '../../hooks/useLaundryRealtime';
import 'mapbox-gl/dist/mapbox-gl.css';
import './ProviderRequests.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const tabs = ['pending', 'accepted', 'declined'];
const labels = { pending: 'Pending', accepted: 'Accepted', declined: 'Declined' };
const serviceEmoji = { laundry: '🧺', cleaning: '🧹' };

function RequestMap({ request }) {
  const studentLat = Number(request?.studentLatitude);
  const studentLng = Number(request?.studentLongitude);
  const providerLat = Number(request?.providerLatitude);
  const providerLng = Number(request?.providerLongitude);
  const hasStudent = Number.isFinite(studentLat) && Number.isFinite(studentLng);
  const hasProvider = Number.isFinite(providerLat) && Number.isFinite(providerLng);

  if (!MAPBOX_TOKEN || !hasStudent) {
    return (
      <div className="pr-map-fallback">
        <MapPin size={22} />
        <span>Location preview unavailable</span>
      </div>
    );
  }

  return (
    <div className="pr-map">
      <Map
        initialViewState={{
          latitude: studentLat,
          longitude: studentLng,
          zoom: hasProvider ? 12 : 15,
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        attributionControl={false}
        reuseMaps
      >
        <Marker latitude={studentLat} longitude={studentLng} anchor="bottom">
          <div className="pr-marker pr-marker-student"><MapPin size={24} fill="currentColor" /></div>
        </Marker>
        {hasProvider && (
          <Marker latitude={providerLat} longitude={providerLng} anchor="bottom">
            <div className="pr-marker pr-marker-provider"><MapPin size={24} fill="currentColor" /></div>
          </Marker>
        )}
      </Map>
    </div>
  );
}

export default function ProviderRequests() {
  const navigate = useNavigate();
  const toast = useToast();
  const { provider } = useProvider();
  const providerId = provider.providerId;
  const [activeTab, setActiveTab] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [acceptingRequest, setAcceptingRequest] = useState(null);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    try {
      const res = await getProviderServiceRequests(providerId, { status: activeTab, limit: 50 });
      setRequests(res.data?.items || []);
    } catch (error) {
      toast.error(error.message || 'Could not load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, providerId, toast]);

  useEffect(() => {
    queueMicrotask(loadRequests);
  }, [loadRequests]);

  const realtimeHandlers = useMemo(() => ({
    onInsert: (request) => {
      setRequests((current) => {
        if (activeTab !== request.status) return current;
        if (current.some((item) => item.id === request.id)) return current;
        return [request, ...current];
      });
      toast.info(`${request.studentName || 'Student'} requested ${request.serviceType}`);
    },
    onUpdate: (request) => {
      setRequests((current) => {
        const withoutRequest = current.filter((item) => item.id !== request.id);
        return activeTab === request.status ? [request, ...withoutRequest] : withoutRequest;
      });
    },
  }), [activeTab, toast]);

  useProviderLaundryRealtime(providerId, realtimeHandlers);

  const counts = useMemo(() => {
    return requests.reduce((acc, request) => {
      acc[request.status] = (acc[request.status] || 0) + 1;
      return acc;
    }, {});
  }, [requests]);

  const handleDecline = async (request) => {
    try {
      await declineServiceRequest(providerId, request.id, '');
      toast.info('Request declined');
      loadRequests();
    } catch (error) {
      toast.error(error.message || 'Could not decline request');
    }
  };

  const handleAccept = async () => {
    if (!acceptingRequest || !pickupDate || !pickupTime) return;
    setSubmitting(true);
    try {
      await acceptServiceRequest(providerId, acceptingRequest.id, {
        selectedDate: pickupDate,
        selectedTime: pickupTime,
        estimatedArrival,
      });
      toast.success('Request accepted. Student has been notified.');
      setAcceptingRequest(null);
      setPickupDate('');
      setPickupTime('');
      setEstimatedArrival('');
      loadRequests();
    } catch (error) {
      toast.error(error.message || 'Could not accept request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pr-page" id="provider-requests">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/provider/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Requests</h1>
      </div>

      <div className="pr-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`pr-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {labels[tab]}
            {counts[tab] > 0 && <span>{counts[tab]}</span>}
          </button>
        ))}
      </div>

      <div className="pr-list">
        {loading ? (
          <div className="empty-state">
            <Loader size={28} className="spinning" />
            <p style={{ marginTop: 12 }}>Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No {labels[activeTab].toLowerCase()} requests</h3>
            <p>Laundry and cleaning requests will appear here.</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="pr-card">
              <button className="pr-card-main" onClick={() => setSelectedRequest(request)}>
                <span className="pr-card-emoji">
                  {request.studentImageUrl ? (
                    <img src={request.studentImageUrl} alt="" className="pr-avatar-img" />
                  ) : (
                    serviceEmoji[request.serviceType] || '📦'
                  )}
                </span>
                <span>
                  <strong>{request.studentName || 'Student'} requested {request.serviceType}</strong>
                  <small>{formatDistance(request.distanceKm)} away</small>
                </span>
              </button>
              {request.status === 'pending' ? (
                <div className="pr-card-actions">
                  <button className="pr-action pr-decline" onClick={() => handleDecline(request)}>
                    <X size={16} />
                  </button>
                  <button className="pr-action pr-accept" onClick={() => setAcceptingRequest(request)}>
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <span className={`pr-status pr-status-${request.status}`}>{request.status}</span>
              )}
            </div>
          ))
        )}
      </div>

      {selectedRequest && (
        <>
          <div className="overlay" onClick={() => setSelectedRequest(null)} />
          <div className="pr-sheet">
            <div className="pr-sheet-header">
              <h2>{selectedRequest.studentName || 'Student'}</h2>
              <button onClick={() => setSelectedRequest(null)}><X size={20} /></button>
            </div>
            <RequestMap request={selectedRequest} />
            <div className="pr-detail-list">
              <p><strong>Phone</strong><span>{selectedRequest.studentPhone || 'Not shared'}</span></p>
              <p><strong>Address</strong><span>{selectedRequest.studentAddress || 'Not shared'}</span></p>
              <p><strong>Distance</strong><span>{formatDistance(selectedRequest.distanceKm)}</span></p>
              <p><strong>Service</strong><span>{selectedRequest.serviceType}</span></p>
              {selectedRequest.pickupDate && (
                <p><strong>Pickup</strong><span>{new Date(selectedRequest.pickupDate).toLocaleDateString('en-IN')} · {selectedRequest.pickupTime}</span></p>
              )}
            </div>
            {selectedRequest.studentPhone && (
              <a className="pr-call" href={`tel:${selectedRequest.studentPhone}`}>
                <Phone size={16} /> Call student
              </a>
            )}
          </div>
        </>
      )}

      {acceptingRequest && (
        <>
          <div className="overlay" onClick={() => setAcceptingRequest(null)} />
          <div className="pr-accept-modal">
            <div className="pr-sheet-header">
              <h2>Accept Request</h2>
              <button onClick={() => setAcceptingRequest(null)}><X size={20} /></button>
            </div>
            <label><Calendar size={14} /> Pickup Date</label>
            <input
              type="date"
              className="input-field"
              value={pickupDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(event) => setPickupDate(event.target.value)}
            />
            <label><Clock size={14} /> Pickup Time</label>
            <input
              type="time"
              className="input-field"
              value={pickupTime}
              onChange={(event) => setPickupTime(event.target.value)}
            />
            <label>Estimated Arrival</label>
            <input
              className="input-field"
              placeholder="e.g., 20 minutes"
              value={estimatedArrival}
              onChange={(event) => setEstimatedArrival(event.target.value)}
            />
            <button
              className="pr-submit-accept"
              disabled={!pickupDate || !pickupTime || submitting}
              onClick={handleAccept}
            >
              {submitting ? 'Accepting...' : 'Accept and notify student'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
