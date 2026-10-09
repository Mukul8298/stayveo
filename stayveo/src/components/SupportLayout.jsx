import { useState } from 'react';
import { ArrowLeft, Bug, GraduationCap, Heart, Lightbulb, Mail, MessageCircle, Star, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FAQAccordion from './FAQAccordion';
import { providerFaqs } from '../data/providerFaqs';
import { studentFaqs } from '../data/studentFaqs';
import './SupportLayout.css';

const SUPPORT_EMAIL = 'stayveo@gmail.com';

const teamMembers = [
  {
    name: 'Sunny Solanki',
    initials: 'SS',
    education: 'B.Sc. Mathematics (Hons), 3rd Year',
    institution: 'Shivaji College, University of Delhi',
  },
  {
    name: 'Satyam Kumar',
    initials: 'SK',
    education: 'Computer Science Engineering',
    specialization: 'Cloud Computing',
    institution: 'Lovely Professional University',
  },
];

export default function SupportLayout({ role = 'student' }) {
  const navigate = useNavigate();
  const [activeFaqGroup, setActiveFaqGroup] = useState(role === 'provider' ? 'provider' : 'student');
  const isProvider = role === 'provider';
  const productLabel = isProvider ? 'StayVeo for Providers' : 'StayVeo for Students';
  const contactSubject = isProvider ? 'Provider support request' : 'Student support request';
  const faqs = activeFaqGroup === 'provider' ? providerFaqs : studentFaqs;

  return (
    <div className="support-page" id={`${role}-help-support`}>
      {role !== 'provider' && (
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h1>Help &amp; Support</h1>
        </div>
      )}

      <div className="support-content">
        <section className="support-founder-card">
          <div className="support-founder-avatar">M</div>
          <div className="support-founder-text">
            <div className="support-founder-tag">From the Founder</div>
            <h2>Mukul Kumar</h2>
            <p className="support-founder-role">Founder of StayVeo</p>
            <p className="support-founder-college">
              <GraduationCap size={14} />
              <span>B.Sc. Mathematics (Hons), 3rd Year · Shivaji College, University of Delhi</span>
            </p>
            <p className="support-founder-bio">
              StayVeo is being built from a student perspective to make accommodation discovery simpler,
              pricing clearer, and access to providers more convenient.
            </p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="support-founder-email">
              <Mail size={14} />
              {SUPPORT_EMAIL}
            </a>
          </div>
        </section>

        <section className="support-section support-team-section" aria-labelledby="support-team-title">
          <div className="support-section-heading">
            <h3 className="support-section-title" id="support-team-title">Meet the Team Behind StayVeo</h3>
            <p className="support-section-intro">Building a better student living experience, together.</p>
          </div>
          <div className="support-team-grid">
            {teamMembers.map((member) => (
              <article className="support-team-card" key={member.name}>
                <div className="support-team-avatar" aria-hidden="true">{member.initials}</div>
                <div className="support-team-info">
                  <h4>{member.name}</h4>
                  <p>{member.education}</p>
                  {member.specialization && <p>Specialization: {member.specialization}</p>}
                  <p className="support-team-institution">{member.institution}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="support-section" aria-labelledby="support-contact-title">
          <h3 className="support-section-title" id="support-contact-title">Support Contact</h3>
          <div className="support-contact-grid">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(contactSubject)}`} className="support-action">
              <Mail size={20} />
              <div>
                <strong>Email Support</strong>
                <span>Get help from the StayVeo team.</span>
              </div>
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Bug report')}`} className="support-action">
              <Bug size={20} />
              <div>
                <strong>Report a Bug</strong>
                <span>Share broken flows or incorrect data.</span>
              </div>
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('StayVeo feedback')}`} className="support-action">
              <Lightbulb size={20} />
              <div>
                <strong>Send Feedback</strong>
                <span>Help shape what we build next.</span>
              </div>
            </a>
          </div>
          <div className="support-contact-card">
            <MessageCircle size={20} />
            <div>
              <h4>Need help with something?</h4>
              <p>Email us directly for help with your StayVeo account or booking.</p>
            </div>
            <a href={`mailto:${SUPPORT_EMAIL}`}>Email Us</a>
          </div>
        </section>

        <section className="support-section support-faq-section" aria-labelledby="support-faq-title">
          <div className="support-section-heading">
            <h3 className="support-section-title" id="support-faq-title">Help &amp; Support</h3>
            <p className="support-section-intro">
              Welcome to StayVeo Support. Whether you&apos;re looking for a PG, managing a booking, ordering meals or
              running your accommodation business, we&apos;re here to help you navigate StayVeo.
            </p>
          </div>
          <div className="support-faq-tabs" aria-label="Choose whose help topics to view">
            <button
              type="button"
              className={activeFaqGroup === 'student' ? 'is-active' : ''}
              aria-pressed={activeFaqGroup === 'student'}
              onClick={() => setActiveFaqGroup('student')}
            >
              Student Help
            </button>
            <button
              type="button"
              className={activeFaqGroup === 'provider' ? 'is-active' : ''}
              aria-pressed={activeFaqGroup === 'provider'}
              onClick={() => setActiveFaqGroup('provider')}
            >
              Provider Help
            </button>
          </div>
          <FAQAccordion items={faqs} />
        </section>

        <section className="support-section" aria-labelledby="support-mission-title">
          <h3 className="support-section-title" id="support-mission-title">Our Mission</h3>
          <div className="support-mission-grid">
            <div className="support-mission-item">
              <div className="support-mission-icon support-mission-heart"><Heart size={20} /></div>
              <div><h4>Student First</h4><p>To make student living easier by connecting students with accommodation and food-service providers through accessible information, transparent choices and a more reliable digital experience.</p></div>
            </div>
            <div className="support-mission-item">
              <div className="support-mission-icon support-mission-users"><Users size={20} /></div>
              <div><h4>Local Trust</h4><p>We connect students with local accommodation and food-service providers.</p></div>
            </div>
            <div className="support-mission-item">
              <div className="support-mission-icon support-mission-star"><Star size={20} /></div>
              <div><h4>Clear Information</h4><p>We make useful listing details and choices easier to review.</p></div>
            </div>
            <div className="support-mission-item">
              <div className="support-mission-icon support-mission-zap"><Zap size={20} /></div>
              <div><h4>Built for Student Life</h4><p>We bring accommodation and food services into one student-focused experience.</p></div>
            </div>
          </div>
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
