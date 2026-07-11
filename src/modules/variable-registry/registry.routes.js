const router = require('express').Router()
const controller = require('./registry.controller')
const { authenticate } = require('../../middleware/auth')

router.use(authenticate)

router.get('/', (req, res) => controller.getAll(req, res))
router.get('/categories', (req, res) => controller.getCategories(req, res))
router.get('/search', (req, res) => controller.search(req, res))
router.get('/docs', (req, res) => controller.docs(req, res))
router.get('/preview', (req, res) => controller.preview(req, res))
router.get('/test-payload', (req, res) => controller.testPayload(req, res))
router.get('/:category', (req, res) => controller.getByCategory(req, res))
router.post('/validate', (req, res) => controller.validate(req, res))
router.post('/render', (req, res) => controller.render(req, res))

module.exports = router
