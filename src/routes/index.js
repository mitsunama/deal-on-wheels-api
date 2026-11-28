const router = require('express').Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/vehicles', require('./vehicleRoutes'));
router.use('/wishlist', require('./wishlistRoutes'));
router.use('/transactions', require('./transactionRoutes'));

module.exports = router;
