import { useState, useRef } from 'react';
import './RoommateCard.css';

export default function RoommateCard({ roommate, onSwipeLeft, onSwipeRight }) {
  const { name, age, year, branch, compatibility, photo, avatar, traits, bio, interests } = roommate;
  const cardRef = useRef(null);
  const [drag, setDrag] = useState({ startX: 0, currentX: 0, dragging: false });
  const [swipeHint, setSwipeHint] = useState('');

  // Touch/mouse drag handlers for swipe gesture
  const onStart = (clientX) => {
    setDrag({ startX: clientX, currentX: clientX, dragging: true });
  };

  const onMove = (clientX) => {
    if (!drag.dragging) return;
    const diff = clientX - drag.startX;
    setDrag(prev => ({ ...prev, currentX: clientX }));
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${diff}px) rotate(${diff * 0.06}deg)`;
      cardRef.current.style.transition = 'none';
    }
    setSwipeHint(diff > 50 ? 'right' : diff < -50 ? 'left' : '');
  };

  const onEnd = () => {
    const diff = drag.currentX - drag.startX;
    setDrag({ startX: 0, currentX: 0, dragging: false });
    setSwipeHint('');

    if (cardRef.current) {
      cardRef.current.style.transition = 'all 0.4s var(--ease-out)';
    }

    if (diff > 100) {
      onSwipeRight?.();
    } else if (diff < -100) {
      onSwipeLeft?.();
    } else {
      if (cardRef.current) cardRef.current.style.transform = '';
    }
  };

  return (
    <div
      className="hinge-card"
      ref={cardRef}
      id={`roommate-${roommate.id}`}
      onMouseDown={e => onStart(e.clientX)}
      onMouseMove={e => onMove(e.clientX)}
      onMouseUp={onEnd}
      onMouseLeave={() => drag.dragging && onEnd()}
      onTouchStart={e => onStart(e.touches[0].clientX)}
      onTouchMove={e => onMove(e.touches[0].clientX)}
      onTouchEnd={onEnd}
    >
      {/* Swipe Labels */}
      <div className={`hinge-label hinge-label-like ${swipeHint === 'right' ? 'show' : ''}`}>INTERESTED ❤️</div>
      <div className={`hinge-label hinge-label-nope ${swipeHint === 'left' ? 'show' : ''}`}>SKIP ✕</div>

      {/* Large Profile Image */}
      <div className="hinge-photo">
        <img src={photo} alt={name} draggable="false" />
        <div className="hinge-photo-gradient" />
        <div className="hinge-compat-badge">
          <span className="hinge-compat-num">{compatibility}%</span>
          <span className="hinge-compat-text">match</span>
        </div>
      </div>

      {/* Info Section */}
      <div className="hinge-info">
        <div className="hinge-name-row">
          <h3>{name}, {age}</h3>
          <span className="hinge-verified">✓</span>
        </div>
        <p className="hinge-subtitle">{year} • {branch}</p>
        <p className="hinge-bio">{bio}</p>

        {/* Trait Tags */}
        <div className="hinge-tags">
          <span className="hinge-tag">🌙 {traits.sleep}</span>
          <span className="hinge-tag">🍽️ {traits.food}</span>
          <span className="hinge-tag">📚 {traits.study}</span>
          <span className="hinge-tag">🧹 {traits.cleanliness}/5</span>
          <span className="hinge-tag">💬 {traits.social}</span>
        </div>

        {/* Interests */}
        <div className="hinge-interests">
          {interests.map(i => (
            <span key={i} className="hinge-interest">{i}</span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="hinge-actions">
        <button className="hinge-btn hinge-btn-skip" onClick={(e) => { e.stopPropagation(); onSwipeLeft?.(); }}>
          <span>✕</span>
        </button>
        <button className="hinge-btn hinge-btn-like" onClick={(e) => { e.stopPropagation(); onSwipeRight?.(); }}>
          <span>❤️</span>
        </button>
      </div>
    </div>
  );
}
