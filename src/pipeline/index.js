const { createContext } = require('./context')
const logger = require('../utils/logger')

const validate = require('./stages/validate')
const normalize = require('./stages/normalize')
const dedup = require('./stages/dedup')
const campaignLookup = require('./stages/campaign')
const buyerFilter = require('./stages/buyerFilter')
const capFilter = require('./stages/capFilter')
const stateFilter = require('./stages/stateFilter')
const assign = require('./stages/assign')
const deliver = require('./stages/deliver')
const log = require('./stages/log')

const STAGES = [
  { name: 'validate', fn: validate },
  { name: 'normalize', fn: normalize },
  { name: 'dedup', fn: dedup },
  { name: 'campaign', fn: campaignLookup },
  { name: 'buyerFilter', fn: buyerFilter },
  { name: 'capFilter', fn: capFilter },
  { name: 'stateFilter', fn: stateFilter },
  { name: 'assign', fn: assign },
  { name: 'deliver', fn: deliver },
  { name: 'log', fn: log },
]

async function runPipeline(input) {
  const ctx = createContext(input)

  for (const stage of STAGES) {
    if (ctx.stop) break

    try {
      await stage.fn(ctx)
    } catch (err) {
      logger.error(`Pipeline stage "${stage.name}" failed`, {
        leadId: ctx.lead?._id,
        error: err.message,
      })
      ctx.stop = true
      ctx.stopReason = `Stage "${stage.name}" failed: ${err.message}`
      ctx.error = err
    }
  }

  ctx.durationMs = Date.now() - ctx.startTime
  return ctx
}

async function runPartialPipeline(input, stageNames) {
  const ctx = createContext(input)
  const stageMap = Object.fromEntries(STAGES.map((s) => [s.name, s.fn]))

  for (const name of stageNames) {
    if (ctx.stop) break
    const fn = stageMap[name]
    if (!fn) throw new Error(`Unknown pipeline stage: "${name}"`)

    try {
      await fn(ctx)
    } catch (err) {
      logger.error(`Pipeline stage "${name}" failed`, {
        leadId: ctx.lead?._id,
        error: err.message,
      })
      ctx.stop = true
      ctx.stopReason = `Stage "${name}" failed: ${err.message}`
      ctx.error = err
    }
  }

  ctx.durationMs = Date.now() - ctx.startTime
  return ctx
}

module.exports = { runPipeline, runPartialPipeline, STAGES: STAGES.map((s) => s.name) }
