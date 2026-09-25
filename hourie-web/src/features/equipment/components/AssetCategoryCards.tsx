import { fr, type Language } from '../../../i18n/fr'
import { assetCategories, assetCategoryLabel, type AssetView } from '../assetCategories'
import { AssetCategoryIcon } from './AssetCategoryIcon'

type AssetCategoryCardsProps = {
  selected: AssetView
  language: Language
  onSelect: (category: AssetView) => void
}

export function AssetCategoryCards({ selected, language, onSelect }: AssetCategoryCardsProps) {
  const categories: Exclude<AssetView, 'all'>[] = ['generator', ...assetCategories.map((category) => category.code)]

  return <section className="asset-category-section" aria-label={fr.assets.categories}>
    <h2>{fr.assets.categories}</h2>
    <div className="asset-categories">
      <button className={`asset-category-card${selected === 'all' ? ' active' : ''}`} type="button" onClick={() => onSelect('all')} aria-current={selected === 'all' ? 'page' : undefined}>
        <AssetCategoryIcon category="all" /><span>{fr.assets.all}</span>
      </button>
      {categories.map((code) => {
      const label = code === 'generator' ? fr.navigation.generators : assetCategoryLabel(code, language)
      return <button key={code} className={`asset-category-card${selected === code ? ' active' : ''}`} type="button" onClick={() => onSelect(code)} aria-current={selected === code ? 'page' : undefined}>
        <AssetCategoryIcon category={code} /><span>{label}</span>
      </button>
    })}</div>
  </section>
}
