/**
 * Duplicate Lead Guard Tests
 *
 * Validates the 6-layer defense-in-depth that prevents duplicate leads
 * from ever reaching routing, assignment, or delivery.
 */

// ---------------------------------------------------------------------------
// Mocks — set up BEFORE requiring any modules
// ---------------------------------------------------------------------------

// Mock logger to suppress output and allow assertions
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
jest.mock('../src/utils/logger', () => mockLogger);

// Mock Lead model
const mockLeadFindById = jest.fn();
const mockLeadFindByIdAndUpdate = jest.fn();
jest.mock('../src/models/Lead', () => ({
  findById: mockLeadFindById,
  findByIdAndUpdate: mockLeadFindByIdAndUpdate,
}));

// Mock Campaign model
const mockCampaignFindById = jest.fn();
jest.mock('../src/models/Campaign', () => ({
  findById: mockCampaignFindById,
}));

// Mock Supplier model
jest.mock('../src/models/Supplier', () => ({
  findById: jest.fn().mockResolvedValue(null),
}));

// Mock pipeline
const mockRunPipeline = jest.fn();
jest.mock('../src/pipeline', () => ({
  runPipeline: mockRunPipeline,
}));

// Mock DeliveryAttempt model
jest.mock('../src/models/DeliveryAttempt', () => ({
  countDocuments: jest.fn().mockResolvedValue(0),
  create: jest.fn().mockResolvedValue({}),
}));

// Mock LeadAssignment model
jest.mock('../src/models/LeadAssignment', () => ({
  findByIdAndUpdate: jest.fn().mockResolvedValue({}),
}));

// Mock leadService
jest.mock('../src/services/leadService', () => ({
  markDelivered: jest.fn(),
  markFailed: jest.fn(),
}));

// Mock payloadTemplateService
jest.mock('../src/services/payloadTemplateService', () => ({
  DEFAULT_PAYLOAD_TEMPLATE: '{"test": "value"}',
  resolveTemplate: jest.fn().mockReturnValue('{"test": "resolved"}'),
}));

// Mock responseParsingService
jest.mock('../src/services/responseParsingService', () => ({
  evaluateAcceptanceFromJson: jest.fn().mockReturnValue({ accepted: true, reason: 'ok' }),
}));

// Mock leadAssignmentRepository
jest.mock('../src/repositories/leadAssignmentRepository', () => ({
  create: jest.fn().mockResolvedValue({ _id: 'assignment-1' }),
  findByLead: jest.fn().mockResolvedValue(null),
}));

// Mock buyerService
jest.mock('../src/services/buyerService', () => ({
  incrementCaps: jest.fn(),
}));

// Mock routing strategies
jest.mock('../src/pipeline/strategies', () => ({
  getStrategy: jest.fn().mockReturnValue({
    select: jest.fn().mockImplementation((ctx) => {
      ctx.selectedBuyer = {
        buyer: { _id: 'buyer-1', name: 'Test Buyer', pricePerLead: 10 },
      };
    }),
  }),
}));

// Mock Setting
jest.mock('../src/models/Setting', () => ({
  findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockReturnValue({ catch: jest.fn().mockReturnValue(null) }) }),
}));

// Mock leadRepository
jest.mock('../src/repositories/leadRepository', () => ({
  findDuplicate: jest.fn().mockResolvedValue(null),
  findByIdAndUpdate: jest.fn(),
}));

// Mock deduplication utils
jest.mock('../src/utils/deduplication', () => ({
  normalizeEmailForDedup: jest.fn(),
  normalizePhoneForDedup: jest.fn(),
  shouldBlockDuplicate: jest.fn().mockReturnValue(false),
}));

// Mock routingLogRepository
jest.mock('../src/repositories/routingLogRepository', () => ({
  create: jest.fn().mockResolvedValue({ _id: 'log-1' }),
}));

