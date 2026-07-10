const service = require('./registry.service')
const { success, error, badRequest } = require('../../utils/response')

class RegistryController {
  async getAll(req, res) {
    try {
      return success(res, service.getAll())
    } catch (err) {
      return error(res, err.message)
    }
  }

  async getCategories(req, res) {
    try {
      const categories = service.getCategories()
      const formatted = Object.entries(categories).map(([name, vars]) => ({
        name,
        count: vars.length,
        variables: vars,
      }))
      return success(res, formatted)
    } catch (err) {
      return error(res, err.message)
    }
  }

  async search(req, res) {
    try {
      const { q } = req.query
      if (!q) return success(res, service.getAll())
      return success(res, service.search(q))
    } catch (err) {
      return error(res, err.message)
    }
  }

  async getByCategory(req, res) {
    try {
      const { category } = req.params
      const vars = service.getByCategory(category)
      if (!vars.length) return badRequest(res, `Unknown category: ${category}`)
      return success(res, vars)
    } catch (err) {
      return error(res, err.message)
    }
  }

  async validate(req, res) {
    try {
      const { template } = req.body
      if (typeof template !== 'string') return badRequest(res, 'template is required')
      return success(res, service.validateTemplate(template))
    } catch (err) {
      return error(res, err.message)
    }
  }

  async render(req, res) {
    try {
      const { template, context } = req.body
      if (typeof template !== 'string') return badRequest(res, 'template is required')
      if (!context || typeof context !== 'object') return badRequest(res, 'context object is required')
      return success(res, { rendered: service.renderTemplate(template, context) })
    } catch (err) {
      return error(res, err.message)
    }
  }

  async preview(req, res) {
    try {
      return success(res, service.generatePreview())
    } catch (err) {
      return error(res, err.message)
    }
  }

  async testPayload(req, res) {
    try {
      return success(res, service.generateTestPayload())
    } catch (err) {
      return error(res, err.message)
    }
  }

  async docs(req, res) {
    try {
      return success(res, service.getDocs())
    } catch (err) {
      return error(res, err.message)
    }
  }
}

module.exports = new RegistryController()
