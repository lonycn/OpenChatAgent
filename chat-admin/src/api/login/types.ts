export interface UserLoginType {
  email: string
  password: string
}

export interface UserType {
  email: string
  password: string
  role?: string
  roleId?: string
  id?: number
  uuid?: string
  full_name?: string
  avatar_url?: string
  status?: string
  timezone?: string
  language?: string
  last_login_at?: string
  created_at?: string
  updated_at?: string
}
