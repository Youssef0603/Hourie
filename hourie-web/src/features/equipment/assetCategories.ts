import type { Language } from '../../i18n/fr'

export type AssetCategoryCode = 'tower_crane' | 'hoist' | 'earthmoving' | 'compaction' | 'road_equipment' | 'concrete_equipment' | 'pumps_dewatering' | 'workshop_rebar' | 'site_equipment' | 'equipment' | 'formwork_scaffolding' | 'portacabin' | 'car' | 'truck_dumper'
export type AssetView = 'all' | 'generator' | AssetCategoryCode
export type AssetField = { key: string; labelFr: string; labelAr: string; type: 'text' | 'number' | 'date'; unit?: string }

export const generalEquipmentCategoryCodes = ['earthmoving', 'compaction', 'road_equipment', 'concrete_equipment', 'pumps_dewatering', 'workshop_rebar', 'site_equipment', 'equipment'] as const satisfies readonly AssetCategoryCode[]
export const isGeneralEquipmentCategoryCode = (code: AssetCategoryCode | undefined): boolean => code !== undefined && generalEquipmentCategoryCodes.includes(code as (typeof generalEquipmentCategoryCodes)[number])

const generalEquipmentFields: AssetField[] = [
  { key: 'equipment_type', labelFr: 'Type de matériel', labelAr: 'نوع المعدات', type: 'text' },
  { key: 'sub_category', labelFr: 'Sous-catégorie', labelAr: 'الفئة الفرعية', type: 'text' },
  { key: 'counter_at_purchase', labelFr: 'Compteur à l’achat', labelAr: 'العداد عند الشراء', type: 'text' },
  { key: 'purchase_price', labelFr: 'Prix d’achat', labelAr: 'سعر الشراء', type: 'text' },
  { key: 'shipping_cost', labelFr: 'Coût d’expédition', labelAr: 'تكلفة الشحن', type: 'text' },
  { key: 'official_document_type', labelFr: 'Type de document officiel', labelAr: 'نوع الوثيقة الرسمية', type: 'text' },
  { key: 'official_document_location', labelFr: 'Emplacement du document', labelAr: 'مكان الوثيقة', type: 'text' },
]

