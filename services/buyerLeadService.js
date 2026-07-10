function buildBuyerLeadFilter({ tenantId, buyerId, query = {} }) {
  const filter = { tenantId, assignedTo: buyerId };

  if (query.status) filter.status = query.status;
  if (query.state) filter.state = query.state.toUpperCase();
  if (query.deliveryStatus) filter.deliveryStatus = query.deliveryStatus;
  if (query.source) filter.source = query.source;
  if (query.campaign) filter.campaign = query.campaign;

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { phone: { $regex: query.search, $options: 'i' } },
      { state: { $regex: query.search, $options: 'i' } },
      { source: { $regex: query.search, $options: 'i' } },
      { campaign: { $regex: query.search, $options: 'i' } },
    ];
  }

  return filter;
}

function summarizeBuyerLeadStats(leads = []) {
  return leads.reduce(
    (summary, lead) => {
      summary.total += 1;
      if (lead.deliveryStatus === 'delivered' || lead.status === 'converted') {
        summary.delivered += 1;
      }
      if (lead.status === 'converted') {
        summary.converted += 1;
      }
      if (lead.status === 'assigned' && lead.deliveryStatus !== 'delivered') {
        summary.inProgress += 1;
      }
      if (lead.status === 'pending' || lead.deliveryStatus === 'pending') {
        summary.pending += 1;
      }
      return summary;
    },
    { total: 0, pending: 0, inProgress: 0, delivered: 0, converted: 0 }
  );
}

module.exports = {
  buildBuyerLeadFilter,
  summarizeBuyerLeadStats,
};
