export type AuthenticatedUser = {
  id: number
  name: string
  email: string
  role: 'manager' | 'cms_manager' | 'generator_manager' | 'viewer'
  employee: {
    id: number
    name: string
  } | null
  permissions: {
    manage_equipment: boolean
    manage_maintenance: boolean
    delete_maintenance: boolean
    manage_sites: boolean
    manage_users: boolean
  }
}

export type LoginCredentials = {
  email: string
  password: string
  remember: boolean
}

export type Resource<T> = {
  data: T
}
