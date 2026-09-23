import type { AssetView } from '../assetCategories'

export function AssetCategoryIcon({ category }: { category: AssetView }) {
  const drawing = (() => {
    switch (category) {
      case 'all': return <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>
      case 'generator': return <><rect x="2.5" y="6" width="19" height="13" rx="2" /><path d="M6 10h5M6 14h4M15 10v5M18 10v5M7 19v2M17 19v2" /></>
      case 'tower_crane': return <><path d="M5 21h9M9.5 21V3M4 7h17M9.5 3l8 4M4 7l5.5-4M18 7v8M16 15h4l-2 2Z" /></>
      case 'hoist': return <><path d="M5 21V3h14v18M8 6h8M8 10h8M8 14h8M8 18h8M3 21h18" /><rect x="9" y="11" width="6" height="6" rx="1" /></>
      case 'equipment': return <><path d="M3 19h18M6 19l2-9h7l3 9M8 10l2-4h4l1 4M11 6V3M7 15h10" /><circle cx="8" cy="19" r="1" /><circle cx="17" cy="19" r="1" /></>
      case 'formwork_scaffolding': return <><path d="M4 21V3M12 21V3M20 21V3M4 7h16M4 14h16M2 21h20M4 7l8 7M20 7l-8 7" /></>
      case 'portacabin': return <><rect x="2" y="7" width="20" height="12" rx="1" /><path d="M2 11h20M6 7V5h12v2M7 19v2M17 19v2M9 13h3v3H9ZM16 13h3v6" /></>
      case 'car': return <><path d="M4 15 6 9h12l2 6M3 15h18v4H3zM7 9l2-4h6l2 4M6 19v2M18 19v2" /><circle cx="6.5" cy="16.5" r=".7" /><circle cx="17.5" cy="16.5" r=".7" /></>
      case 'truck_dumper': return <><path d="M2 8h12v10H2zM14 12h4l3 3v3h-7M4 8V5h10v3M2 18h19" /><circle cx="6" cy="19" r="2" /><circle cx="17" cy="19" r="2" /></>
    }
  })()

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawing}</svg>
}
