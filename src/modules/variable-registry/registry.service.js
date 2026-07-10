const registry = require('./registry')

class RegistryService {
  getAll() {
    return registry.getAll()
  }

  getByKey(key) {
    return registry.getByKey(key)
  }

  getCategories() {
    return registry.getCategories()
  }

  search(query) {
    return registry.search(query)
  }

  getByCategory(category) {
    return registry.getByCategory(category)
  }

  getPayloadVariables() {
    return registry.getPayloadVariables()
  }

  getPreviewVariables() {
    return registry.getPreviewVariables()
  }

  validateTemplate(template) {
    return registry.validateTemplate(template)
  }

  renderTemplate(template, context) {
    return registry.renderTemplate(template, context)
  }

  generatePreview() {
    return registry.generatePreview()
  }

  generateTestPayload() {
    return registry.generateTestPayload()
  }

  resolveValue(path, context) {
    return registry.resolveValue(path, context)
  }

  getDocs() {
    const categories = registry.getCategories()
    return Object.entries(categories).map(([name, vars]) => ({
      category: name,
      variables: vars.map((v) => ({
        variable: v.key,
        description: v.description,
        example: v.example,
        type: v.type,
      })),
    }))
  }
}

module.exports = new RegistryService()
