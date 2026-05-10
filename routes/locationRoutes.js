const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');

const Country = require('../models/Country');
const Region = require('../models/Region');
const Territory = require('../models/Territory');
const NormalizationRun = require('../models/NormalizationRun');
const Lead = require('../models/Lead');
const { authenticate, tenantIsolation, authorize, requirePermission } = require('../middleware/auth');
const { normalizeLocation, normalizeBulk } = require('../src/services/location/locationIntelligenceService');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Countries ────────────────────────────────────────────────────────────────

router.get('/countries', authenticate, tenantIsolation, async (req, res) => {
  try {
    const countries = await Country.find()
      .sort({ name: 1 })
      .lean();

    const enriched = await Promise.all(countries.map(async (c) => {
      const totalRegions = await Region.countDocuments({ country_iso2: c.iso2 });
      const totalTerritories = await Territory.countDocuments({ country_code: c.iso2 });
      return {
        _id: c._id,
        name: c.name,
        code: c.iso2,
        iso3: c.iso3,
        phone_code: c.phone_code,
        currency: c.currency,
        timezone: c.timezone,
        continent: c.continent,
        status: c.active ? 'active' : 'inactive',
        totalRegions,
        totalTerritories,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    }));

    res.json({ success: true, countries: enriched });
  } catch (err) {
    console.error('❌ LOCATION COUNTRIES ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/countries', authenticate, tenantIsolation, requirePermission('locations', 'create'), async (req, res) => {
  try {
    const { name, code, status } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Name and code are required' });
    }
    const existing = await Country.findOne({ iso2: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Country with this code already exists' });
    }
    const country = await Country.create({
      name,
      iso2: code.toUpperCase(),
      iso3: code.toUpperCase(),
      active: status !== 'inactive',
    });
    res.status(201).json({ success: true, country });
  } catch (err) {
    console.error('❌ CREATE COUNTRY ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/countries/:id', authenticate, tenantIsolation, requirePermission('locations', 'update'), async (req, res) => {
  try {
    const { name, code, status } = req.body;
    const update = {};
    if (name) update.name = name;
    if (code) { update.iso2 = code.toUpperCase(); update.iso3 = code.toUpperCase(); }
    if (status !== undefined) update.active = status === 'active';

    const country = await Country.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
    if (!country) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }
    res.json({ success: true, country });
  } catch (err) {
    console.error('❌ UPDATE COUNTRY ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/countries/:id', authenticate, tenantIsolation, requirePermission('locations', 'delete'), async (req, res) => {
  try {
    const country = await Country.findByIdAndDelete(req.params.id);
    if (!country) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }
    await Region.deleteMany({ country_iso2: country.iso2 });
    res.json({ success: true, message: 'Country deleted' });
  } catch (err) {
    console.error('❌ DELETE COUNTRY ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Regions ──────────────────────────────────────────────────────────────────

router.get('/regions', authenticate, tenantIsolation, async (req, res) => {
  try {
    const filter = {};
    if (req.query.countryCode) {
      filter.country_iso2 = req.query.countryCode.toUpperCase();
    }

    const regions = await Region.find(filter)
      .sort({ name: 1 })
      .lean();

    const countries = await Country.find().select('iso2 name').lean();
    const countryMap = {};
    for (const c of countries) {
      countryMap[c.iso2] = c.name;
    }

    const enriched = await Promise.all(regions.map(async (r) => {
      const totalTerritories = await Territory.countDocuments({ regions: r.code, country_code: r.country_iso2 });
      return {
        _id: r._id,
        name: r.name,
        code: r.code,
        countryId: r.country_iso2,
        countryName: countryMap[r.country_iso2] || r.country_iso2,
        type: r.type,
        status: r.active ? 'active' : 'inactive',
        totalTerritories,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    }));

    res.json({ success: true, regions: enriched });
  } catch (err) {
    console.error('❌ LOCATION REGIONS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/regions/:countryCode', authenticate, tenantIsolation, async (req, res) => {
  try {
    const code = req.params.countryCode.toUpperCase();
    const regions = await Region.find({ country_iso2: code, active: true })
      .select('name code type')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, country_code: code, regions });
  } catch (err) {
    console.error('❌ LOCATION REGIONS BY COUNTRY ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/regions', authenticate, tenantIsolation, requirePermission('locations', 'create'), async (req, res) => {
  try {
    const { name, code, countryId, status } = req.body;
    if (!name || !code || !countryId) {
      return res.status(400).json({ success: false, error: 'Name, code, and countryId are required' });
    }
    const country = await Country.findOne({ iso2: countryId.toUpperCase() });
    if (!country) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }
    const existing = await Region.findOne({ country_iso2: countryId.toUpperCase(), code: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Region already exists in this country' });
    }
    const region = await Region.create({
      country_iso2: countryId.toUpperCase(),
      name,
      code: code.toUpperCase(),
      active: status !== 'inactive',
    });
    res.status(201).json({ success: true, region });
  } catch (err) {
    console.error('❌ CREATE REGION ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/regions/:id', authenticate, tenantIsolation, requirePermission('locations', 'update'), async (req, res) => {
  try {
    const { name, code, countryId, status } = req.body;
    const update = {};
    if (name) update.name = name;
    if (code) update.code = code.toUpperCase();
    if (countryId) update.country_iso2 = countryId.toUpperCase();
    if (status !== undefined) update.active = status === 'active';

    const region = await Region.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
    if (!region) {
      return res.status(404).json({ success: false, error: 'Region not found' });
    }
    res.json({ success: true, region });
  } catch (err) {
    console.error('❌ UPDATE REGION ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/regions/:id', authenticate, tenantIsolation, requirePermission('locations', 'delete'), async (req, res) => {
  try {
    const region = await Region.findByIdAndDelete(req.params.id);
    if (!region) {
      return res.status(404).json({ success: false, error: 'Region not found' });
    }
    res.json({ success: true, message: 'Region deleted' });
  } catch (err) {
    console.error('❌ DELETE REGION ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Territories ──────────────────────────────────────────────────────────────

router.get('/territories', authenticate, tenantIsolation, async (req, res) => {
  try {
    const filter = { tenant_id: req.tenantId };
    if (req.query.countryCode) {
      filter.country_code = req.query.countryCode.toUpperCase();
    }
    if (req.query.regionCode) {
      filter.regions = req.query.regionCode.toUpperCase();
    }

    const territories = await Territory.find(filter)
      .sort({ name: 1 })
      .lean();

    const countries = await Country.find().select('iso2 name').lean();
    const countryMap = {};
    for (const c of countries) {
      countryMap[c.iso2] = c.name;
    }

    const regions = await Region.find().select('code name country_iso2').lean();
    const regionMap = {};
    for (const r of regions) {
      regionMap[r.code] = r;
    }

    const enriched = territories.map((t) => ({
      _id: t._id,
      name: t.name,
      code: t.country_code + '-' + (t.regions[0] || 'XX'),
      regionId: t.regions[0] || '',
      regionName: regionMap[t.regions[0]]?.name || t.regions[0] || '',
      countryId: t.country_code,
      countryName: countryMap[t.country_code] || t.country_code,
      status: t.active ? 'active' : 'inactive',
      regions: t.regions,
      cities: t.cities,
      postal_codes: t.postal_codes,
      priority: 0,
      assignedDriver: t.metadata?.driver || '',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    res.json({ success: true, territories: enriched });
  } catch (err) {
    console.error('❌ TERRITORIES LIST ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/territories', authenticate, tenantIsolation, requirePermission('locations', 'create'), async (req, res) => {
  try {
    const { name, regionId, countryId, status, priority, assignedDriver } = req.body;
    if (!name || !countryId) {
      return res.status(400).json({ success: false, error: 'Name and countryId are required' });
    }

    const territory = await Territory.create({
      tenant_id: req.tenantId,
      name,
      country_code: countryId.toUpperCase(),
      regions: regionId ? [regionId.toUpperCase()] : [],
      active: status !== 'inactive',
      metadata: {
        driver: assignedDriver || '',
        priority: priority || 0,
      },
    });

    res.status(201).json({ success: true, territory });
  } catch (err) {
    console.error('❌ CREATE TERRITORY ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/territories/:id', authenticate, tenantIsolation, requirePermission('locations', 'update'), async (req, res) => {
  try {
    const { name, regionId, countryId, status, priority, assignedDriver } = req.body;
    const update = {};
    if (name) update.name = name;
    if (countryId) update.country_code = countryId.toUpperCase();
    if (regionId) update.regions = [regionId.toUpperCase()];
    if (status !== undefined) update.active = status === 'active';
    update.metadata = { driver: assignedDriver || '', priority: priority || 0 };

    const territory = await Territory.findOneAndUpdate(
      { _id: req.params.id, tenant_id: req.tenantId },
      update,
      { new: true, runValidators: true }
    ).lean();

    if (!territory) {
      return res.status(404).json({ success: false, error: 'Territory not found' });
    }
    res.json({ success: true, territory });
  } catch (err) {
    console.error('❌ UPDATE TERRITORY ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/territories/:id', authenticate, tenantIsolation, requirePermission('locations', 'delete'), async (req, res) => {
  try {
    const territory = await Territory.findOneAndDelete({ _id: req.params.id, tenant_id: req.tenantId });
    if (!territory) {
      return res.status(404).json({ success: false, error: 'Territory not found' });
    }
    res.json({ success: true, message: 'Territory deleted' });
  } catch (err) {
    console.error('❌ DELETE TERRITORY ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Search ───────────────────────────────────────────────────────────────────

router.get('/search', authenticate, tenantIsolation, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, results: [] });
    }
    const regex = new RegExp(escapeRegex(q), 'i');
    const [countries, regions] = await Promise.all([
      Country.find({
        active: true,
        $or: [
          { name: regex },
          { iso2: regex },
          { iso3: regex },
          { aliases: q.toLowerCase() },
        ],
      }).select('name iso2 iso3 phone_code continent').limit(5).lean(),
      Region.find({
        active: true,
        $or: [
          { name: regex },
          { code: regex },
          { aliases: q.toLowerCase() },
        ],
      }).select('name code country_iso2 type').limit(10).lean(),
    ]);
    res.json({ success: true, results: { countries, regions } });
  } catch (err) {
    console.error('❌ LOCATION SEARCH ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Normalization ────────────────────────────────────────────────────────────

router.post('/normalize', authenticate, tenantIsolation, async (req, res) => {
  try {
    const payloads = Array.isArray(req.body) ? req.body : [req.body];
    const options = { tenantId: req.tenantId };
    const results = await normalizeBulk(payloads, options);
    const single = !Array.isArray(req.body);
    res.json({ success: true, results: single ? results[0] : results });
  } catch (err) {
    console.error('❌ NORMALIZE ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/normalization/runs', authenticate, tenantIsolation, async (req, res) => {
  try {
    const runs = await NormalizationRun.find({ tenant_id: req.tenantId })
      .sort({ started_at: -1 })
      .limit(50)
      .lean();

    const mapped = runs.map((r) => ({
      _id: r._id,
      runId: r.run_id,
      totalProcessed: r.total_processed,
      normalized: r.normalized,
      ambiguous: r.ambiguous,
      failed: r.failed,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      status: r.status,
    }));

    res.json({ success: true, runs: mapped });
  } catch (err) {
    console.error('❌ NORMALIZATION RUNS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/normalization/run', authenticate, tenantIsolation, requirePermission('locations', 'normalize'), async (req, res) => {
  try {
    const runId = `norm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const run = await NormalizationRun.create({
      tenant_id: req.tenantId,
      run_id: runId,
      status: 'running',
      started_at: new Date(),
    });

    setTimeout(async () => {
      try {
        const leads = await Lead.find({
          tenantId: req.tenantId,
          $or: [
            { location_confidence_score: { $lt: 0.5 } },
            { location_confidence_score: { $exists: false } },
          ],
        }).limit(500).lean();

        let normalized = 0;
        let ambiguous = 0;
        let failed = 0;

        for (const lead of leads) {
          try {
            const payload = {
              country: lead.raw_country || lead.normalized_country_code,
              state: lead.normalized_region_name || lead.normalized_region_code,
              city: lead.normalized_city,
            };
            const result = await normalizeLocation(payload, { tenantId: req.tenantId });
            if (result.confidence_level === 'unknown' || result.confidence_level === 'very_low') {
              failed++;
            } else if (result.confidence_level === 'low') {
              ambiguous++;
            } else {
              normalized++;
            }
          } catch {
            failed++;
          }
        }

        await NormalizationRun.findByIdAndUpdate(run._id, {
          status: 'completed',
          total_processed: leads.length,
          normalized,
          ambiguous,
          failed,
          completed_at: new Date(),
        });
      } catch (err) {
        await NormalizationRun.findByIdAndUpdate(run._id, {
          status: 'failed',
          error: err.message,
          completed_at: new Date(),
        });
      }
    }, 100);

    res.status(202).json({ success: true, runId });
  } catch (err) {
    console.error('❌ START NORMALIZATION ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Ambiguous Leads ──────────────────────────────────────────────────────────

router.get('/ambiguous-leads', authenticate, tenantIsolation, async (req, res) => {
  try {
    const leads = await Lead.find({
      tenantId: req.tenantId,
      location_confidence_level: { $in: ['low', 'unknown'] },
    })
      .select('_id raw_country normalized_country_code normalized_region_code normalized_city location_confidence_score location_confidence_level createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const mapped = leads.map((l) => ({
      _id: l._id,
      originalAddress: [l.raw_country, l.normalized_region_code, l.normalized_city].filter(Boolean).join(', ') || 'Unknown address',
      suggestions: [
        {
          address: [l.normalized_country_code, l.normalized_region_code, l.normalized_city].filter(Boolean).join(', '),
          lat: 0,
          lng: 0,
          confidence: l.location_confidence_score || 0,
        },
      ],
      status: 'pending',
      createdAt: l.createdAt,
    }));

    res.json({ success: true, leads: mapped });
  } catch (err) {
    console.error('❌ AMBIGUOUS LEADS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/ambiguous-leads/:id/accept', authenticate, tenantIsolation, async (req, res) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      {
        $set: {
          location_confidence_level: 'high',
          location_routable: true,
          location_confidence_score: 0.9,
          location_enriched_at: new Date(),
        },
      },
      { new: true }
    );
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, message: 'Suggestion accepted' });
  } catch (err) {
    console.error('❌ ACCEPT SUGGESTION ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/ambiguous-leads/:id/reject', authenticate, tenantIsolation, async (req, res) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      {
        $set: {
          location_routable: false,
          location_enriched_at: new Date(),
        },
      },
      { new: true }
    );
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, message: 'Lead rejected' });
  } catch (err) {
    console.error('❌ REJECT LEAD ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Stats & Analytics ────────────────────────────────────────────────────────

router.get('/stats', authenticate, tenantIsolation, async (req, res) => {
  try {
    const [totalCountries, totalRegions, totalTerritories, leadStats] = await Promise.all([
      Country.countDocuments({ active: true }),
      Region.countDocuments({ active: true }),
      Territory.countDocuments({ tenant_id: req.tenantId, active: true }),
      Lead.aggregate([
        { $match: { tenantId: req.tenantId } },
        {
          $group: {
            _id: null,
            totalLeadsWithLocation: {
              $sum: { $cond: [{ $ifNull: ['$normalized_country_code', false] }, 1, 0] },
            },
            totalAmbiguousLeads: {
              $sum: { $cond: [{ $in: ['$location_confidence_level', ['low', 'unknown']] }, 1, 0] },
            },
            avgConfidence: { $avg: '$location_confidence_score' },
          },
        },
      ]),
    ]);

    const summary = {
      totalCountries,
      totalRegions,
      totalTerritories,
      totalLeadsWithLocation: leadStats[0]?.totalLeadsWithLocation || 0,
      totalAmbiguousLeads: leadStats[0]?.totalAmbiguousLeads || 0,
      avgConfidence: leadStats[0]?.avgConfidence || 0,
    };

    res.json({ success: true, data: { summary } });
  } catch (err) {
    console.error('❌ LOCATION STATS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/analytics', authenticate, tenantIsolation, async (req, res) => {
  try {
    const [totalCountries, totalRegions, totalTerritories, leadStats, topCountriesAgg, topRegionsAgg, qualityAgg] = await Promise.all([
      Country.countDocuments({ active: true }),
      Region.countDocuments({ active: true }),
      Territory.countDocuments({ tenant_id: req.tenantId, active: true }),
      Lead.aggregate([
        { $match: { tenantId: req.tenantId } },
        {
          $group: {
            _id: null,
            totalLeadsWithLocation: {
              $sum: { $cond: [{ $ifNull: ['$normalized_country_code', false] }, 1, 0] },
            },
            totalAmbiguousLeads: {
              $sum: { $cond: [{ $in: ['$location_confidence_level', ['low', 'unknown']] }, 1, 0] },
            },
            avgConfidence: { $avg: '$location_confidence_score' },
          },
        },
      ]),
      Lead.aggregate([
        { $match: { tenantId: req.tenantId, normalized_country_code: { $exists: true, $ne: '' } } },
        { $group: { _id: '$normalized_country_code', leads: { $sum: 1 } } },
        { $sort: { leads: -1 } },
        { $limit: 10 },
      ]),
      Lead.aggregate([
        { $match: { tenantId: req.tenantId, normalized_region_code: { $exists: true, $ne: '' } } },
        { $group: { _id: { region: '$normalized_region_code', country: '$normalized_country_code' }, leads: { $sum: 1 } } },
        { $sort: { leads: -1 } },
        { $limit: 10 },
      ]),
      Lead.aggregate([
        { $match: { tenantId: req.tenantId } },
        {
          $bucket: {
            groupBy: '$location_confidence_score',
            boundaries: [0, 0.25, 0.5, 0.75, 1.01],
            default: 'unknown',
            output: { count: { $sum: 1 } },
          },
        },
      ]),
    ]);

    const totalLocated = topCountriesAgg.reduce((s, c) => s + c.leads, 0) || 1;

    const topCountries = topCountriesAgg.map((c) => ({
      name: c._id || 'Unknown',
      leads: c.leads,
      percentage: parseFloat(((c.leads / totalLocated) * 100).toFixed(1)),
    }));

    const countryNames = await Country.find({ iso2: { $in: topCountriesAgg.map((c) => c._id) } })
      .select('iso2 name')
      .lean();
    const nameMap = {};
    for (const cn of countryNames) nameMap[cn.iso2] = cn.name;

    const topCountriesNamed = topCountries.map((c) => ({
      ...c,
      name: nameMap[c.name] || c.name,
    }));

    const topRegions = topRegionsAgg.map((r) => ({
      name: r._id.region || 'Unknown',
      country: r._id.country || '',
      leads: r.leads,
    }));

    const qualityRanges = ['0-25%', '25-50%', '50-75%', '75-100%'];
    const normalizationQuality = qualityRanges.map((range, i) => ({
      range,
      count: qualityAgg[i]?.count || 0,
    }));

    const totalQuality = normalizationQuality.reduce((s, q) => s + q.count, 0) || 1;
    const normalizationQualityPct = normalizationQuality.map((q) => ({
      ...q,
      count: parseFloat(((q.count / totalQuality) * 100).toFixed(1)),
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalCountries,
          totalRegions,
          totalTerritories,
          totalLeadsWithLocation: leadStats[0]?.totalLeadsWithLocation || 0,
          totalAmbiguousLeads: leadStats[0]?.totalAmbiguousLeads || 0,
          avgConfidence: leadStats[0]?.avgConfidence || 0,
        },
        topCountries: topCountriesNamed,
        topRegions,
        normalizationQuality: normalizationQualityPct,
      },
    });
  } catch (err) {
    console.error('❌ LOCATION ANALYTICS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Seed ─────────────────────────────────────────────────────────────────────

router.get('/seed', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { seedAll } = require('../src/data/geoDataSeeder');
    const result = await seedAll();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('❌ SEED ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
