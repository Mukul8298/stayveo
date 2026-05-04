import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Upload, Shield, Clock, CheckCircle2 } from 'lucide-react';
import Button from '../../components/Button';
import './ProviderVerification.css';

export default function ProviderVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedTypes = location.state?.types || ['pg'];
  const [step, setStep] = useState('upload'); // upload | submitted
  const [idUploaded, setIdUploaded] = useState(false);
  const [bizUploaded, setBizUploaded] = useState(false);

  if (step === 'submitted') {
    return (
      <div className="pv-success" id="verification-submitted">
        <div className="pv-success-icon">
          <Clock size={56} />
        </div>
        <h1>Verification Pending</h1>
        <p>We'll review your documents within 24 hours. You'll receive a notification once verified.</p>

        <div className="pv-status-card">
          <div className="pv-status-row">
            <Shield size={16} />
            <span>ID Proof</span>
            <span className="pv-badge pv-badge-pending">Under Review</span>
          </div>
          <div className="pv-status-row">
            <Shield size={16} />
            <span>Business Proof</span>
            <span className="pv-badge pv-badge-optional">{bizUploaded ? 'Under Review' : 'Skipped'}</span>
          </div>
        </div>

        <div className="pv-success-actions">
          <Button variant="primary" fullWidth size="lg"
            onClick={() => navigate('/provider/dashboard', { state: { types: selectedTypes } })}>
            Go to Dashboard
          </Button>
          <p className="pv-note">You can start setting up while verification is in progress</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pv-page" id="provider-verification">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>Verification</h1>
      </div>

      <div className="pv-body">
        <div className="pv-hero-icon">
          <Shield size={36} />
        </div>
        <h2>Verify your identity</h2>
        <p className="pv-subtitle">This helps build trust with students on the platform</p>

        <div className="pv-uploads">
          <div className={`pv-upload-card ${idUploaded ? 'uploaded' : ''}`}>
            <div className="pv-upload-left">
              <span className="pv-upload-emoji">🪪</span>
              <div>
                <h3>ID Proof <span className="pv-required">Required</span></h3>
                <p>Aadhaar Card or PAN Card</p>
              </div>
            </div>
            <button className="pv-upload-btn" onClick={() => setIdUploaded(true)}>
              {idUploaded ? <CheckCircle2 size={20} /> : <Upload size={18} />}
            </button>
          </div>

          <div className={`pv-upload-card ${bizUploaded ? 'uploaded' : ''}`}>
            <div className="pv-upload-left">
              <span className="pv-upload-emoji">📄</span>
              <div>
                <h3>Business Proof <span className="pv-optional">Optional</span></h3>
                <p>GST, Trade License, or Shop Act</p>
              </div>
            </div>
            <button className="pv-upload-btn" onClick={() => setBizUploaded(true)}>
              {bizUploaded ? <CheckCircle2 size={20} /> : <Upload size={18} />}
            </button>
          </div>
        </div>

        <div className="pv-trust-points">
          <h3>Why verify?</h3>
          <div className="pv-trust-item"><span>✅</span> Verified badge on your listings</div>
          <div className="pv-trust-item"><span>📈</span> Higher visibility to students</div>
          <div className="pv-trust-item"><span>🔒</span> Secure & trusted platform</div>
        </div>
      </div>

      <div className="pv-footer">
        <Button
          variant="accent"
          fullWidth
          size="lg"
          disabled={!idUploaded}
          onClick={() => setStep('submitted')}
        >
          Submit for Verification
        </Button>
        <button className="pv-skip" onClick={() => navigate('/provider/dashboard', { state: { types: selectedTypes } })}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