export const assetCategories: Array<{ code: AssetCategoryCode; labelFr: string; labelAr: string; fields: AssetField[]; columns: string[] }> = [
  { code: 'tower_crane', labelFr: 'Grues', labelAr: 'الرافعات', fields: [
    { key: 'crane_type', labelFr: 'Type de grue', labelAr: 'نوع الرافعة', type: 'text' },
    { key: 'sub_category', labelFr: 'Sous-catégorie', labelAr: 'الفئة الفرعية', type: 'text' },
    { key: 'counter_at_purchase', labelFr: 'Compteur à l’achat', labelAr: 'العداد عند الشراء', type: 'text' },
    { key: 'purchase_price', labelFr: 'Prix d’achat', labelAr: 'سعر الشراء', type: 'text' },
    { key: 'shipping_cost', labelFr: 'Coût d’expédition', labelAr: 'تكلفة الشحن', type: 'text' },
    { key: 'official_document_type', labelFr: 'Type de document officiel', labelAr: 'نوع الوثيقة الرسمية', type: 'text' },
    { key: 'official_document_location', labelFr: 'Emplacement du document', labelAr: 'مكان الوثيقة', type: 'text' },
  ], columns: ['crane_type', 'sub_category'] },
  { code: 'hoist', labelFr: 'Monte-charges', labelAr: 'مصاعد المواد', fields: [
    { key: 'load_capacity_kg', labelFr: 'Charge utile (kg)', labelAr: 'الحمولة (كغ)', type: 'number', unit: 'kg' },
    { key: 'lifting_height_m', labelFr: 'Hauteur de levage (m)', labelAr: 'ارتفاع الرفع (م)', type: 'number', unit: 'm' },
    { key: 'platform_length_m', labelFr: 'Longueur de plateforme (m)', labelAr: 'طول المنصة (م)', type: 'number', unit: 'm' },
  ], columns: ['load_capacity_kg', 'lifting_height_m'] },
  { code: 'earthmoving', labelFr: 'Engins de terrassement', labelAr: 'معدات الحفر والردم', fields: generalEquipmentFields, columns: ['equipment_type', 'sub_category'] },
  { code: 'compaction', labelFr: 'Matériel de compactage', labelAr: 'معدات الدمك', fields: generalEquipmentFields, columns: ['equipment_type', 'sub_category'] },
  { code: 'road_equipment', labelFr: 'Matériel routier', labelAr: 'معدات الطرق', fields: generalEquipmentFields, columns: ['equipment_type', 'sub_category'] },
  { code: 'concrete_equipment', labelFr: 'Matériel de béton', labelAr: 'معدات الخرسانة', fields: generalEquipmentFields, columns: ['equipment_type', 'sub_category'] },
  { code: 'pumps_dewatering', labelFr: 'Pompes et assèchement', labelAr: 'مضخات ونزح المياه', fields: generalEquipmentFields, columns: ['equipment_type', 'sub_category'] },
  { code: 'workshop_rebar', labelFr: 'Atelier et ferraillage', labelAr: 'معدات الورشة وحديد التسليح', fields: generalEquipmentFields, columns: ['equipment_type', 'sub_category'] },
  { code: 'site_equipment', labelFr: 'Équipements de chantier', labelAr: 'معدات موقع العمل', fields: generalEquipmentFields, columns: ['equipment_type', 'sub_category'] },
  { code: 'equipment', labelFr: 'Autres matériels', labelAr: 'معدات أخرى', fields: generalEquipmentFields, columns: ['equipment_type', 'sub_category'] },
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
  { code: 'portacabin', labelFr: 'Conteneurs', labelAr: 'المكاتب المتنقلة', fields: [
    { key: 'bungalow_type', labelFr: 'Type de conteneur', labelAr: 'نوع الوحدة', type: 'text' },
    { key: 'length_m', labelFr: 'Longueur (m)', labelAr: 'الطول (م)', type: 'number', unit: 'm' },
    { key: 'width_m', labelFr: 'Largeur (m)', labelAr: 'العرض (م)', type: 'number', unit: 'm' },
    { key: 'height_m', labelFr: 'Hauteur (m)', labelAr: 'الارتفاع (م)', type: 'number', unit: 'm' },
    { key: 'water_tank_capacity_l', labelFr: 'Capacité du réservoir d’eau (L)', labelAr: 'سعة خزان المياه (لتر)', type: 'number', unit: 'L' },
    { key: 'door_count', labelFr: 'Nombre de portes', labelAr: 'عدد الأبواب', type: 'number' },
    { key: 'window_count', labelFr: 'Nombre de fenêtres', labelAr: 'عدد النوافذ', type: 'number' },
    { key: 'toilet_count', labelFr: 'Nombre de WC', labelAr: 'عدد المراحيض', type: 'number' },
    { key: 'washbasin_count', labelFr: 'Nombre de lavabos', labelAr: 'عدد المغاسل', type: 'number' },
    { key: 'mirror_count', labelFr: 'Nombre de miroirs', labelAr: 'عدد المرايا', type: 'number' },
    { key: 'shower_count', labelFr: 'Nombre de douches', labelAr: 'عدد الدشات', type: 'number' },
    { key: 'electrical_installation', labelFr: 'Installation électrique (oui/non)', labelAr: 'التجهيز الكهربائي', type: 'text' },
    { key: 'air_conditioning', labelFr: 'Climatisation incluse', labelAr: 'تكييف مدمج', type: 'text' },
    { key: 'purpose', labelFr: 'Utilisation', labelAr: 'الاستخدام', type: 'text' },
    { key: 'purchase_price', labelFr: 'Prix d’achat', labelAr: 'سعر الشراء', type: 'text' },
    { key: 'shipping_cost', labelFr: 'Coût d’expédition', labelAr: 'تكلفة الشحن', type: 'text' },
    { key: 'official_document_type', labelFr: 'Type de document officiel', labelAr: 'نوع الوثيقة الرسمية', type: 'text' },
    { key: 'official_document_location', labelFr: 'Emplacement du document', labelAr: 'مكان الوثيقة', type: 'text' },
  ], columns: ['bungalow_type', 'length_m', 'width_m', 'height_m'] },
  { code: 'car', labelFr: 'Voitures', labelAr: 'السيارات', fields: [
    { key: 'inspection_date', labelFr: 'Date de visite', labelAr: 'تاريخ الفحص', type: 'date' },
    { key: 'fuel_type', labelFr: 'Carburant', labelAr: 'الوقود', type: 'text' },
    { key: 'odometer_km', labelFr: 'Kilométrage (km)', labelAr: 'المسافة (كم)', type: 'number', unit: 'km' },
    { key: 'counter_at_purchase', labelFr: 'Compteur à l’achat', labelAr: 'العداد عند الشراء', type: 'text' },
    { key: 'purchase_price', labelFr: 'Prix d’achat', labelAr: 'سعر الشراء', type: 'text' },
    { key: 'shipping_cost', labelFr: 'Coût d’expédition', labelAr: 'تكلفة الشحن', type: 'text' },
    { key: 'official_document_type', labelFr: 'Type de document officiel', labelAr: 'نوع الوثيقة الرسمية', type: 'text' },
    { key: 'official_document_location', labelFr: 'Emplacement du document', labelAr: 'مكان الوثيقة', type: 'text' },
  ], columns: [] },
  { code: 'truck_dumper', labelFr: 'Camions et bennes', labelAr: 'الشاحنات والقلابات', fields: [
    { key: 'vehicle_type', labelFr: 'Type de véhicule', labelAr: 'نوع المركبة', type: 'text' },
    { key: 'manufacturer', labelFr: 'Constructeur', labelAr: 'الشركة المصنّعة', type: 'text' },
    { key: 'manufacture_date', labelFr: 'Date de fabrication', labelAr: 'تاريخ التصنيع', type: 'text' },
    { key: 'engine_model', labelFr: 'Modèle du moteur', labelAr: 'طراز المحرك', type: 'text' },
    { key: 'engine_output_hp', labelFr: 'Puissance moteur (ch)', labelAr: 'قوة المحرك (حصان)', type: 'number', unit: 'ch' },
    { key: 'permissible_combination_weight_kg', labelFr: 'Poids total roulant autorisé (kg)', labelAr: 'الوزن الإجمالي المسموح به (كغ)', type: 'number', unit: 'kg' },
    { key: 'axle_1_weight_kg', labelFr: 'Charge autorisée — essieu 1 (kg)', labelAr: 'الحمولة المسموحة — المحور 1 (كغ)', type: 'number', unit: 'kg' },
    { key: 'axle_2_weight_kg', labelFr: 'Charge autorisée — essieu 2 (kg)', labelAr: 'الحمولة المسموحة — المحور 2 (كغ)', type: 'number', unit: 'kg' },
    { key: 'axle_3_weight_kg', labelFr: 'Charge autorisée — essieu 3 (kg)', labelAr: 'الحمولة المسموحة — المحور 3 (كغ)', type: 'number', unit: 'kg' },
    { key: 'identification_source', labelFr: 'Source des caractéristiques', labelAr: 'مصدر المواصفات', type: 'text' },
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
