import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, X, CheckCircle2, Camera, MapPin, ImagePlus, AlertCircle } from 'lucide-react';
import Button from '../../components/Button';
import LocationPicker from '../../components/maps/LocationPicker';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import { uploadImage, removeImageFromStorage } from '../../lib/storage';
import {
  saveBasicInfo,
  saveServices,
  saveServiceDetails,
  verifyIdentity,
} from '../../api/provider';
import './ProviderOnboarding.css';

// ── Constants ────────────────────────────────────────────────────────────
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ── Service configs ─────────────────────────────────────────────────────
const SERVICE_CONFIG = {
  PG: { emoji: '🏠', label: 'PG / Hostel', desc: 'Rooms & accommodation' },
  TIFFIN: { emoji: '🍱', label: 'Tiffin', desc: 'Meal delivery service' },
  LAUNDRY: { emoji: '🧺', label: 'Laundry', desc: 'Wash & fold service' },
  CLEANING: { emoji: '🧹', label: 'Cleaning', desc: 'Room cleaning service' },
};

const AMENITY_OPTIONS = ['WiFi', 'AC', 'Food', 'Laundry', 'Geyser', 'Parking', 'CCTV', 'Study Hall', 'Power Backup'];

// ── Dynamic form definitions ────────────────────────────────────────────
function getServiceFields(type) {
  switch (type) {
    case 'PG': return [
      { key: 'pgName', label: 'PG Name', type: 'text', placeholder: 'e.g. Sunshine PG for Boys', required: true },
      { key: 'address', label: 'Full Address', type: 'text', placeholder: 'Address with landmark', required: true },
      { key: 'roomType', label: 'Room Type', type: 'text', placeholder: 'e.g. Single / Shared (2) / Triple', required: true },
      { key: 'minPrice', label: 'Min Price (₹/month)', type: 'number', placeholder: '4000', required: true },
      { key: 'amenities', label: 'Amenities', type: 'chips', options: AMENITY_OPTIONS },
      { key: 'photos', label: 'Photos', type: 'photos' },
    ];
    case 'TIFFIN': return [
      { key: 'name', label: 'Kitchen Name', type: 'text', placeholder: 'e.g. Maa Bhojan Kitchen', required: true },
      { key: 'price', label: 'Monthly Price (₹)', type: 'number', placeholder: '2800', required: true },
      { key: 'mealsPerDay', label: 'Meals Per Day', type: 'number', placeholder: '2', required: true },
      { key: 'photos', label: 'Photos', type: 'photos' },
    ];
    case 'LAUNDRY': return [
      { key: 'pricing', label: 'Pricing Details', type: 'text', placeholder: 'e.g. ₹149/kg or ₹999/month', required: true },
      { key: 'photos', label: 'Photos', type: 'photos' },
    ];
    case 'CLEANING': return [
      { key: 'pricing', label: 'Pricing Details', type: 'text', placeholder: 'e.g. ₹299/visit basic, ₹599 deep clean', required: true },
      { key: 'photos', label: 'Photos', type: 'photos' },
    ];
    default: return [];
  }
}

// ── Generate unique ID for uploaded images ───────────────────────────────
let imageIdCounter = 0;
function generateImageId() {
  return `img_${Date.now()}_${++imageIdCounter}`;
}

