export type UserRole = 'super_admin' | 'tenant_admin' | 'buyer' | 'viewer'

export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  tenantId: string
  tenantName: string
  tenantSlug: string
  fullName?: string
}

export interface AuthResponse {
  user: User
  message: string
  accessToken?: string
  refreshToken?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface Session {
  _id: string
  userId: string
  ipAddress: string
  userAgent: string
  device: string
  browser: string
  os: string
  isCurrent: boolean
  createdAt: string
  lastActive: string
  expiresAt: string
}

export interface RefreshResponse {
  message: string
}
