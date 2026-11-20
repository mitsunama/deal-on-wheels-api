const router = require('express').Router();
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadAvatar } = require('../middleware/upload');
const s = require('../validators/schemas');
const c = require('../controllers/userController');

router.use(authenticate);
router.get('/me', c.getMe);
router.patch('/me', validate({ body: s.updateProfile }), c.updateMe);
router.put('/me/picture', uploadAvatar, c.setPicture);
router.delete('/me/picture', c.removePicture);

module.exports = router;
