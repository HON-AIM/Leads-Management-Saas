function getCampaignArchivePlan(campaign = {}) {
  if (campaign.isArchived || campaign.status === 'archived') {
    return {
      action: 'delete',
      hardDelete: true,
      updates: {},
    };
  }

  return {
    action: 'archive',
    hardDelete: false,
    updates: {
      status: 'archived',
      isArchived: true,
      archivedAt: new Date(),
    },
  };
}

module.exports = {
  getCampaignArchivePlan,
};
