require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Buyer = require('./src/models/Buyer');
  const User = require('./src/models/User');

  const tenant = await User.findOne({email:'admin@leaddistro.com'}).lean();
  const tenantId = tenant.tenantId;

  await Buyer.updateMany({tenantId}, {$set: {leadsReceived:0, dailyLeadsReceived:0, monthlyLeadsReceived:0}});
  console.log('Reset all buyer counters to 0');

  const buyers = await Buyer.find({tenantId}).lean();
  for (const b of buyers) {
    if (b.name === 'TEST1') {
      await Buyer.updateOne({_id: b._id}, {$set: {leadCap: 10, dailyCap: 5}});
      console.log('TEST1: leadCap=10, dailyCap=5');
    } else if (b.name === 'JOHN DOE') {
      await Buyer.updateOne({_id: b._id}, {$set: {leadCap: 8}});
      console.log('JOHN DOE: leadCap=8');
    } else if (b.name === 'PURE TEST') {
      await Buyer.updateOne({_id: b._id}, {$set: {leadCap: 5, dailyCap: 3}});
      console.log('PURE TEST: leadCap=5, dailyCap=3');
    } else if (b.name === 'ISRAEL ADEOSUN') {
      await Buyer.updateOne({_id: b._id}, {$set: {leadCap: 0}});
      console.log('ISRAEL: unlimited');
    }
  }

  const updated = await Buyer.find({tenantId}).lean();
  console.log('\n=== UPDATED BUYERS ===');
  updated.forEach(b => console.log(JSON.stringify({name:b.name, leadCap:b.leadCap, dailyCap:b.dailyCap, leadsReceived:b.leadsReceived})));

  mongoose.disconnect();
});
