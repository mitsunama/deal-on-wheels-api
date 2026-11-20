const router = require('express').Router();
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadImages } = require('../middleware/upload');
const s = require('../validators/schemas');
const vehicleCtrl = require('../controllers/vehicleController');
const imageCtrl = require('../controllers/imageController');
const transactionCtrl = require('../controllers/transactionController');

// Public
router.get('/', validate({ query: s.listVehiclesQuery }), vehicleCtrl.list);
router.get('/:id', validate({ params: s.idParam }), vehicleCtrl.get);

// Seller
router.post('/', authenticate, validate({ body: s.createVehicle }), vehicleCtrl.create);
router.patch('/:id', authenticate, validate({ params: s.idParam, body: s.updateVehicle }), vehicleCtrl.update);
router.delete('/:id', authenticate, validate({ params: s.idParam }), vehicleCtrl.remove);

// Images (authenticate BEFORE multer so anonymous users can't write files)
router.post('/:id/images', authenticate, uploadImages, validate({ params: s.idParam }), imageCtrl.add);
router.delete('/:id/images/:imageId', authenticate, validate({ params: s.idAndImageParam }), imageCtrl.remove);

// Buyer starts a deal on a vehicle
router.post(
  '/:id/transactions',
  authenticate,
  validate({ params: s.idParam, body: s.createTransaction }),
  transactionCtrl.create
);

module.exports = router;
