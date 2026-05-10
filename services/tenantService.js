const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Role = require('../models/Role');
const AuditLogService = require('./auditLogService');

class TenantService {
  static async createTenant(tenantData, createdBy) {
    const { name, slug, domain, description, plan = 'free', settings } = tenantData;

    const existingDomain = domain ? await Tenant.findOne({ domain }) : null;
    if (existingDomain) throw new Error('Domain already exists');

    const existingSlug = await Tenant.findOne({ slug: slug || name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
    if (existingSlug) throw new Error('Tenant slug already exists');

    const tenant = new Tenant({
      name,
      slug: slug || name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      domain,
      description,
      subscription: { plan },
      settings: settings || {},
      createdBy,
      status: 'active'
    });

    await tenant.save();

    if (createdBy) {
      await AuditLogService.log({
        action: 'tenant_created',
        resource: 'tenant',
        resourceId: tenant._id,
        performedBy: createdBy,
        tenantId: tenant._id,
        message: `Tenant ${tenant.name} created`
      });
    }

    return tenant;
  }

  static async onboardTenant(tenantData, adminData) {
    const session = await Tenant.startSession();
    session.startTransaction();

    try {
      const tenant = await Tenant.create([{
        name: tenantData.name,
        slug: tenantData.slug,
        domain: tenantData.domain,
        description: tenantData.description,
        subscription: { plan: tenantData.plan || 'free' },
        settings: tenantData.settings || {},
        contactEmail: adminData.email,
        status: 'active'
      }], { session });

      const createdTenant = tenant[0];

      const tenantAdminRole = await Role.findOne({ name: 'tenant_admin', tenantId: null });
      if (!tenantAdminRole) throw new Error('tenant_admin role not found');

      const adminUser = new User({
        username: adminData.username,
        email: adminData.email,
        password: adminData.password,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        tenantId: createdTenant._id,
        role: tenantAdminRole._id,
        status: adminData.skipVerification ? 'active' : 'pending_verification',
        emailVerified: adminData.skipVerification || false
      });

      await adminUser.save({ session });

      await session.commitTransaction();

      await AuditLogService.log({
        action: 'tenant_created',
        resource: 'tenant',
        resourceId: createdTenant._id,
        performedBy: adminUser._id,
        tenantId: createdTenant._id,
        message: `Tenant ${createdTenant.name} onboarded with admin ${adminUser.username}`
      });

      return {
        tenant: createdTenant,
        adminUser: {
          id: adminUser._id,
          username: adminUser.username,
          email: adminUser.email
        }
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getTenantById(tenantId) {
    const tenant = await Tenant.findById(tenantId).populate('createdBy', 'username email');
    if (!tenant) throw new Error('Tenant not found');
    return tenant;
  }

  static async getTenantBySlug(slug) {
    return Tenant.findOne({ slug, status: 'active' });
  }

  static async getTenantByDomain(domain) {
    return Tenant.findOne({ domain, status: 'active' });
  }

  static async updateTenant(tenantId, updateData, userId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const user = await User.findById(userId).populate('role');
    if (user.role?.name !== 'super_admin' && tenant.createdBy?.toString() !== userId.toString()) {
      throw new Error('Insufficient permissions');
    }

    const allowedFields = ['name', 'slug', 'domain', 'description', 'settings', 'subscription', 'branding', 'contactEmail'];
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        tenant[field] = updateData[field];
      }
    }

    await tenant.save();

    await AuditLogService.log({
      action: 'tenant_updated',
      resource: 'tenant',
      resourceId: tenant._id,
      performedBy: userId,
      tenantId: tenant._id,
      details: { fields: Object.keys(updateData) },
      message: `Tenant ${tenant.name} updated`
    });

    return tenant;
  }

  static async suspendTenant(tenantId, userId, reason) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    tenant.status = 'suspended';
    tenant.suspendedAt = new Date();
    tenant.suspendedBy = userId;
    tenant.suspensionReason = reason || 'Suspended by admin';
    await tenant.save();

    await User.updateMany({ tenantId }, { status: 'suspended' });

    await AuditLogService.log({
      action: 'tenant_suspended',
      resource: 'tenant',
      resourceId: tenant._id,
      performedBy: userId,
      tenantId: tenant._id,
      details: { reason },
      message: `Tenant ${tenant.name} suspended: ${reason}`
    });

    return tenant;
  }

  static async activateTenant(tenantId, userId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    tenant.status = 'active';
    tenant.suspendedAt = undefined;
    tenant.suspendedBy = undefined;
    tenant.suspensionReason = undefined;
    await tenant.save();

    await User.updateMany(
      { tenantId, status: 'suspended' },
      { $set: { status: 'active' } }
    );

    await AuditLogService.log({
      action: 'tenant_activated',
      resource: 'tenant',
      resourceId: tenant._id,
      performedBy: userId,
      tenantId: tenant._id,
      message: `Tenant ${tenant.name} activated`
    });

    return tenant;
  }

  static async getTenantStats(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const [userCount, activeUserCount, leadCount, clientCount] = await Promise.all([
      User.countDocuments({ tenantId }),
      User.countDocuments({ tenantId, status: 'active' }),
      require('../models/Lead').countDocuments({ tenantId }),
      require('../models/Client').countDocuments({ tenantId })
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const leadsThisMonth = await require('../models/Lead').countDocuments({
      tenantId,
      createdAt: { $gte: monthStart }
    });

    return {
      tenant: tenant.name,
      domain: tenant.domain,
      status: tenant.status,
      plan: tenant.subscription.plan,
      users: { total: userCount, active: activeUserCount, limit: tenant.settings.maxUsers },
      leads: { total: leadCount, thisMonth: leadsThisMonth, limit: tenant.settings.maxLeadsPerMonth },
      clients: clientCount
    };
  }

  static async listTenants(filters = {}, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.plan) query['subscription.plan'] = filters.plan;

    const [tenants, total] = await Promise.all([
      Tenant.find(query)
        .populate('createdBy', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Tenant.countDocuments(query)
    ]);

    return {
      tenants,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  static async deleteTenant(tenantId, userId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const user = await User.findById(userId).populate('role');
    if (user.role?.name !== 'super_admin') throw new Error('Only super admin can delete tenants');

    const Lead = require('../models/Lead');
    const Client = require('../models/Client');

    await Promise.all([
      User.deleteMany({ tenantId }),
      Lead.deleteMany({ tenantId }),
      Client.deleteMany({ tenantId }),
      Role.deleteMany({ tenantId })
    ]);

    await Tenant.findByIdAndDelete(tenantId);

    await AuditLogService.log({
      action: 'tenant_updated',
      resource: 'tenant',
      performedBy: userId,
      tenantId: null,
      message: `Tenant ${tenant.name} deleted`
    });

    return { message: 'Tenant deleted successfully' };
  }

  static async updateTenantUsage(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const userCount = await User.countDocuments({ tenantId, status: 'active' });
    tenant.settings.maxUsers = Math.max(tenant.settings.maxUsers, userCount);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const Lead = require('../models/Lead');
    const leadsThisMonth = await Lead.countDocuments({ tenantId, createdAt: { $gte: monthStart } });

    return {
      users: { current: userCount, limit: tenant.settings.maxUsers },
      leadsThisMonth,
      leadLimit: tenant.settings.maxLeadsPerMonth
    };
  }
}

module.exports = TenantService;
