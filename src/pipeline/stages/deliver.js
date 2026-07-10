const https = require('https')
const http = require('http')
const leadAssignmentRepo = require('../../repositories/leadAssignmentRepository')
const leadService = require('../../services/leadService')
const config = require('../../config')
const logger = require('../../utils/logger')

async function deliver(ctx) {
  const { assignment, lead, selectedBuyer } = ctx
  if (!assignment || !selectedBuyer) return

  const buyer = selectedBuyer.buyer

  if (!buyer.delivery || buyer.delivery.provider === 'none' || !buyer.delivery.url) {
    await leadAssignmentRepo.updateStatus(assignment._id, 'delivered', { deliveredAt: new Date() })
    await leadService.markDelivered(lead._id, lead.tenantId)
    ctx.deliveryResult = { success: true, method: 'no-op' }
    return
  }

  const payload = buildPayload(lead, buyer)
  const maxRetries = config.delivery.maxRetries
  const timeout = config.delivery.timeoutMs
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      attempt++
      const response = await post(buyer.delivery.url, payload, {
        secret: buyer.delivery.secret,
        timeout,
      })

      if (response.statusCode >= 200 && response.statusCode < 300) {
        await leadAssignmentRepo.updateStatus(assignment._id, 'delivered', { deliveredAt: new Date() })
        await leadService.markDelivered(lead._id, lead.tenantId)
        ctx.deliveryResult = { success: true, statusCode: response.statusCode, attempt }
        return
      }

      logger.warn('Delivery failed', {
        assignmentId: assignment._id,
        statusCode: response.statusCode,
        attempt,
      })
    } catch (err) {
      logger.warn('Delivery error', {
        assignmentId: assignment._id,
        error: err.message,
        attempt,
      })
    }

    if (attempt < maxRetries) await delay(attempt * config.delivery.initialDelayMs)
  }

  await leadAssignmentRepo.updateStatus(assignment._id, 'failed', {
    failureReason: `Failed after ${maxRetries} attempts`,
  })
  await leadService.markFailed(lead._id, lead.tenantId)
  ctx.deliveryResult = { success: false, attempts: maxRetries }
}

function buildPayload(lead, buyer) {
  return {
    lead: {
      id: lead._id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      state: lead.state,
      source: lead.source,
    },
    buyer: { id: buyer._id, name: buyer.name },
    timestamp: new Date().toISOString(),
  }
}

function post(url, body, { secret, timeout } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const transport = parsed.protocol === 'https:' ? https : http
    const data = JSON.stringify(body)

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    }
    if (secret) headers['X-Webhook-Secret'] = secret

    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers,
        timeout,
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }))
      }
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    req.write(data)
    req.end()
  })
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

module.exports = deliver
