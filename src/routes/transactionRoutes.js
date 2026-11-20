const router = require('express').Router();
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');
const c = require('../controllers/transactionController');

router.use(authenticate);

router.get('/', validate({ query: s.listTransactionsQuery }), c.list);
router.get('/:id', validate({ params: s.idParam }), c.get);
router.post('/:id/complete', validate({ params: s.idParam }), c.complete); // seller only
router.post('/:id/cancel', validate({ params: s.idParam }), c.cancel);     // buyer or seller

module.exports = router;
