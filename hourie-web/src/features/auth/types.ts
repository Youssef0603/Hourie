/** Account roles; see the API's UserRole enum for what each one may do. */
export type UserRoleCode =
  | 'manager'
  | 'cms_manager'
  | 'equipment_manager'
  | 'site_manager'
  | 'purchaser'
  | 'mechanic'
  | 'generator_manager'
  | 'viewer'

export type AuthenticatedUser = {
  id: number
  name: string
  username: string
  email: string | null
  role: UserRoleCode
  must_change_password: boolean
  employee: {
    id: number
    name: string
  } | null
  permissions: {
    manage_equipment: boolean
    /** Register new equipment and import lists (not a Chef de chantier). */
    create_equipment: boolean
    /** Move equipment between sites. */
    transfer_equipment: boolean
    manage_maintenance: boolean
    manage_temporary_admissions: boolean
    delete_maintenance: boolean
    delete_equipment: boolean
    manage_sites: boolean
    manage_purchase_orders: boolean
    manage_subcontracts: boolean
    manage_users: boolean
    manage_manager_accounts: boolean
  }
  /** Chef de chantier: the only site he works on (null id when none is assigned). */
  site_scope: { id: number | null; name: string | null } | null
  /** Modules switched on for this deployment (FEATURE_* in the API's .env). */
  features: {
    subcontracts: boolean
  }
}

export type LoginCredentials = {
  login: string
  password: string
  remember: boolean
}

export type ChangePasswordPayload = {
  current_password: string
  password: string
  password_confirmation: string
}

export type Resource<T> = {
  data: T
}
