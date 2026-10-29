import type { AssetView } from '../assetCategories'

export function AssetCategoryIcon({ category }: { category: AssetView }) {
  const drawing = (() => {
    switch (category) {
      case 'all': return <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>
      case 'generator': return <><rect x="2.5" y="6" width="19" height="13" rx="2" /><path d="M6 10h5M6 14h4M15 10v5M18 10v5M7 19v2M17 19v2" /></>
      case 'tower_crane': return <><path d="M5 21h9M9.5 21V3M4 7h17M9.5 3l8 4M4 7l5.5-4M18 7v8M16 15h4l-2 2Z" /></>
      case 'hoist': return <><path d="M5 21V3h14v18M8 6h8M8 10h8M8 14h8M8 18h8M3 21h18" /><rect x="9" y="11" width="6" height="6" rx="1" /></>
      case 'earthmoving': return <><path d="M3 18h18M5 18l2-7h8l3 7M8 11l2-5h4l2 5M18 18l3-5h-4" /><circle cx="8" cy="18" r="2" /><circle cx="16" cy="18" r="2" /></>
      case 'compaction': return <><path d="M3 17h5V9h8l3 4v4M8 13h8M5 9V6h8v3" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="18" r="2" /></>
      case 'road_equipment': return <><path d="M9 3 6 21M15 3l3 18M12 4v3M12 10v4M12 17v3" /></>
      case 'concrete_equipment': return <><path d="M4 17h16M6 17l2-8h8l2 8M9 9l1-4h4l1 4" /><path d="m9 10 7 5M15 10l-6 5" /><circle cx="7" cy="19" r="2" /><circle cx="17" cy="19" r="2" /></>
      case 'pumps_dewatering': return <><path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10Z" /><path d="M3 20h18M17 13h4v4" /></>
      case 'workshop_rebar': return <><path d="m14 6 4-3 3 3-3 4M13 7 4 16l-1 5 5-1 9-9" /><path d="m12 12 4 4" /></>
      case 'site_equipment': return <><path d="M4 18h16M6 18v-7a6 6 0 0 1 12 0v7M9 11V7M15 11V7M3 18v2h18v-2" /></>
      case 'equipment': return <><path d="M3 19h18M6 19l2-9h7l3 9M8 10l2-4h4l1 4M11 6V3M7 15h10" /><circle cx="8" cy="19" r="1" /><circle cx="17" cy="19" r="1" /></>
      case 'formwork_scaffolding': return <><path d="M4 21V3M12 21V3M20 21V3M4 7h16M4 14h16M2 21h20M4 7l8 7M20 7l-8 7" /></>
      case 'portacabin': return <><rect x="2" y="7" width="20" height="12" rx="1" /><path d="M2 11h20M6 7V5h12v2M7 19v2M17 19v2M9 13h3v3H9ZM16 13h3v6" /></>
      case 'car': return <><path d="M4 15 6 9h12l2 6M3 15h18v4H3zM7 9l2-4h6l2 4M6 19v2M18 19v2" /><circle cx="6.5" cy="16.5" r=".7" /><circle cx="17.5" cy="16.5" r=".7" /></>
      case 'truck_dumper': return <><path d="M2 8h12v10H2zM14 12h4l3 3v3h-7M4 8V5h10v3M2 18h19" /><circle cx="6" cy="19" r="2" /><circle cx="17" cy="19" r="2" /></>
    }
  })()

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawing}</svg>
}
