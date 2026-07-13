const crypto = require('crypto');
const supplierRepo = require('../repositories/supplierRepository');

function generateSupplierKey() {
  return 'sk_' + crypto.randomBytes(24).toString('hex');
}

class SupplierService {
  async create(data, tenantId) {
    const supplierKey = data.supplierKey || generateSupplierKey();
    return supplierRepo.create({ ...data, supplierKey, tenantId });
  }

  async getById(id, tenantId) {
    return supplierRepo.findById(id, tenantId);
  }

  async getByKey(supplierKey, tenantId) {
    return supplierRepo.findByKey(supplierKey, tenantId);
  }

  async list(tenantId, filters) {
    return supplierRepo.findInTenant(tenantId, filters);
  }

  async update(id, tenantId, data) {
    return supplierRepo.findByIdAndUpdate(id, tenantId, data);
  }

  async delete(id, tenantId) {
    return supplierRepo.findByIdAndDelete(id, tenantId);
  }

  async incrementLeadsReceived(supplierId, tenantId) {
    return supplierRepo.incrementLeadsReceived(supplierId, tenantId);
  }
}

module.exports = new SupplierService();
