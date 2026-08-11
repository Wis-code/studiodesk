export function priceAsset(asset, context = {}) {
  const quantity = Math.max(1, Number(context.quantity || asset.quantity || 1));
  switch (asset.pricingMode) {
    case 'quantity': return asset.unitPrice * quantity;
    case 'calculated': return (asset.components || []).reduce((sum, item) => sum + Number(item.price || 0), 0) - Number(asset.bundleDiscount || 0);
    case 'starting': return Number(asset.startingPrice || 0);
    case 'custom': return null;
    default: return Number(asset.price || 0);
  }
}

export function calculateConfiguration({ foundationPrice = 0, selectedAssets = [], discount = 0, depositRate = 0.5 }) {
  const lines = selectedAssets.map(asset => ({ ...asset, calculatedPrice: priceAsset(asset) }));
  const known = lines.filter(l => typeof l.calculatedPrice === 'number');
  const subtotal = Number(foundationPrice) + known.reduce((sum, l) => sum + l.calculatedPrice, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  return {
    lines,
    subtotal,
    discount: Number(discount || 0),
    total,
    deposit: Math.round(total * depositRate),
    hasCustomQuote: lines.some(l => l.calculatedPrice === null),
  };
}

export function applyLiveStandardPrice(assets, assetId, newPrice) {
  return assets.map(asset => asset.id === assetId ? { ...asset, price: Number(newPrice), priceUpdatedAt: new Date().toISOString() } : asset);
}
