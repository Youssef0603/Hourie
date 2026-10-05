export type BondStatus = 'active' | 'soon' | 'expired'
export type BondType = 'advance_payment' | 'performance' | 'retention'

export type BondDocument = {
  id: number
  original_name: string
  mime_type: string
  size_bytes: number
  url: string
}

export type PhysicalLocation = { id: number; name: string; parent_id: number | null }
export type BondSite = { id: number; name: string; locations: PhysicalLocation[] }

export type Bond = {
  id: number
  bond_type: BondType
  issuer: string | null
  amount: string
  currency: string
  issued_on: string | null
  expires_on: string | null
  notes: string | null
  project: BondSite
  location: Pick<PhysicalLocation, 'id' | 'name'> | null
  documents: BondDocument[]
  created_at: string | null
  changes?: Array<{ id: number; action: string; actor: { id: number; name: string } | null; occurred_at: string }>
}
