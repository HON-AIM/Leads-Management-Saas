const Role = require('../models/Role');
const Permission = require('../models/Permission');
const User = require('../models/User');
const AuditLogService = require('./auditLogService');

class RoleService {
  static async initializeSystemRoles() {
    const permissionDefs = [
      { name: 'users.create', resource: 'users', action: 'create', category: 'admin' },
      { name: 'users.read', resource: 'users', action: 'read', category: 'admin' },
      { name: 'users.update', resource: 'users', action: 'update', category: 'admin' },
      { name: 'users.delete', resource: 'users', action: 'delete', category: 'admin' },
      { name: 'users.manage', resource: 'users', action: 'manage', category: 'admin' },
      { name: 'tenants.create', resource: 'tenants', action: 'create', category: 'admin' },
      { name: 'tenants.read', resource: 'tenants', action: 'read', category: 'admin' },
      { name: 'tenants.update', resource: 'tenants', action: 'update', category: 'admin' },
      { name: 'tenants.delete', resource: 'tenants', action: 'delete', category: 'admin' },
      { name: 'tenants.manage', resource: 'tenants', action: 'manage', category: 'admin' },
      { name: 'leads.create', resource: 'leads', action: 'create', category: 'core' },
      { name: 'leads.read', resource: 'leads', action: 'read', category: 'core' },
      { name: 'leads.update', resource: 'leads', action: 'update', category: 'core' },
      { name: 'leads.delete', resource: 'leads', action: 'delete', category: 'core' },
      { name: 'leads.export', resource: 'leads', action: 'export', category: 'core' },
      { name: 'leads.import', resource: 'leads', action: 'import', category: 'core' },
      { name: 'clients.create', resource: 'clients', action: 'create', category: 'core' },
      { name: 'clients.read', resource: 'clients', action: 'read', category: 'core' },
      { name: 'clients.update', resource: 'clients', action: 'update', category: 'core' },
      { name: 'clients.delete', resource: 'clients', action: 'delete', category: 'core' },
      { name: 'clients.export', resource: 'clients', action: 'export', category: 'core' },
      { name: 'clients.import', resource: 'clients', action: 'import', category: 'core' },
      { name: 'analytics.read', resource: 'analytics', action: 'read', category: 'core' },
      { name: 'settings.manage', resource: 'settings', action: 'manage', category: 'admin' },
      { name: 'roles.create', resource: 'roles', action: 'create', category: 'admin' },
      { name: 'roles.read', resource: 'roles', action: 'read', category: 'admin' },
      { name: 'roles.update', resource: 'roles', action: 'update', category: 'admin' },
      { name: 'roles.delete', resource: 'roles', action: 'delete', category: 'admin' },
      { name: 'roles.manage', resource: 'roles', action: 'manage', category: 'admin' },
      { name: 'permissions.read', resource: 'permissions', action: 'read', category: 'admin' },
      { name: 'activities.read', resource: 'activities', action: 'read', category: 'core' }
    ];

    const createdPermissions = {};
    for (const perm of permissionDefs) {
      const p = await Permission.findOneAndUpdate(
        { name: perm.name },
        perm,
        { upsert: true, new: true }
      );
      createdPermissions[perm.name] = p._id;
    }

    const roleDefs = {
      super_admin: {
        description: 'Full system access across all tenants',
        permissions: Object.keys(createdPermissions),
        isSystemRole: true,
        tenantId: null,
        priority: 100
      },
      tenant_admin: {
        description: 'Administrative access within their tenant',
        permissions: [
          'users.create', 'users.read', 'users.update', 'users.delete', 'users.manage',
          'leads.create', 'leads.read', 'leads.update', 'leads.delete', 'leads.export', 'leads.import',
          'clients.create', 'clients.read', 'clients.update', 'clients.delete', 'clients.export', 'clients.import',
          'analytics.read', 'settings.manage',
          'roles.create', 'roles.read', 'roles.update', 'roles.delete', 'roles.manage',
          'permissions.read', 'activities.read'
        ],
        isSystemRole: true,
        tenantId: null,
        priority: 80
      },
      buyer: {
        description: 'Can view and manage leads and clients',
        permissions: [
          'leads.read', 'leads.update',
          'clients.read', 'clients.update',
          'analytics.read', 'activities.read'
        ],
        isSystemRole: true,
        tenantId: null,
        priority: 50
      },
      viewer: {
        description: 'Read-only access to leads, clients, and analytics',
        permissions: [
          'leads.read', 'clients.read', 'analytics.read', 'activities.read'
        ],
        isSystemRole: true,
        tenantId: null,
        priority: 10
      }
    };

    for (const [roleName, def] of Object.entries(roleDefs)) {
      const permIds = def.permissions.map(name => createdPermissions[name]).filter(Boolean);

      await Role.findOneAndUpdate(
        { name: roleName, tenantId: def.tenantId },
        {
          name: roleName,
          slug: roleName,
          description: def.description,
          permissions: permIds,
          isSystemRole: def.isSystemRole,
          tenantId: def.tenantId,
          priority: def.priority
        },
        { upsert: true, new: true }
      );
    }

    console.log('System roles and permissions initialized');
  }

  static async getRoleByName(roleName, tenantId = null) {
    const query = { name: roleName };
    if (tenantId) query.$or = [{ tenantId }, { tenantId: null }];

    const role = await Role.findOne(query).populate('permissions');
    if (!role) throw new Error('Role not found');
    return role;
  }

