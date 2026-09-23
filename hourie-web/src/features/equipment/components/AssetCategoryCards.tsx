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
    <div className="asset-category-heading">
      <h2>{fr.assets.categories}</h2>
      <button className={`asset-global-link${selected === 'all' ? ' active' : ''}`} type="button" onClick={() => onSelect('all')} aria-current={selected === 'all' ? 'page' : undefined}>
        <AssetCategoryIcon category="all" />{fr.assets.all}
      </button>
    </div>
    <div className="asset-categories">{categories.map((code) => {
      const label = code === 'generator' ? fr.navigation.generators : assetCategoryLabel(code, language)
      return <button key={code} className={`asset-category-card${selected === code ? ' active' : ''}`} type="button" onClick={() => onSelect(code)} aria-current={selected === code ? 'page' : undefined}>
        <span className="asset-category-card-icon"><AssetCategoryIcon category={code} /></span>
        <span className="asset-category-card-label">{label}</span>
      </button>
    })}</div>
  </section>
}
