import { useState } from 'react';
import { Bell, Heart, Home, Sparkles, Users } from 'lucide-react';
import { currentUser } from '../data/mockData';
import { useToast } from '../context/ToastContext';
import './RoommateHome.css';

const NOTIFY_STORAGE_KEY = 'stayveo.roommateMatching.notify';

const benefits = [
  { icon: Users, label: 'Better', detail: 'Matches' },
  { icon: Heart, label: 'Shared', detail: 'Interests' },
  { icon: Home, label: 'Compatible', detail: 'Living Styles' },
  { icon: Sparkles, label: 'A More', detail: 'Meaningful Stay' },
];

const fallbackImages = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=640&h=520&fit=crop',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=640&h=520&fit=crop',
];

function readNotificationState() {
  try {
    return localStorage.getItem(NOTIFY_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function RoommateHome() {
  const toast = useToast();
  const [notified, setNotified] = useState(readNotificationState);
  const images = currentUser?.activeRoom?.images?.length ? currentUser.activeRoom.images : fallbackImages;

  function handleNotify() {
    if (notified) return;
    try {
      localStorage.setItem(NOTIFY_STORAGE_KEY, 'true');
    } catch {
      // The toast still confirms the interaction when storage is unavailable.
    }
    setNotified(true);
    toast.success("You're on the list. We'll let you know when Roommate Matching goes live.");
  }

  return (
    <main className="page page-padded rm-page" id="roommate-home">
      <section className="rm-stage" aria-labelledby="roommate-heading">
        <div className="rm-botanical rm-botanical-left" aria-hidden="true">
          <span className="rm-leaf rm-leaf-a" />
          <span className="rm-leaf rm-leaf-b" />
          <span className="rm-leaf rm-leaf-c" />
          <span className="rm-leaf rm-leaf-d" />
        </div>
        <div className="rm-botanical rm-botanical-right" aria-hidden="true">
          <span className="rm-leaf rm-leaf-a" />
          <span className="rm-leaf rm-leaf-b" />
          <span className="rm-leaf rm-leaf-c" />
        </div>

        <div className="rm-polaroid rm-polaroid-one">
          <div className="rm-tape" aria-hidden="true" />
          <img src={images[0]} alt="Warm shared bedroom with natural light" />
          <span>Good People</span>
        </div>
        <div className="rm-polaroid rm-polaroid-two">
          <div className="rm-tape" aria-hidden="true" />
          <img src={images[1] || images[0]} alt="Bright, comfortable student living room" />
          <span>Better Stays</span>
        </div>

        <div className="rm-side-note" aria-hidden="true">
          <span>Same</span>
          <span>Space</span>
          <span>Brighter</span>
          <span>Days</span>
          <small>♡</small>
        </div>

        <div className="rm-side-copy" aria-hidden="true">
          <span>More</span>
          <span>Than Just</span>
          <span>a Room</span>
          <small>♡</small>
        </div>

        <div className="rm-mini-card" aria-hidden="true">
          <strong>Good<br />People</strong>
          <span>Better Stays.</span>
          <small>♡</small>
        </div>

        <div className="rm-content">
          <div className="rm-hero-mark" aria-hidden="true"><Heart size={29} /></div>
          <p className="rm-eyebrow">ROOMMATE MATCHING</p>
          <h1 id="roommate-heading">Find Your<br />Perfect Roommate</h1>
          <p className="rm-coming-soon">Coming Soon</p>
          <p className="rm-description">
            We're building something special to help you find like-minded roommates who match your lifestyle, habits &amp; preferences.
          </p>

          <div className="rm-benefits" aria-label="Roommate matching benefits">
            {benefits.map(({ icon: Icon, label, detail }) => (
              <div className="rm-benefit" key={`${label}-${detail}`}>
                <span className="rm-benefit-icon"><Icon size={20} /></span>
                <span>{label}<br />{detail}</span>
              </div>
            ))}
          </div>

          <button className="rm-notify" type="button" onClick={handleNotify} disabled={notified} aria-pressed={notified}>
            <Bell size={17} />
            <span>{notified ? "You're on the list" : 'Notify Me'}</span>
          </button>
          <p className="rm-notify-caption">Be the first to know when Roommate Matching goes live.</p>
        </div>

        <div className="rm-mobile-polaroids" aria-label="Student living inspiration">
          <div className="rm-polaroid rm-polaroid-mobile-one">
            <img src={images[0]} alt="Warm shared bedroom with natural light" />
            <span>Good People</span>
          </div>
          <div className="rm-polaroid rm-polaroid-mobile-two">
            <img src={images[1] || images[0]} alt="Bright, comfortable student living room" />
            <span>Better Stays</span>
          </div>
        </div>
      </section>
    </main>
  );
}
