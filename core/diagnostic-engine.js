function uniqueById(items) {
  const map = new Map();
  items.forEach(item => map.set(item.id, item));
  return [...map.values()];
}

export function diagnoseProject({ foundationSteps = [], selectedAssets = [], standards = {} }) {
  const injected = [];
  const deliverables = [];
  const dependencies = [];

  selectedAssets.forEach(asset => {
    const standard = standards[asset.standardId];
    if (!standard) return;
    injected.push(...(standard.steps || []));
    deliverables.push(...(standard.deliverables || []));
    dependencies.push(...(standard.dependencies || []));
  });

  const steps = uniqueById([...foundationSteps, ...injected]);
  const totalWeight = steps.reduce((sum, s) => sum + (s.weight || 1), 0) || 1;
  const estimatedHours = steps.reduce((sum, s) => sum + Number(s.estimatedHours || 0), 0);
  const estimatedDays = Math.max(1, Math.ceil(estimatedHours / 6));

  const eligibleIdentityAssets = selectedAssets.filter(a => a.guidelineEligible);
  const documentation = eligibleIdentityAssets.length >= 7
    ? { type: 'full-guidelines', label: 'Full Brand Guidelines', eligibleSections: eligibleIdentityAssets.length }
    : eligibleIdentityAssets.length >= 4
      ? { type: 'one-page', label: 'One-Page Brand Presentation', eligibleSections: eligibleIdentityAssets.length }
      : { type: 'none', label: 'No documentation output yet', eligibleSections: eligibleIdentityAssets.length };

  return { steps, deliverables: uniqueById(deliverables), dependencies: uniqueById(dependencies), totalWeight, estimatedHours, estimatedDays, documentation };
}

export function calculateProgress(steps = []) {
  const total = steps.reduce((sum, s) => sum + (s.weight || 1), 0) || 1;
  const done = steps.reduce((sum, s) => sum + ((s.status === 'done' ? 1 : s.status === 'review' ? 0.85 : s.status === 'in-progress' ? 0.45 : 0) * (s.weight || 1)), 0);
  return Math.round((done / total) * 100);
}