  static async getAllRoles(tenantId = null) {
    const query = {};
    if (tenantId) {
      query.$or = [{ tenantId }, { tenantId: null }];
    } else {
      query.$or = [{ isSystemRole: true }, { tenantId: null }];
    }

    return Role.find(query).populate('permissions').sort({ priority: -1 });
  }

  static async createTenantRole(tenantId, roleData, createdBy) {
    const { name, description, permissionIds } = roleData;

    const existingRole = await Role.findOne({ name, $or: [{ tenantId }, { tenantId: null }] });
    if (existingRole) throw new Error('Role name already exists');

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existingSlug = await Role.findOne({ slug, $or: [{ tenantId }, { tenantId: null }] });
    if (existingSlug) throw new Error('Role slug already exists');

    const permissions = await Permission.find({ _id: { $in: permissionIds } });
    if (permissions.length !== permissionIds.length) throw new Error('Some permissions not found');

    const role = new Role({
      name,
      slug,
      description,
      permissions: permissionIds,
      tenantId,
      isSystemRole: false,
      createdBy
    });

    await role.save();

    await AuditLogService.log({
      action: 'role_created',
      resource: 'role',
      resourceId: role._id,
      performedBy: createdBy,
      tenantId,
      details: { name, permissionCount: permissionIds.length },
      message: `Custom role ${name} created`
    });

    return Role.findById(role._id).populate('permissions');
  }

  static async updateRole(roleId, updateData, userId) {
    const role = await Role.findById(roleId).populate('permissions');
    if (!role) throw new Error('Role not found');

    const user = await User.findById(userId).populate('role');
    const canUpdate = user.role?.name === 'super_admin' ||
                      (user.role?.name === 'tenant_admin' && role.tenantId?.toString() === user.tenantId.toString());

    if (!canUpdate) throw new Error('Insufficient permissions');

    if (role.isSystemRole) throw new Error('Cannot modify system roles');

    if (updateData.name) {
      const slug = updateData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      updateData.slug = slug;
    }

    Object.assign(role, updateData);
    await role.save();

    await AuditLogService.log({
      action: 'role_updated',
      resource: 'role',
      resourceId: role._id,
      performedBy: userId,
      tenantId: role.tenantId,
      message: `Role ${role.name} updated`
    });

    return Role.findById(roleId).populate('permissions');
  }

  static async deleteRole(roleId, userId) {
    const role = await Role.findById(roleId);
    if (!role) throw new Error('Role not found');

    const user = await User.findById(userId).populate('role');
    const canDelete = user.role?.name === 'super_admin' ||
                      (user.role?.name === 'tenant_admin' && role.tenantId?.toString() === user.tenantId.toString());

    if (!canDelete) throw new Error('Insufficient permissions');

    if (role.isSystemRole) throw new Error('Cannot delete system roles');

    const usersWithRole = await User.countDocuments({ role: roleId });
    if (usersWithRole > 0) throw new Error('Cannot delete role assigned to users');

    await Role.findByIdAndDelete(roleId);

    await AuditLogService.log({
      action: 'role_deleted',
      resource: 'role',
      resourceId: role._id,
      performedBy: userId,
      tenantId: role.tenantId,
      message: `Role ${role.name} deleted`
    });

    return { message: 'Role deleted successfully' };
  }

  static async assignRoleToUser(userId, roleId, currentUserId) {
    const user = await User.findById(userId).populate('tenantId');
    if (!user) throw new Error('User not found');

    const role = await Role.findOne({ _id: roleId, $or: [{ tenantId: user.tenantId }, { tenantId: null }] });
    if (!role) throw new Error('Role not found');

    const currentUser = await User.findById(currentUserId).populate('role');
    const canAssign = currentUser.role?.name === 'super_admin' ||
                      (currentUser.role?.name === 'tenant_admin' && user.tenantId.toString() === currentUser.tenantId.toString());

    if (!canAssign) throw new Error('Insufficient permissions');

    const oldRole = user.role;
    user.role = roleId;
    await user.save();

    await AuditLogService.log({
      action: 'role_assigned',
      resource: 'user',
      resourceId: userId,
      performedBy: currentUserId,
      tenantId: user.tenantId._id,
      details: { oldRole, newRole: roleId, roleName: role.name },
      message: `Role ${role.name} assigned to ${user.username}`
    });

    return User.findById(userId).populate('role');
  }

  static async getRolePermissions(roleId) {
    const role = await Role.findById(roleId).populate('permissions');
    if (!role) throw new Error('Role not found');
    return role.permissions;
  }

  static async userHasPermission(userId, resource, action) {
    const user = await User.findById(userId).populate({
      path: 'role',
      populate: { path: 'permissions' }
    });

    if (!user || !user.role) return false;
    if (user.role.name === 'super_admin') return true;

    return user.role.permissions.some(
      permission => permission.resource === resource && permission.action === action
    );
  }

  static async getPermissionsByCategory() {
    const permissions = await Permission.find().sort({ resource: 1, action: 1 });
    const categories = {};
    for (const perm of permissions) {
      if (!categories[perm.category]) categories[perm.category] = [];
      categories[perm.category].push(perm);
    }
    return categories;
  }
}

module.exports = RoleService;
