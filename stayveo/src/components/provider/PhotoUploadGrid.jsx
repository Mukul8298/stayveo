import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Star, Trash2, RotateCcw } from 'lucide-react';
import { uploadImage } from '../../lib/storage';
import './ServiceManagement.css';

const MAX_IMAGES = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 7 * 1024 * 1024;

export default function PhotoUploadGrid({
  images = [],
  coverImage = '',
  onChange,
  providerId,
  serviceType,
  listingId = 'draft',
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lastFiles, setLastFiles] = useState([]);

  const commitImages = (nextImages, nextCover = coverImage) => {
    onChange?.({
      images: nextImages,
      coverImage: nextCover || nextImages[0] || '',
    });
  };

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }

    const validFiles = files.slice(0, remaining).filter((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) return false;
      if (file.size > MAX_SIZE) return false;
      return true;
    });

    if (!validFiles.length) {
      setError('Upload JPEG, PNG, or WebP images below 7 MB.');
      return;
    }

    setLastFiles(validFiles);
    setUploading(true);
    setError('');

    try {
      const uploaded = [];
      for (const file of validFiles) {
        const result = await uploadImage({
          file,
          providerId,
          listingId,
          serviceType,
          imageId: crypto.randomUUID?.() || `${Date.now()}-${file.name}`,
        });
        uploaded.push(result.publicUrl);
      }
      commitImages([...images, ...uploaded], coverImage || uploaded[0]);
    } catch (err) {
      setError(err.message || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url) {
    const nextImages = images.filter((image) => image !== url);
    commitImages(nextImages, coverImage === url ? nextImages[0] : coverImage);
  }

  function handleDrop(event) {
    event.preventDefault();
    uploadFiles(event.dataTransfer.files);
  }

  return (
    <div className="svc-upload">
      <div
        className="svc-upload-grid"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        {images.map((url) => (
          <div key={url} className="svc-upload-thumb">
            <img src={url} alt="Uploaded service" />
            {coverImage === url && <span className="svc-cover-badge">Cover</span>}
            <div className="svc-upload-actions">
              <button type="button" onClick={() => commitImages(images, url)} title="Make cover">
                <Star size={14} />
              </button>
              <button type="button" onClick={() => removeImage(url)} title="Remove image">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <button
            type="button"
            className="svc-upload-add"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 size={20} className="spinning" /> : <ImagePlus size={22} />}
            <span>{uploading ? 'Uploading' : 'Add photos'}</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        className="svc-hidden-file"
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        onChange={(event) => uploadFiles(event.target.files)}
      />

      <p className="svc-upload-hint">Drag & drop up to 5 images. Client-side compression hook is reserved here.</p>
      {error && (
        <div className="svc-upload-error">
          <span>{error}</span>
          {!!lastFiles.length && (
            <button type="button" onClick={() => uploadFiles(lastFiles)}>
              <RotateCcw size={13} /> Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
