export type UserRole = 'super_admin' | 'admin' | 'manager' | 'viewer'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  tenantId: string
  tenantName: string
  tenantSlug: string
}

export interface AuthResponse {
  success: boolean
  data: {
    user: User
    accessToken: string
    refreshToken: string
  }
}

export interface LoginRequest {
  email: string
  password: string
  tenantSlug: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface RefreshResponse {
  data: {
    accessToken: string
    refreshToken: string
  }
}

export interface Session {
  _id: string
  browser?: string
  os?: string
  device?: string
  ipAddress?: string
  lastActive?: string
  isCurrent?: boolean
}
