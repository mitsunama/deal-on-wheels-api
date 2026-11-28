const router = require('express').Router();
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');
const ctrl = require('../controllers/wishlistController');

// Every wishlist route needs a logged-in user.
router.use(authenticate);

router.get('/', validate({ query: s.listWishlistQuery }), ctrl.list);
router.get('/ids', ctrl.ids);
router.put('/:id', validate({ params: s.idParam }), ctrl.add);
router.delete('/:id', validate({ params: s.idParam }), ctrl.remove);

module.exports = router;
