import { memo, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './FAQAccordion.css';

function FAQAccordion({ items = [] }) {
  const faqs = useMemo(() => items, [items]);
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="faq-accordion">
      {faqs.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div key={item.question} className={`faq-item ${isOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="faq-question"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              aria-expanded={isOpen}
            >
              <span>{item.question}</span>
              <ChevronDown size={18} />
            </button>
            <div className="faq-answer-wrap">
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(FAQAccordion);
