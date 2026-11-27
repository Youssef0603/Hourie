export type AuthenticatedUser = {
  id: number
  name: string
  username: string
  email: string | null
  role: 'manager' | 'cms_manager' | 'generator_manager' | 'viewer'
  must_change_password: boolean
  employee: {
    id: number
    name: string
  } | null
  permissions: {
    manage_equipment: boolean
    manage_maintenance: boolean
    delete_maintenance: boolean
    delete_equipment: boolean
    manage_sites: boolean
    manage_purchase_orders: boolean
    manage_subcontracts: boolean
    manage_users: boolean
    manage_manager_accounts: boolean
  }
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
