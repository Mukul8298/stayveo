export default function MealPlanSelector({ provider, selectedPlan, onSelect, onSubscribe }) {
  const plans = Object.values(provider.plans);

  if (!plans.length) {
    return <aside className="tiffin-plan-panel">
      <h2>Meal plans</h2>
      <div className="tiffin-state"><span>Meal plans haven't been published yet.</span></div>
    </aside>;
  }

  return (
    <aside className="tiffin-plan-panel">
      <h2>Choose your meal plan</h2>
      <div className="tiffin-plan-list">
        {plans.map((plan) => {
          const active = selectedPlan === plan.label.toLowerCase();
          const recommended = plan.label === 'Monthly';
          return (
            <button type="button" className={`tiffin-plan ${active ? 'is-selected' : ''}`} key={plan.label} onClick={() => onSelect(plan.label.toLowerCase())} aria-pressed={active}>
              {recommended && <span className="tiffin-recommended">RECOMMENDED</span>}
              <span className="tiffin-plan-copy"><strong>{plan.label}</strong><small>{plan.detail}</small></span>
              <span className="tiffin-plan-price"><strong>₹{plan.price.toLocaleString('en-IN')}</strong><small>{plan.unit}</small></span>
            </button>
          );
        })}
      </div>
      <button type="button" className="tiffin-subscribe-button" onClick={onSubscribe}>Subscribe to Tiffin <span>→</span></button>
      <div className="tiffin-plan-note"><span>ⓘ</span><p>Subscriptions can be paused with 24 hours notice. Meals are delivered in insulated, reusable tiffin carriers.</p></div>
    </aside>
  );
}
