import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, MapPin, Plus } from 'lucide-react';
import Button from '../components/Button';
import './AddListing.css';

export default function AddListing() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const steps = ['Photos', 'Details', 'Services', 'Location'];

  return (
    <div className="page" id="add-listing">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>Add Listing</h1>
      </div>
      <div className="al-progress">
        {steps.map((s, i) => (
          <div key={s} className={`al-step ${i <= step ? 'active' : ''}`}>
            <div className="al-step-dot">{i < step ? '✓' : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>
      <div className="al-body">
        {step === 0 && (
          <div className="al-section">
            <h2>Upload Photos</h2>
            <p>Add at least 3 photos of your property</p>
            <div className="al-upload-grid">
              <button className="al-upload-btn"><Upload size={24} /><span>Add Photo</span></button>
              <button className="al-upload-btn"><Plus size={24} /></button>
              <button className="al-upload-btn"><Plus size={24} /></button>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="al-section">
            <h2>Property Details</h2>
            <div className="al-form">
              <div><label className="input-label">Title</label><input className="input-field" placeholder="e.g. Sunshine PG for Boys" /></div>
              <div><label className="input-label">Price (₹/month)</label><input className="input-field" type="number" placeholder="8500" /></div>
              <div><label className="input-label">Room Type</label>
                <div className="al-options">{['Single', 'Shared (2)', 'Shared (3)', 'Shared (4)'].map(o => (
                  <button key={o} className="al-option">{o}</button>
                ))}</div></div>
              <div><label className="input-label">Gender</label>
                <div className="al-options">{['Male', 'Female', 'Any'].map(o => (
                  <button key={o} className="al-option">{o}</button>
                ))}</div></div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="al-section">
            <h2>Services Included</h2>
            <div className="al-toggles">
              {['WiFi', 'Food (Meals)', 'Laundry', 'Cleaning', 'AC', 'Geyser', 'Parking'].map(s => (
                <div key={s} className="al-toggle-row"><span>{s}</span><div className="toggle" /></div>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="al-section">
            <h2>Location</h2>
            <input className="input-field" placeholder="Enter address" />
            <div className="al-map"><MapPin size={32} /><p>Tap to set location on map</p></div>
          </div>
        )}
      </div>
      <div className="al-footer">
        {step > 0 && <Button variant="ghost" onClick={() => setStep(s => s - 1)}>Back</Button>}
        <Button variant="primary" fullWidth onClick={() => step < 3 ? setStep(s => s + 1) : navigate('/broker')}>
          {step < 3 ? 'Next' : 'Publish Listing'}
        </Button>
      </div>
    </div>
  );
}
