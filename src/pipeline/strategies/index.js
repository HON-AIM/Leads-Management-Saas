const roundRobin = require('./roundRobin')
const weighted = require('./weighted')
const priority = require('./priority')
const random = require('./random')

const registry = {
  round_robin: roundRobin,
  weighted: weighted,
  priority: priority,
  exclusive: priority,
  random: random,
}

function getStrategy(mode) {
  return registry[mode] || registry.round_robin
}

function registerStrategy(mode, strategy) {
  registry[mode] = strategy
}

function listStrategies() {
  return Object.keys(registry)
}

module.exports = { getStrategy, registerStrategy, listStrategies }