// Mock config
jest.mock('../src/config', () => ({
  delivery: { maxRetries: 1, timeoutMs: 5000, initialDelayMs: 1000 },
  redis: { host: 'localhost', port: 6379 },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLead(overrides = {}) {
  return {
    _id: 'lead-123',
    name: 'Test Lead',
    email: 'test@example.com',
    phone: '1234567890',
    state: 'TX',
    status: 'new',
    isDuplicate: false,
    duplicateOf: null,
    tenantId: 'tenant-1',
    campaignId: 'campaign-1',
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeDuplicateLead(overrides = {}) {
  return makeLead({
    status: 'duplicate',
    isDuplicate: true,
    duplicateOf: 'lead-original',
    ...overrides,
  });
}

function makeCampaign() {
  return {
    _id: 'campaign-1',
    name: 'Test Campaign',
    status: 'active',
    routingMode: 'round_robin',
    costPerLead: 5,
    assignedBuyers: [{ buyerId: 'buyer-1' }],
  };
}

function makeBuyer() {
  return {
    _id: 'buyer-1',
    name: 'Test Buyer',
    email: 'buyer@example.com',
    status: 'active',
    pricePerLead: 10,
    delivery: {
      provider: 'webhook',
      url: 'https://example.com/webhook',
      payloadTemplate: '{"name": "{{name}}"}',
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Duplicate Lead Guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Test 1: Normal lead flows through pipeline (regression safety)
  // =========================================================================
  describe('Test 1: Normal lead flows through pipeline', () => {
    it('should call runPipeline for a non-duplicate lead', async () => {
      const lead = makeLead();
      const campaign = makeCampaign();

      mockLeadFindById.mockResolvedValue(lead);
      mockCampaignFindById.mockResolvedValue(campaign);
      mockRunPipeline.mockResolvedValue({
        assignment: { _id: 'assignment-1' },
        selectedBuyer: { buyer: makeBuyer() },
        deliveryResult: { success: true },
      });

      const { processLead } = require('../src/queue/leadProcessor');
      const result = await processLead({
        leadId: 'lead-123',
        campaignId: 'campaign-1',
        tenantId: 'tenant-1',
      });

      // Pipeline MUST have been called
      expect(mockRunPipeline).toHaveBeenCalledTimes(1);
      expect(result.status).not.toBe('duplicate');
    });
  });

  // =========================================================================
  // Test 2: Duplicate lead stops at leadProcessor (Layer 2)
  // =========================================================================
  describe('Test 2: Duplicate lead stops at leadProcessor', () => {
    it('should return early and never call runPipeline for a duplicate lead', async () => {
      const lead = makeDuplicateLead();
      const campaign = makeCampaign();

      mockLeadFindById.mockResolvedValue(lead);
      mockCampaignFindById.mockResolvedValue(campaign);

      const { processLead } = require('../src/queue/leadProcessor');
      const result = await processLead({
        leadId: 'lead-123',
        campaignId: 'campaign-1',
        tenantId: 'tenant-1',
      });

      // Pipeline must NOT have been called
      expect(mockRunPipeline).not.toHaveBeenCalled();
      expect(result.status).toBe('duplicate');
      expect(result.reason).toContain('Duplicate');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Lead processor skipped duplicate lead',
        expect.objectContaining({ leadId: 'lead-123' }),
      );
    });

    it('should also catch leads with status=duplicate but isDuplicate=false (data inconsistency)', async () => {
      const lead = makeLead({ status: 'duplicate', isDuplicate: false });
      const campaign = makeCampaign();

      mockLeadFindById.mockResolvedValue(lead);
      mockCampaignFindById.mockResolvedValue(campaign);

      const { processLead } = require('../src/queue/leadProcessor');
      const result = await processLead({
        leadId: 'lead-123',
        campaignId: 'campaign-1',
        tenantId: 'tenant-1',
      });

      expect(mockRunPipeline).not.toHaveBeenCalled();
      expect(result.status).toBe('duplicate');
    });
  });

  // =========================================================================
  // Test 3: Duplicate lead stops at pipeline dedup stage (Layer 3)
  // =========================================================================
  describe('Test 3: Duplicate lead stops at pipeline dedup stage', () => {
    it('should set ctx.stop=true when lead.isDuplicate is true', async () => {
      const dedup = require('../src/pipeline/stages/dedup');
      const ctx = {
        lead: makeDuplicateLead(),
        tenantId: 'tenant-1',
        stop: false,
        stopReason: null,
      };

      await dedup(ctx);

      expect(ctx.stop).toBe(true);
      expect(ctx.stopReason).toBe('Lead is a duplicate');
    });
  });

  // =========================================================================
  // Test 4: attemptDelivery rejects duplicate leads (Layer 6)
  // =========================================================================
  describe('Test 4: attemptDelivery rejects duplicate leads', () => {
    it('should return immediately without making any HTTP request', async () => {
      const { attemptDelivery } = require('../src/services/deliveryAttemptService');
      const lead = makeDuplicateLead();
      const buyer = makeBuyer();

      const result = await attemptDelivery({
        leadAssignment: { _id: 'assignment-1' },
        lead,
        buyer,
        triggeredBy: 'automatic',
        tenantId: 'tenant-1',
      });

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('Blocked: duplicate lead');
      expect(result.durationMs).toBe(0);

      // Should NOT have created any DeliveryAttempt records
      const DeliveryAttempt = require('../src/models/DeliveryAttempt');
      expect(DeliveryAttempt.create).not.toHaveBeenCalled();

      // Should have logged a warning
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'attemptDelivery called with duplicate lead — blocked',
        expect.objectContaining({ leadId: lead._id }),
      );
    });

    it('should also block manual_retry triggered deliveries', async () => {
      const { attemptDelivery } = require('../src/services/deliveryAttemptService');

      const result = await attemptDelivery({
        leadAssignment: { _id: 'assignment-1' },
        lead: makeDuplicateLead(),
        buyer: makeBuyer(),
        triggeredBy: 'manual_retry',
        tenantId: 'tenant-1',
      });

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('Blocked: duplicate lead');
    });
  });

  // =========================================================================
  // Test 5: canReassignOrAssign blocks duplicate leads
  // =========================================================================
  describe('Test 5: canReassignOrAssign blocks duplicate leads', () => {
    it('should return allowed=false with clear reason for duplicate leads', async () => {
      // canReassignOrAssign is not exported directly, so we test it
      // through the assign pipeline stage which has its own guard
      const assign = require('../src/pipeline/stages/assign');
      const ctx = {
        lead: makeDuplicateLead(),
        campaign: makeCampaign(),
        tenantId: 'tenant-1',
        stop: false,
        stopReason: null,
        selectedBuyer: null,
        buyerPool: [],
      };

      await assign(ctx);

      expect(ctx.stop).toBe(true);
      expect(ctx.stopReason).toBe('Duplicate lead rejected at assignment stage');
      expect(ctx.selectedBuyer).toBeNull();

      // incrementCaps should NOT have been called
      const buyerService = require('../src/services/buyerService');
      expect(buyerService.incrementCaps).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Test 6: Deliver stage blocks duplicate leads (Layer 5)
  // =========================================================================
  describe('Test 6: Deliver stage blocks duplicate leads', () => {
    it('should set ctx.stop and never call attemptDelivery', async () => {
      const deliver = require('../src/pipeline/stages/deliver');
      const ctx = {
        lead: makeDuplicateLead(),
        assignment: { _id: 'assignment-1' },
        selectedBuyer: { buyer: makeBuyer() },
        campaign: makeCampaign(),
        stop: false,
        stopReason: null,
        deliveryResult: null,
      };

      await deliver(ctx);

      expect(ctx.stop).toBe(true);
      expect(ctx.stopReason).toBe('Duplicate lead rejected at delivery stage');
      expect(ctx.deliveryResult).toBeNull();

      // No delivery attempt should have been created
      const DeliveryAttempt = require('../src/models/DeliveryAttempt');
      expect(DeliveryAttempt.create).not.toHaveBeenCalled();
    });
  });
});
