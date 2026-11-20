const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');
const c = require('../controllers/authController');

router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));

router.post('/register', validate({ body: s.register }), c.register);
router.post('/login', validate({ body: s.login }), c.login);

module.exports = router;
