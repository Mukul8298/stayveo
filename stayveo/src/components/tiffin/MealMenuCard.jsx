import { Check } from 'lucide-react';

export default function MealMenuCard({ title, time, items }) {
  return (
    <article className="tiffin-menu-card">
      <div className="tiffin-menu-card-heading"><h3>{title}</h3><span>{time}</span></div>
      <ul>{items.length ? items.map((item, index) => <li key={`${item}-${index}`}><Check size={13} /> {item}</li>) : <li className="tiffin-menu-card-empty">No items planned yet.</li>}</ul>
    </article>
  );
}
