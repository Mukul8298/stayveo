import { memo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './FAQAccordion.css';

function FAQAccordion({ items = [] }) {
  const [openIndex, setOpenIndex] = useState(-1);

  return (
    <div className="faq-accordion">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const showCategory = item.category && item.category !== items[index - 1]?.category;
        const answerId = `support-faq-answer-${index}`;

        return (
          <div className="faq-group" key={item.question}>
            {showCategory && <h4 className="faq-category">{item.category}</h4>}
            <div className={`faq-item ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="faq-question"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                aria-expanded={isOpen}
                aria-controls={answerId}
              >
                <span>{item.question}</span>
                <ChevronDown size={18} aria-hidden="true" />
              </button>
              <div
                className="faq-answer-wrap"
                id={answerId}
                role="region"
                aria-label={item.question}
                aria-hidden={!isOpen}
                inert={!isOpen}
              >
                <p>
                  {item.answer.split(/(stayveo@gmail\.com)/gi).map((part, partIndex) => (
                    part.toLowerCase() === 'stayveo@gmail.com'
                      ? <a key={`${answerId}-email-${partIndex}`} href="mailto:stayveo@gmail.com">{part}</a>
                      : part
                  ))}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(FAQAccordion);
