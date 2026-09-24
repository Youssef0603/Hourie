import type { Language } from '../../i18n/fr'

export type AssetCategoryCode = 'tower_crane' | 'hoist' | 'equipment' | 'formwork_scaffolding' | 'portacabin' | 'car' | 'truck_dumper'
export type AssetView = 'all' | 'generator' | AssetCategoryCode
export type AssetField = { key: string; labelFr: string; labelAr: string; type: 'text' | 'number'; unit?: string }

export const assetCategories: Array<{ code: AssetCategoryCode; labelFr: string; labelAr: string; fields: AssetField[]; columns: string[] }> = [
  { code: 'tower_crane', labelFr: 'Grues à tour', labelAr: 'الرافعات البرجية', fields: [
    { key: 'lifting_capacity_tonnes', labelFr: 'Capacité de levage (t)', labelAr: 'حمولة الرفع (طن)', type: 'number', unit: 't' },
    { key: 'jib_length_m', labelFr: 'Longueur de flèche (m)', labelAr: 'طول الذراع (م)', type: 'number', unit: 'm' },
    { key: 'hook_height_m', labelFr: 'Hauteur sous crochet (m)', labelAr: 'ارتفاع الخطاف (م)', type: 'number', unit: 'm' },
  ], columns: ['lifting_capacity_tonnes', 'jib_length_m'] },
  { code: 'hoist', labelFr: 'Monte-charges', labelAr: 'مصاعد المواد', fields: [
    { key: 'load_capacity_kg', labelFr: 'Charge utile (kg)', labelAr: 'الحمولة (كغ)', type: 'number', unit: 'kg' },
    { key: 'lifting_height_m', labelFr: 'Hauteur de levage (m)', labelAr: 'ارتفاع الرفع (م)', type: 'number', unit: 'm' },
    { key: 'platform_length_m', labelFr: 'Longueur de plateforme (m)', labelAr: 'طول المنصة (م)', type: 'number', unit: 'm' },
  ], columns: ['load_capacity_kg', 'lifting_height_m'] },
  { code: 'equipment', labelFr: 'Matériel', labelAr: 'المعدات', fields: [
    { key: 'equipment_type', labelFr: 'Type de matériel', labelAr: 'نوع المعدات', type: 'text' },
    { key: 'sub_category', labelFr: 'Sous-catégorie', labelAr: 'الفئة الفرعية', type: 'text' },
    { key: 'capacity', labelFr: 'Capacité', labelAr: 'السعة', type: 'text' },
    { key: 'power_source', labelFr: 'Source d’énergie', labelAr: 'مصدر الطاقة', type: 'text' },
    { key: 'counter_at_purchase', labelFr: 'Compteur à l’achat', labelAr: 'العداد عند الشراء', type: 'text' },
    { key: 'purchase_price', labelFr: 'Prix d’achat', labelAr: 'سعر الشراء', type: 'text' },
    { key: 'shipping_cost', labelFr: 'Coût d’expédition', labelAr: 'تكلفة الشحن', type: 'text' },
    { key: 'official_document_type', labelFr: 'Type de document officiel', labelAr: 'نوع الوثيقة الرسمية', type: 'text' },
    { key: 'official_document_location', labelFr: 'Emplacement du document', labelAr: 'مكان الوثيقة', type: 'text' },
  ], columns: ['equipment_type', 'sub_category', 'capacity'] },
  { code: 'formwork_scaffolding', labelFr: 'Coffrage et échafaudage', labelAr: 'القوالب والسقالات', fields: [
    { key: 'system_type', labelFr: 'Type de système', labelAr: 'نوع النظام', type: 'text' },
    { key: 'quantity', labelFr: 'Quantité', labelAr: 'الكمية', type: 'number' },
    { key: 'unit', labelFr: 'Unité', labelAr: 'الوحدة', type: 'text' },
    { key: 'sub_category', labelFr: 'Sous-catégorie', labelAr: 'الفئة الفرعية', type: 'text' },
    { key: 'purchase_price', labelFr: 'Prix d’achat', labelAr: 'سعر الشراء', type: 'text' },
    { key: 'shipping_cost', labelFr: 'Coût d’expédition', labelAr: 'تكلفة الشحن', type: 'text' },
    { key: 'official_document_type', labelFr: 'Type de document officiel', labelAr: 'نوع الوثيقة الرسمية', type: 'text' },
    { key: 'official_document_location', labelFr: 'Emplacement du document', labelAr: 'مكان الوثيقة', type: 'text' },
  ], columns: ['system_type', 'quantity', 'unit'] },
  { code: 'portacabin', labelFr: 'Bungalows', labelAr: 'المكاتب المتنقلة', fields: [
    { key: 'length_m', labelFr: 'Longueur (m)', labelAr: 'الطول (م)', type: 'number', unit: 'm' },
    { key: 'width_m', labelFr: 'Largeur (m)', labelAr: 'العرض (م)', type: 'number', unit: 'm' },
    { key: 'purpose', labelFr: 'Utilisation', labelAr: 'الاستخدام', type: 'text' },
  ], columns: ['length_m', 'width_m'] },
  { code: 'car', labelFr: 'Voitures', labelAr: 'السيارات', fields: [
    { key: 'fuel_type', labelFr: 'Carburant', labelAr: 'الوقود', type: 'text' },
    { key: 'odometer_km', labelFr: 'Kilométrage (km)', labelAr: 'المسافة (كم)', type: 'number', unit: 'km' },
    { key: 'counter_at_purchase', labelFr: 'Compteur à l’achat', labelAr: 'العداد عند الشراء', type: 'text' },
    { key: 'purchase_price', labelFr: 'Prix d’achat', labelAr: 'سعر الشراء', type: 'text' },
    { key: 'shipping_cost', labelFr: 'Coût d’expédition', labelAr: 'تكلفة الشحن', type: 'text' },
    { key: 'official_document_type', labelFr: 'Type de document officiel', labelAr: 'نوع الوثيقة الرسمية', type: 'text' },
    { key: 'official_document_location', labelFr: 'Emplacement du document', labelAr: 'مكان الوثيقة', type: 'text' },
  ], columns: ['odometer_km'] },
  { code: 'truck_dumper', labelFr: 'Camions et bennes', labelAr: 'الشاحنات والقلابات', fields: [
    { key: 'vehicle_type', labelFr: 'Type de véhicule', labelAr: 'نوع المركبة', type: 'text' },
    { key: 'payload_tonnes', labelFr: 'Charge utile (t)', labelAr: 'الحمولة (طن)', type: 'number', unit: 't' },
    { key: 'fuel_type', labelFr: 'Carburant', labelAr: 'الوقود', type: 'text' },
    { key: 'odometer_km', labelFr: 'Kilométrage (km)', labelAr: 'المسافة (كم)', type: 'number', unit: 'km' },
    { key: 'counter_at_purchase', labelFr: 'Compteur à l’achat', labelAr: 'العداد عند الشراء', type: 'text' },
    { key: 'purchase_price', labelFr: 'Prix d’achat', labelAr: 'سعر الشراء', type: 'text' },
    { key: 'shipping_cost', labelFr: 'Coût d’expédition', labelAr: 'تكلفة الشحن', type: 'text' },
    { key: 'official_document_type', labelFr: 'Type de document officiel', labelAr: 'نوع الوثيقة الرسمية', type: 'text' },
    { key: 'official_document_location', labelFr: 'Emplacement du document', labelAr: 'مكان الوثيقة', type: 'text' },
  ], columns: ['vehicle_type', 'payload_tonnes', 'odometer_km'] },
]

export const isAssetCategoryCode = (code: string): code is AssetCategoryCode => assetCategories.some((category) => category.code === code)
export const assetCategory = (code: string) => assetCategories.find((category) => category.code === code)
export const assetCategoryLabel = (code: AssetCategoryCode, language: Language) => {
  const category = assetCategory(code)
  return language === 'ar' ? category?.labelAr ?? code : category?.labelFr ?? code
}
export const assetFieldLabel = (field: AssetField, language: Language) => language === 'ar' ? field.labelAr : field.labelFr