function createPhotoFingerprint(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function getPhotoServiceKey(serviceType) {
  return serviceType.toLowerCase();
}

function getUploadFolderId(provider) {
  return provider.providerId || provider.phone || 'anonymous-provider';
}

export default function ProviderOnboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const { provider, updateProvider } = useProvider();

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Basic info form
  const [name, setName] = useState(provider.name || '');
  const [email, setEmail] = useState(provider.email || '');

  // Service selection
  const [selectedServices, setSelectedServices] = useState(provider.services || []);

  // Service details: { PG: { pgName, address, ... }, TIFFIN: { name, price, ... } }
  const [serviceData, setServiceData] = useState({});
  const [chipSelections, setChipSelections] = useState({});

  // ── Image upload state ───────────────────────────────────────────────
  // { PG: [{ id, file, previewUrl, uploadedUrl, storagePath, uploading, error, metadata }] }
  const [uploadedPhotos, setUploadedPhotos] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const uploadedPhotosRef = useRef({});
  const uploadSessionIdRef = useRef(crypto.randomUUID());

  // ── Service-specific location state ─────────────────────────────────
  // { PG: { latitude, longitude, address }, TIFFIN: {...}, LAUNDRY: {...}, CLEANING: {...} }
  const [serviceLocations, setServiceLocations] = useState({});

  // Verification
  const [aadharNumber, setAadharNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // ── Build steps dynamically ───────────────────────────────────────────
  const allSteps = useMemo(() => {
    const steps = [
      { key: 'basic-info', title: 'Basic Information', icon: '📋', subtitle: 'Tell us about yourself' },
      { key: 'services', title: 'Select Services', icon: '🧩', subtitle: 'What do you provide?' },
    ];
    selectedServices.forEach((svc) => {
      const cfg = SERVICE_CONFIG[svc];
      steps.push({
        key: `details-${svc}`,
        serviceType: svc,
        title: `${cfg.label} Details`,
        icon: cfg.emoji,
        subtitle: `Set up your ${cfg.label.toLowerCase()} service`,
      });
    });
    steps.push({ key: 'verify', title: 'Identity Verification', icon: '🔐', subtitle: 'Verify your identity' });
    return steps;
  }, [selectedServices]);

  const currentStep = allSteps[stepIndex];
  const totalSteps = allSteps.length;
  const progress = ((stepIndex + 1) / totalSteps) * 100;
  const currentStepPhotos = currentStep?.serviceType ? uploadedPhotos[currentStep.serviceType] || [] : [];
  const currentStepUploading = currentStepPhotos.some((photo) => photo.uploading);

  // ── Helpers ───────────────────────────────────────────────────────────
  const updateServiceField = (type, field, value) => {
    setServiceData((prev) => ({
      ...prev,
      [type]: { ...(prev[type] || {}), [field]: value },
    }));
  };

  const toggleChip = (fieldKey, option) => {
    setChipSelections((prev) => {
      const curr = prev[fieldKey] || [];
      return {
        ...prev,
        [fieldKey]: curr.includes(option) ? curr.filter((o) => o !== option) : [...curr, option],
      };
    });
  };

  const toggleService = (svc) => {
    setSelectedServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  };

  useEffect(() => {
    uploadedPhotosRef.current = uploadedPhotos;
  }, [uploadedPhotos]);

  useEffect(() => {
    return () => {
      Object.values(uploadedPhotosRef.current).flat().forEach((photo) => {
        if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      });
    };
  }, []);

  // ── NEW: Image Upload Handlers ────────────────────────────────────────

  /**
   * Validates selected files, creates instant previews, uploads to Supabase
   * Storage, and writes the public URLs back into each photo object.
   */
  const handleImageUpload = useCallback((serviceType, files) => {
    const currentPhotos = uploadedPhotos[serviceType] || [];
    const remainingSlots = MAX_PHOTOS - currentPhotos.length;

    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    const existingFingerprints = new Set(
      currentPhotos.map((photo) => photo.metadata?.fingerprint).filter(Boolean)
    );
    const batchFingerprints = new Set();
    const photoItems = [];

    for (const file of Array.from(files).slice(0, remainingSlots)) {
      // Validate file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only JPG, PNG, WebP allowed`);
        continue;
      }
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File too large (max 5MB)`);
        continue;
      }

      const fingerprint = createPhotoFingerprint(file);
      if (existingFingerprints.has(fingerprint) || batchFingerprints.has(fingerprint)) {
        toast.error(`${file.name}: This photo is already selected`);
        continue;
      }

      batchFingerprints.add(fingerprint);
      photoItems.push({
        id: generateImageId(),
        file,
        previewUrl: URL.createObjectURL(file),
        uploadedUrl: '',
        storagePath: '',
        uploading: true,
        error: '',
        metadata: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          fingerprint,
        },
      });
    }

    if (photoItems.length > 0) {
      setUploadedPhotos((prev) => ({
        ...prev,
        [serviceType]: [...(prev[serviceType] || []), ...photoItems],
      }));
      toast.success(`${photoItems.length} photo${photoItems.length > 1 ? 's' : ''} selected`);

      photoItems.forEach(async (photo) => {
        try {
          const result = await uploadImage({
            file: photo.file,
            providerId: getUploadFolderId(provider),
            listingId: uploadSessionIdRef.current,
            serviceType: getPhotoServiceKey(serviceType),
            imageId: photo.id,
          });

          setUploadedPhotos((prev) => ({
            ...prev,
            [serviceType]: (prev[serviceType] || []).map((item) =>
              item.id === photo.id
                ? {
                  ...item,
                  uploadedUrl: result.publicUrl,
                  storagePath: result.storagePath,
                  uploading: false,
                  error: '',
                }
                : item
            ),
          }));
        } catch (uploadError) {
          setUploadedPhotos((prev) => ({
            ...prev,
            [serviceType]: (prev[serviceType] || []).map((item) =>
              item.id === photo.id
                ? {
                  ...item,
                  uploading: false,
                  error: uploadError.message || 'Upload failed',
                }
                : item
            ),
          }));
          toast.error(`${photo.metadata.name}: ${uploadError.message || 'Upload failed'}`);
        }
      });
    }
  }, [provider, toast, uploadedPhotos]);

  /**
   * Removes an uploaded image by its ID.
   * Revokes the object URL to free memory.
   */
  const handleRemoveImage = useCallback(async (serviceType, imageId) => {
    let removedPhoto;

    setUploadedPhotos((prev) => {
      const photos = prev[serviceType] || [];
      const photo = photos.find((p) => p.id === imageId);
      removedPhoto = photo;
      // Clean up the preview blob URL
      if (photo?.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return {
        ...prev,
        [serviceType]: photos.filter((p) => p.id !== imageId),
      };
    });

    if (removedPhoto?.storagePath) {
      try {
        await removeImageFromStorage(removedPhoto.storagePath);
      } catch (removeError) {
        toast.error(removeError.message || 'Photo removed locally, but storage cleanup failed');
      }
    }
  }, [toast]);

  const handleRetryUpload = useCallback(async (serviceType, imageId) => {
    const photo = (uploadedPhotos[serviceType] || []).find((item) => item.id === imageId);
    if (!photo?.file) return;

    setUploadedPhotos((prev) => ({
      ...prev,
      [serviceType]: (prev[serviceType] || []).map((item) =>
        item.id === imageId ? { ...item, uploading: true, error: '' } : item
      ),
    }));

    try {
      const result = await uploadImage({
        file: photo.file,
        providerId: getUploadFolderId(provider),
        listingId: uploadSessionIdRef.current,
        serviceType: getPhotoServiceKey(serviceType),
        imageId: photo.id,
      });

      setUploadedPhotos((prev) => ({
        ...prev,
        [serviceType]: (prev[serviceType] || []).map((item) =>
          item.id === imageId
            ? {
              ...item,
              uploadedUrl: result.publicUrl,
              storagePath: result.storagePath,
              uploading: false,
              error: '',
            }
            : item
        ),
      }));
    } catch (uploadError) {
      setUploadedPhotos((prev) => ({
        ...prev,
        [serviceType]: (prev[serviceType] || []).map((item) =>
          item.id === imageId
            ? { ...item, uploading: false, error: uploadError.message || 'Upload failed' }
            : item
        ),
      }));
      toast.error(`${photo.metadata.name}: ${uploadError.message || 'Upload failed'}`);
    }
  }, [provider, toast, uploadedPhotos]);

  /**
   * Opens the hidden file input to select images.
   * Called when a user clicks on an empty upload slot.
   */
  const handleSlotClick = useCallback((serviceType) => {
    // Store the service type on the input so the change handler knows which service
    if (fileInputRef.current) {
      fileInputRef.current.dataset.serviceType = serviceType;
      fileInputRef.current.click();
    }
  }, []);

  /**
   * Handles the file input change event.
   */
  const handleFileInputChange = useCallback((e) => {
    const serviceType = e.target.dataset.serviceType;
    if (serviceType && e.target.files.length > 0) {
      handleImageUpload(serviceType, e.target.files);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [handleImageUpload]);

  // ── Drag & Drop Handlers ──────────────────────────────────────────────
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((serviceType, e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(serviceType, e.dataTransfer.files);
    }
  }, [handleImageUpload]);

  // ── Mapbox Location Handler ───────────────────────────────────────────
  const handleLocationChange = useCallback((serviceType, location) => {
    // TODO: Reverse geocode location.latitude/location.longitude into a clean postal address.
    // TODO: Auto-fill/confirm the address field after the provider accepts the geocoded result.
    // TODO: Add service availability zones and radius checks around this coordinate.
    setServiceLocations((prev) => ({
      ...prev,
      [serviceType]: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || '',
        source: location.source,
      },
    }));
  }, []);

  // ── Step Handlers ─────────────────────────────────────────────────────
  const handleNext = async () => {
    setError('');
    setLoading(true);

    try {
      switch (currentStep.key) {
        case 'basic-info': {
          if (!name.trim()) throw new Error('Name is required');
          await saveBasicInfo({ name: name.trim(), phone: provider.phone, email: email.trim() || undefined });
          updateProvider({ name: name.trim(), email: email.trim() });
          toast.success('Basic info saved ✓');
          break;
        }
        case 'services': {
          if (selectedServices.length === 0) throw new Error('Select at least one service');
          await saveServices(provider.phone, selectedServices);
          updateProvider({ services: selectedServices });
          toast.success(`${selectedServices.length} service(s) saved ✓`);
          break;
        }
        case 'verify': {
          if (!aadharNumber.trim()) throw new Error('Aadhar number is required');
          await verifyIdentity(provider.phone, 'AADHAR', aadharNumber.trim());
          if (panNumber.trim()) {
            await verifyIdentity(provider.phone, 'PAN', panNumber.trim());
          }
          updateProvider({ isVerified: true });
          toast.success('Identity verified ✓');
          break;
        }
        default: {
          // Dynamic service detail steps
          if (currentStep.serviceType) {
            const type = currentStep.serviceType;
            const fields = getServiceFields(type);
            const data = { ...(serviceData[type] || {}) };

            // Merge chip selections (amenities)
            if (chipSelections[`${type}-amenities`]) {
              data.amenities = chipSelections[`${type}-amenities`];
            }

            // Validate required fields
            for (const f of fields) {
              if (f.required && !data[f.key]) {
                throw new Error(`${f.label} is required`);
              }
            }

            // Coerce numbers
            if (data.minPrice) data.minPrice = Number(data.minPrice);
            if (data.price) data.price = Number(data.price);
            if (data.mealsPerDay) data.mealsPerDay = Number(data.mealsPerDay);

            // ── Attach uploaded photo URLs ────────────────────────
            // PostgreSQL stores URLs only; the binary files live in Supabase Storage.
            const photos = uploadedPhotos[type] || [];
            if (photos.some((photo) => photo.uploading)) {
              throw new Error('Please wait for all photos to finish uploading');
            }
            const failedPhoto = photos.find((photo) => photo.error);
            if (failedPhoto) {
              throw new Error(`${failedPhoto.metadata.name} failed to upload. Remove it or try again.`);
            }
            data.photos = photos.map((photo) => photo.uploadedUrl).filter(Boolean);

            // ── Attach Mapbox geolocation data ───────────────────
            // TODO: Use these coordinates for distance filters, nearby colleges, and map search.
            const selectedLocation = serviceLocations[type];
            if (
              typeof selectedLocation?.latitude === 'number' &&
              typeof selectedLocation?.longitude === 'number'
            ) {
              data.latitude = selectedLocation.latitude;
              data.longitude = selectedLocation.longitude;
            }

            await saveServiceDetails(provider.phone, type, data);
            toast.success(`${SERVICE_CONFIG[type].label} details saved ✓`);
          }
        }
      }

      // Advance to next step or finish
      if (stepIndex < totalSteps - 1) {
        setStepIndex((s) => s + 1);
      } else {
        // Onboarding complete!
        setStepIndex(totalSteps); // triggers success view
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((s) => s - 1);
    else navigate(-1);
    setError('');
  };

  // ── Render: Photo Upload Grid (5-slot: 3 + 2 layout) ─────────────────
  const renderPhotoUpload = (serviceType) => {
    const photos = uploadedPhotos[serviceType] || [];
    const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] || null);

    return (
      <div className="po-upload-section" id={`upload-${serviceType}`}>
        {/* Section Header */}
        <div className="po-upload-header">
          <div className="po-upload-header-text">
            <h3>Property Photos</h3>
            <p>Upload up to {MAX_PHOTOS} photos of your property</p>
          </div>
          <span className="po-upload-counter">
            {photos.length}/{MAX_PHOTOS}
          </span>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        {/* 5-Slot Upload Grid with drag-and-drop */}
        <div
          className={`po-upload-grid ${isDragging ? 'dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(serviceType, e)}
        >
          {slots.map((photo, index) => (
            <div
              key={photo ? photo.id : `empty-${index}`}
              className={`po-upload-slot ${photo ? 'filled' : 'empty'}`}
              onClick={() => !photo && handleSlotClick(serviceType)}
              id={`upload-slot-${serviceType}-${index}`}
            >
              {photo ? (
                <>
                  {/* Filled slot: image preview */}
                  <img
                    src={photo.previewUrl}
                    alt={photo.metadata.name}
                    className="po-upload-preview"
                  />
                  <div className="po-upload-overlay">
                    <span className="po-upload-filename">{photo.metadata.name}</span>
                  </div>
                  {photo.uploading && (
                    <div className="po-upload-status">
                      <Loader2 size={18} className="spin" />
                      <span>Uploading</span>
                    </div>
                  )}
                  {!photo.uploading && photo.uploadedUrl && !photo.error && (
                    <div className="po-upload-success" aria-label="Uploaded">
                      <Check size={13} strokeWidth={3} />
                    </div>
                  )}
                  {photo.error && (
                    <div className="po-upload-error-state">
                      <AlertCircle size={17} />
                      <span>{photo.error}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryUpload(serviceType, photo.id);
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  <button
                    className="po-upload-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(serviceType, photo.id);
                    }}
                    aria-label="Remove photo"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <>
                  {/* Empty slot: upload placeholder */}
                  <div className="po-upload-slot-inner">
                    {index === 0 && photos.length === 0 ? (
                      <>
                        <ImagePlus size={28} className="po-upload-slot-icon-main" />
                        <span className="po-upload-slot-label">Add Cover Photo</span>
                      </>
                    ) : (
                      <>
                        <Camera size={22} className="po-upload-slot-icon" />
                        <span className="po-upload-slot-label">Add Photo</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Drag-and-drop hint + format info */}
        <div className="po-upload-footer">
          <p className="po-upload-hint">
            <ImagePlus size={14} />
            Drag & drop photos here or click any slot to browse
          </p>
          <p className="po-upload-formats">JPG, PNG, WebP • Max 5MB each</p>
        </div>
      </div>
    );
  };

  // ── Render: Mapbox Location Picker ────────────────────────────────────
  const renderMapSection = (serviceType) => {
    const serviceLabel = SERVICE_CONFIG[serviceType]?.label || 'Service';

    return (
      <div className="po-map-section" id={`map-${serviceType}`}>
        <div className="po-map-header">
          <h3>
            <MapPin size={18} />
            Exact Location
          </h3>
          <p>Click the map or use GPS to pin your {serviceLabel.toLowerCase()} location</p>
        </div>

        <LocationPicker
          latitude={serviceLocations[serviceType]?.latitude}
          longitude={serviceLocations[serviceType]?.longitude}
          address={serviceLocations[serviceType]?.address || serviceData[serviceType]?.address || ''}
          onChange={(location) => handleLocationChange(serviceType, location)}
        />

        {typeof serviceLocations[serviceType]?.latitude === 'number' &&
          typeof serviceLocations[serviceType]?.longitude === 'number' && (
            <div className="po-map-coords">
              <span>
                Selected: {serviceLocations[serviceType].latitude.toFixed(6)}, {serviceLocations[serviceType].longitude.toFixed(6)}
              </span>
              {serviceLocations[serviceType].address && (
                <span className="po-map-addr">{serviceLocations[serviceType].address}</span>
              )}
            </div>
          )}
      </div>
    );
  };

  // ── Success State ─────────────────────────────────────────────────────
  if (stepIndex >= totalSteps) {
    return (
      <div className="po-page">
        <div className="po-content">
          <div className="po-success">
            <div className="po-success-icon">
              <CheckCircle2 size={44} />
            </div>
            <h1>Welcome, {provider.name}! 🎉</h1>
            <p>Your provider account is set up. You can now manage your services from the dashboard.</p>
            <Button variant="accent" fullWidth size="lg" onClick={() => navigate('/provider/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not OTP-verified. This must stay after hooks to preserve hook order.
  if (!provider.otpVerified) {
    return <Navigate to="/provider/login" replace />;
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="po-page" id="provider-onboarding">
      {/* Top Bar */}
      <div className="po-top-bar">
        <button className="back-btn" onClick={handleBack}><ArrowLeft size={20} /></button>
        <div className="po-step-info">
          <span className="po-step-num">Step {stepIndex + 1} of {totalSteps}</span>
          <span className="po-step-icon">{currentStep.icon}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="po-progress">
        <div className="po-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* Content */}
      <div className="po-content" key={currentStep.key}>
        <h1 className="po-title">{currentStep.title}</h1>
        <p className="po-subtitle">{currentStep.subtitle}</p>

        {error && <div className="po-error">{error}</div>}

        {/* ── BASIC INFO ─────────────────────────────────────── */}
        {currentStep.key === 'basic-info' && (
          <div className="po-fields">
            <div className="po-field">
              <label>Your Name</label>
              <input className="input-field" placeholder="Full name" value={name}
                onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="po-field">
              <label>Phone Number</label>
              <div className="po-phone-row">
                <span className="po-phone-prefix">+91</span>
                <input className="input-field po-input-readonly" value={provider.phone} readOnly />
              </div>
            </div>
            <div className="po-field">
              <label>Email <span className="po-optional">(optional)</span></label>
              <input className="input-field" type="email" placeholder="email@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        )}

        {/* ── SERVICE SELECTION ───────────────────────────────── */}
        {currentStep.key === 'services' && (
          <div className="po-service-grid">
            {Object.entries(SERVICE_CONFIG).map(([key, cfg]) => {
              const isSelected = selectedServices.includes(key);
              return (
                <button key={key} className={`po-service-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleService(key)} id={`svc-${key}`}>
                  {isSelected && (
                    <div className="po-service-check"><Check size={12} strokeWidth={3} /></div>
                  )}
                  <span className="po-service-emoji">{cfg.emoji}</span>
                  <h3>{cfg.label}</h3>
                  <p>{cfg.desc}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* ── DYNAMIC SERVICE DETAILS ─────────────────────────── */}
        {currentStep.serviceType && (
          <div className="po-fields">
            {getServiceFields(currentStep.serviceType).map((field) => {
              const type = currentStep.serviceType;

              if (field.type === 'chips') {
                const chipKey = `${type}-${field.key}`;
                const selected = chipSelections[chipKey] || [];
                return (
                  <div key={field.key} className="po-field">
                    <label>{field.label}</label>
                    <div className="po-chips">
                      {field.options.map((opt) => (
                        <button key={opt} className={`po-chip ${selected.includes(opt) ? 'active' : ''}`}
                          onClick={() => toggleChip(chipKey, opt)}>{opt}</button>
                      ))}
                    </div>
                  </div>
                );
              }

              // ── NEW: Premium Photo Upload + Map Section ─────────
              if (field.type === 'photos') {
                return (
                  <div key={field.key} className="po-field">
                    {/* Image Upload Grid */}
                    {renderPhotoUpload(type)}

                    {/* Map Location Section (PG only) */}
                    {renderMapSection(type)}
                  </div>
                );
              }

              return (
                <div key={field.key} className="po-field">
                  <label>{field.label}{field.required}</label>
                  <input className="input-field" type={field.type} placeholder={field.placeholder}
                    value={serviceData[type]?.[field.key] || ''}
                    onChange={(e) => updateServiceField(type, field.key, e.target.value)} />
                </div>
              );
            })}
          </div>
        )}

        {/* ── IDENTITY VERIFICATION ──────────────────────────── */}
        {currentStep.key === 'verify' && (
          <div className="po-verify-cards">
            <div className="po-verify-card">
              <h3>🪪 Aadhar Card <span className="po-required">Required</span></h3>
              <p>12-digit Aadhar number</p>
              <input className="input-field" placeholder="1234 5678 9012" maxLength={14}
                value={aadharNumber} onChange={(e) => setAadharNumber(e.target.value.replace(/[^0-9 ]/g, ''))} />
            </div>
            <div className="po-verify-card">
              <h3>📄 PAN Card <span className="po-optional" style={{ fontWeight: 400, color: 'var(--neutral-400)', fontSize: '10px' }}>Optional</span></h3>
              <p>10-character PAN number</p>
              <input className="input-field" placeholder="ABCDE1234F" maxLength={10}
                value={panNumber} onChange={(e) => setPanNumber(e.target.value.toUpperCase())} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="po-footer">
        <Button variant="accent" fullWidth size="lg" onClick={handleNext} disabled={loading || currentStepUploading}>
          {loading ? (
            <><Loader2 size={18} className="spin" /> Saving...</>
          ) : currentStepUploading ? (
            <><Loader2 size={18} className="spin" /> Uploading photos...</>
          ) : stepIndex < totalSteps - 1 ? (
            'Next →'
          ) : (
            'Complete Setup ✓'
          )}
        </Button>
      </div>
    </div>
  );
}
