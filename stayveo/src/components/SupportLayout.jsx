import { ArrowLeft, Bug, GraduationCap, Heart, Lightbulb, Mail, MessageCircle, Star, Users, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FAQAccordion from './FAQAccordion';
import { getFaqsForRole } from '../data/supportFaqs';
import './SupportLayout.css';

const SUPPORT_EMAIL = 'stayveo@gmail.com';

export default function SupportLayout({ role = 'student' }) {
  const navigate = useNavigate();
  const faqs = useMemo(() => getFaqsForRole(role), [role]);
  const isProvider = role === 'provider';
  const productLabel = isProvider ? 'StayVeo for Providers' : 'StayVeo for Students';
  const contactSubject = isProvider ? 'Provider support request' : 'Student support request';

  return (
    <div className="support-page" id={`${role}-help-support`}>
      {role !== 'provider' && (
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h1>Help & Support</h1>
        </div>
      )}

      <div className="support-content">
        <section className="support-founder-card">
          <div className="support-founder-avatar">M</div>
          <div className="support-founder-text">
            <div className="support-founder-tag">From the Founder</div>
            <h2>Mukul</h2>
            <p className="support-founder-role">Founder of StayVeo</p>
            <p className="support-founder-college">
              <GraduationCap size={14} />
              Mathematics Honours Student · Shivaji College, Delhi University
            </p>
            <p className="support-founder-bio">
              StayVeo is being built from a student lens: safer rooms, clearer pricing,
              direct provider access, and fewer uncertain WhatsApp loops.
            </p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="support-founder-email">
              <Mail size={14} />
              {SUPPORT_EMAIL}
            </a>
          </div>
        </section>

        <section className="support-section">
          <h3 className="support-section-title">Support Contact</h3>
          <div className="support-contact-grid">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(contactSubject)}`} className="support-action">
              <Mail size={20} />
              <div>
                <strong>Email Support</strong>
                <span>Get help from the StayVeo team</span>
              </div>
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Bug report')}`} className="support-action">
              <Bug size={20} />
              <div>
                <strong>Report a Bug</strong>
                <span>Share broken flows or incorrect data</span>
              </div>
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('StayVeo feedback')}`} className="support-action">
              <Lightbulb size={20} />
              <div>
                <strong>Send Feedback</strong>
                <span>Help shape what we build next</span>
              </div>
            </a>
          </div>
        </section>

        <section className="support-section">
          <h3 className="support-section-title">Our Mission</h3>
          <div className="support-mission-grid">
            <div className="support-mission-item">
              <div className="support-mission-icon support-mission-heart"><Heart size={20} /></div>
              <div><h4>Student First</h4><p>Every decision should make student life easier and safer.</p></div>
            </div>
            <div className="support-mission-item">
              <div className="support-mission-icon support-mission-users"><Users size={20} /></div>
              <div><h4>Local Trust</h4><p>We connect real students with real local providers.</p></div>
            </div>
            <div className="support-mission-item">
              <div className="support-mission-icon support-mission-star"><Star size={20} /></div>
              <div><h4>Quality Over Quantity</h4><p>Clear details and verified signals matter more than endless listings.</p></div>
            </div>
            <div className="support-mission-item">
              <div className="support-mission-icon support-mission-zap"><Zap size={20} /></div>
              <div><h4>Built for Speed</h4><p>From discovery to confirmation without days of back-and-forth.</p></div>
            </div>
          </div>
        </section>

        <section className="support-section support-about">
          <h3 className="support-section-title">App Information</h3>
          <p>
            StayVeo is a student housing ecosystem for rooms, roommates, and tiffin
            services around college life.
          </p>
          <div className="support-stats-row">
            <div><strong>DU-first</strong><span>Campus focused</span></div>
            <div className="support-stat-line" />
            <div><strong>Direct</strong><span>No broker-first flow</span></div>
            <div className="support-stat-line" />
            <div><strong>Beta</strong><span>Feedback led</span></div>
          </div>
        </section>

        <section className="support-contact-card">
          <MessageCircle size={20} />
          <div>
            <h4>Need help with something?</h4>
            <p>Email us directly. Mukul personally reads every message.</p>
          </div>
          <a href={`mailto:${SUPPORT_EMAIL}`}>Email Us</a>
        </section>

        <section className="support-section">
          <h3 className="support-section-title">Frequently Asked Questions</h3>
          <FAQAccordion items={faqs} />
        </section>

        <footer className="support-version">
          <span>{productLabel}</span>
          <span>·</span>
          <span>v1.0 Beta</span>
          <span>·</span>
          <span>Made in Delhi</span>
        </footer>
      </div>
    </div>
  );
}
