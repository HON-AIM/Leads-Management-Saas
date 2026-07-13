const { z } = require('zod');

const createCampaign = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'paused', 'draft']).optional(),
});

const updateCampaign = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'paused', 'draft']).optional(),
});

const createBuyer = z.object({
  name: z.string().min(1, 'Buyer name is required').max(200),
  email: z.string().email('Invalid email'),
  phone: z.string().max(20).optional(),
  leadCap: z.number().int().min(0).optional(),
  dailyCap: z.number().int().min(0).optional(),
  monthlyCap: z.number().int().min(0).optional(),
  pricePerLead: z.number().min(0).optional(),
  weight: z.number().int().min(1).optional(),
  priority: z.number().int().optional(),
  allowedStates: z.array(z.string().max(2)).optional(),
  delivery: z.object({
    provider: z.enum(['none', 'webhook', 'ghl']).optional(),
    url: z.string().url().optional(),
    apiKey: z.string().optional(),
    locationId: z.string().optional(),
    secret: z.string().optional(),
  }).optional(),
  schedule: z.object({
    enabled: z.boolean().optional(),
    timezone: z.string().optional(),
    days: z.array(z.number().int().min(0).max(6)).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  }).optional(),
}).strict();

const updateBuyer = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  status: z.enum(['active', 'paused', 'inactive', 'full']).optional(),
  leadCap: z.number().int().min(0).optional(),
  dailyCap: z.number().int().min(0).optional(),
  monthlyCap: z.number().int().min(0).optional(),
  pricePerLead: z.number().min(0).optional(),
  weight: z.number().int().min(1).optional(),
  priority: z.number().int().optional(),
  allowedStates: z.array(z.string().max(2)).optional(),
  delivery: z.object({
    provider: z.enum(['none', 'webhook', 'ghl']).optional(),
    url: z.string().url().optional().nullable(),
    apiKey: z.string().optional(),
    locationId: z.string().optional(),
    secret: z.string().optional(),
  }).optional(),
  schedule: z.object({
    enabled: z.boolean().optional(),
    timezone: z.string().optional(),
    days: z.array(z.number().int().min(0).max(6)).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  }).optional(),
}).strict();

const createLead = z.object({
  name: z.string().min(1, 'Lead name is required').max(200),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().max(20).optional(),
  state: z.string().max(2).optional(),
  source: z.string().max(100).optional(),
  customFields: z.record(z.any()).optional(),
}).strict();

const updateLead = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  state: z.string().max(2).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'rejected', 'duplicate']).optional(),
  customFields: z.record(z.any()).optional(),
}).strict();

const login = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  tenantSlug: z.string().min(1, 'Workspace is required'),
});

const changePassword = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).strict();

const inviteUser = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(200),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'member']).default('member'),
}).strict();

module.exports = {
  createCampaign,
  updateCampaign,
  createBuyer,
  updateBuyer,
  createLead,
  updateLead,
  login,
  changePassword,
  inviteUser,
};
