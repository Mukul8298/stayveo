import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import RoommateCard from '../components/RoommateCard';
import { roommates } from '../data/mockData';
import './RoommateSwipe.css';

export default function RoommateSwipe() {
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [anim, setAnim] = useState('');
  const [matchFlash, setMatchFlash] = useState(false);

  const handleSwipe = (dir) => {
    setAnim(dir);

    // Show match flash on right swipe (like)
    if (dir === 'swipe-right') {
      setMatchFlash(true);
      setTimeout(() => setMatchFlash(false), 800);
    }

    setTimeout(() => {
      setAnim('');
      if (currentIdx < roommates.length - 1) {
        setCurrentIdx(i => i + 1);
      } else {
        navigate('/roommate/chat');
      }
    }, 400);
  };

  const allDone = currentIdx >= roommates.length;

  return (
    <div className="page swipe-page" id="roommate-swipe">
      {/* Header */}
      <div className="swipe-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="swipe-header-center">
          <h1>Find Roommate</h1>
          <span className="swipe-counter">{Math.min(currentIdx + 1, roommates.length)}/{roommates.length}</span>
        </div>
        <button className="swipe-chat-btn" onClick={() => navigate('/roommate/chat')}>
          <MessageCircle size={20} />
          <span className="swipe-chat-dot" />
        </button>
      </div>

      {/* Progress */}
      <div className="swipe-progress">
        <div className="swipe-progress-bar" style={{ width: `${((currentIdx + 1) / roommates.length) * 100}%` }} />
      </div>

      {/* Match Flash */}
      {matchFlash && (
        <div className="match-flash">
          <span>💜 Interested!</span>
        </div>
      )}

      {/* Card Stack */}
      <div className="swipe-container">
        {!allDone ? (
          <div className="swipe-stack">
            {/* Next card (behind) */}
            {currentIdx + 1 < roommates.length && (
              <div className="swipe-card-behind">
                <div className="behind-photo">
                  <img src={roommates[currentIdx + 1].photo} alt="" draggable="false" />
                </div>
              </div>
            )}
            {/* Current card */}
            <div className={`swipe-card-wrapper ${anim}`}>
              <RoommateCard
                key={roommates[currentIdx].id}
                roommate={roommates[currentIdx]}
                onSwipeLeft={() => handleSwipe('swipe-left')}
                onSwipeRight={() => handleSwipe('swipe-right')}
              />
            </div>
          </div>
        ) : (
          <div className="swipe-done">
            <div className="swipe-done-emoji">🎉</div>
            <h2>All caught up!</h2>
            <p>You've seen everyone. Check your matches to start chatting.</p>
            <button className="swipe-done-btn" onClick={() => navigate('/roommate/chat')}>
              <MessageCircle size={18} /> View Matches
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
