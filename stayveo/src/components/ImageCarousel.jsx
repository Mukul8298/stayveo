import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ImageCarousel.css';

export default function ImageCarousel({ images }) {
  const [current, setCurrent] = useState(0);
  const prev = () => setCurrent(c => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent(c => (c === images.length - 1 ? 0 : c + 1));

  return (
    <div className="carousel">
      <div className="carousel-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {images.map((img, i) => (
          <img key={i} src={img} alt={`Slide ${i + 1}`} className="carousel-slide" loading="lazy" />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button className="carousel-btn carousel-prev" onClick={prev}><ChevronLeft size={20} /></button>
          <button className="carousel-btn carousel-next" onClick={next}><ChevronRight size={20} /></button>
          <div className="carousel-dots">
            {images.map((_, i) => (
              <span key={i} className={`carousel-dot ${i === current ? 'active' : ''}`} onClick={() => setCurrent(i)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
