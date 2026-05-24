// ─── Help & Support Page ─────────────────────────────────────────────────
// Professional founder/about page + support contact.
// This page builds trust — providers need to know WHO is behind StayVeo
// before they commit their business to the platform.
// ─────────────────────────────────────────────────────────────────────────

import { ArrowLeft, Mail, GraduationCap, Star, Heart, Zap, Users, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ProviderHelp.css';

const FAQ = [
  {
    q: 'How do I get my first booking?',
    a: 'Complete your onboarding fully — add photos, set your pricing, and verify your listing. Listings with photos get 3x more enquiries.',
  },
  {
    q: 'How long does profile verification take?',
    a: 'Profile verification is currently being set up. Your listing is live and discoverable immediately after onboarding.',
  },
  {
    q: 'When and how do I get paid?',
    a: 'Payouts are processed monthly via bank transfer. Bank Details setup is coming soon — your earnings are tracked in real-time.',
  },
  {
    q: 'Can I offer multiple services?',
    a: 'Yes! You can offer PG rooms, tiffin, laundry, and cleaning all under one account. Each service has its own dashboard.',
  },
  {
    q: 'What if a student cancels?',
    a: 'Our cancellation policy is being finalised. Reach out to support at stayveo@gmail.com for any urgent booking disputes.',
  },
];

export default function ProviderHelp() {
  const navigate = useNavigate();

  return (
    <div className="ph-page" id="provider-help">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>Help & Support</h1>
      </div>

      <div className="ph-content">

        {/* ── Founder Card ──────────────────────────────────────── */}
        <div className="ph-founder-card">
          <div className="ph-founder-avatar">M</div>
          <div className="ph-founder-text">
            <div className="ph-founder-tag">👋 From the Founder</div>
            <h2>Hi, I'm Mukul</h2>
            <p className="ph-founder-college">
              <GraduationCap size={13} />
              BSc Mathematics · Shivaji College, University of Delhi
            </p>
            <p className="ph-founder-bio">
              I built StayVeo because I watched thousands of students struggle every year to find safe,
              affordable accommodation near campus — while great local providers had no digital presence.
              I'm a student myself, and I'm building this platform for both of us.
            </p>
            <a
              href="mailto:stayveo@gmail.com"
              className="ph-founder-email"
            >
              <Mail size={14} />
              stayveo@gmail.com
            </a>
          </div>
        </div>

        {/* ── Mission ───────────────────────────────────────────── */}
        <div className="ph-section">
          <h3 className="ph-section-title">Our Mission</h3>
          <div className="ph-mission-grid">
            <div className="ph-mission-item">
              <div className="ph-mission-icon" style={{ background: '#EEF2FF', color: '#6366F1' }}>
                <Heart size={20} />
              </div>
              <div>
                <h4>Student First</h4>
                <p>Every product decision starts with one question: does this make a student's life easier?</p>
              </div>
            </div>
            <div className="ph-mission-item">
              <div className="ph-mission-icon" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                <Users size={20} />
              </div>
              <div>
                <h4>Provider Growth</h4>
                <p>We succeed when you succeed. Our goal is to fill your rooms and grow your business — not just list it.</p>
              </div>
            </div>
            <div className="ph-mission-item">
              <div className="ph-mission-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                <Star size={20} />
              </div>
              <div>
                <h4>Quality Over Quantity</h4>
                <p>We verify providers and build trust systems so students book with confidence.</p>
              </div>
            </div>
            <div className="ph-mission-item">
              <div className="ph-mission-icon" style={{ background: '#F0F9FF', color: '#0EA5E9' }}>
                <Zap size={20} />
              </div>
              <div>
                <h4>Built for Speed</h4>
                <p>From enquiry to booking confirmation in minutes — not days of WhatsApp back-and-forth.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── About StayVeo ─────────────────────────────────────── */}
        <div className="ph-section ph-about">
          <h3 className="ph-section-title">About StayVeo</h3>
          <p>
            StayVeo is a hyperlocal student housing marketplace built for the 4 million+ students studying
            in Delhi University colleges. We connect verified PG owners, tiffin providers, laundry services,
            and cleaning services directly with students — eliminating brokers and reducing the friction
            of student life.
          </p>
          <p>
            We're at the beginning of a long journey. Your feedback directly shapes the product.
            Every feature request, every complaint, and every success story matters.
          </p>
          <div className="ph-stats-row">
            <div className="ph-stat">
              <span className="ph-stat-num">4M+</span>
              <span>Students in DU</span>
            </div>
            <div className="ph-stat-line" />
            <div className="ph-stat">
              <span className="ph-stat-num">100+</span>
              <span>Colleges</span>
            </div>
            <div className="ph-stat-line" />
            <div className="ph-stat">
              <span className="ph-stat-num">0</span>
              <span>Brokers needed</span>
            </div>
          </div>
        </div>

        {/* ── Contact ───────────────────────────────────────────── */}
        <div className="ph-contact-card">
          <MessageCircle size={20} />
          <div className="ph-contact-text">
            <h4>Need help with something?</h4>
            <p>Email us directly — Mukul personally reads every message.</p>
          </div>
          <a href="mailto:stayveo@gmail.com" className="ph-contact-btn">
            Email Us
          </a>
        </div>

        {/* ── FAQ ───────────────────────────────────────────────── */}
        <div className="ph-section">
          <h3 className="ph-section-title">Frequently Asked Questions</h3>
          <div className="ph-faq-list">
            {FAQ.map((item, i) => (
              <details key={i} className="ph-faq-item">
                <summary className="ph-faq-question">
                  {item.q}
                </summary>
                <p className="ph-faq-answer">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* ── Version ───────────────────────────────────────────── */}
        <div className="ph-version">
          <span>StayVeo for Providers</span>
          <span>·</span>
          <span>v1.0 Beta</span>
          <span>·</span>
          <span>Made with ❤️ in Delhi</span>
        </div>
      </div>
    </div>
  );
}
