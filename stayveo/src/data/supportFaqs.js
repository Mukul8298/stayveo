import { studentFaqs } from './studentFaqs';
import { providerFaqs } from './providerFaqs';

const faqByRole = {
  student: studentFaqs,
  provider: providerFaqs,
};

export function getFaqsForRole(role) {
  return faqByRole[role] || studentFaqs;
}
