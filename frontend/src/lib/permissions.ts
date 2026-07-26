export type UserRole = 'super_admin' | 'admin' | 'member' | 'manager' | 'viewer';

export function canManageTeam(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canManageCampaigns(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canManageBuyers(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canManageSuppliers(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canManageSettings(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canDeleteLeadsPermanently(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canManageFieldDefinitions(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canToggleCampaign(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canResetBuyerCaps(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canEditBuyerPayloadTemplate(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canRetryDelivery(role: UserRole): boolean {
  return role === 'admin' || role === 'member' || role === 'super_admin';
}

export function canCreateLeads(role: UserRole): boolean {
  return role === 'admin' || role === 'member' || role === 'super_admin';
}

export function canReassignLeads(role: UserRole): boolean {
  return role === 'admin' || role === 'member' || role === 'super_admin';
}
