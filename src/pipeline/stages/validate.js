function validate(ctx) {
  const { lead } = ctx
  if (!lead) {
    ctx.stop = true
    ctx.stopReason = 'No lead provided'
    return
  }
  if (!lead.name || !lead.name.trim()) {
    ctx.stop = true
    ctx.stopReason = 'Lead missing required field: name'
    return
  }
}

module.exports = validate
