const Supplier = require('../models/Supplier');

class SupplierRepository {
  async create(data) {
    return Supplier.create(data);
  }

  async findById(id, tenantId) {
    return Supplier.findOne({ _id: id, tenantId });
  }

  async findByKey(supplierKey, tenantId) {
    return Supplier.findOne({ supplierKey, tenantId, status: 'active' });
  }

  async findInTenant(tenantId, { page = 1, limit = 50, status, search } = {}) {
    const query = { tenantId };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Supplier.countDocuments(query),
    ]);
    return { suppliers, total, page, pages: Math.ceil(total / limit) };
  }

  async findByIdAndUpdate(id, tenantId, data) {
    return Supplier.findOneAndUpdate({ _id: id, tenantId }, data, { new: true, runValidators: true });
  }

  async findByIdAndDelete(id, tenantId) {
    return Supplier.findOneAndDelete({ _id: id, tenantId });
  }

  async incrementLeadsReceived(supplierId, tenantId) {
    return Supplier.findOneAndUpdate(
      { _id: supplierId, tenantId },
      { $inc: { totalLeadsReceived: 1 }, $set: { lastLeadAt: new Date() } },
      { new: true }
    );
  }

  async save(supplier) {
    return supplier.save();
  }
}

module.exports = new SupplierRepository();
