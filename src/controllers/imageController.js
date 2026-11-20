const crypto = require('crypto');
const vehicles = require('../models/vehicleModel');
const images = require('../models/vehicleImageModel');
const storage = require('../services/storage');
const { EXT } = require('../middleware/upload');
const { presentImage } = require('../utils/presenters');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');

exports.add = asyncHandler(async (req, res) => {
  const vehicleId = req.valid.params.id;
  const files = req.files || [];
  if (!files.length) throw new HttpError(400, 'No images uploaded (field name: images)');
  await vehicles.assertOwner(vehicleId, req.user.id);

  // 1) objects to the bucket, 2) rows to the DB. If 2 fails, delete what 1 wrote.
  const keys = files.map((f) => `${vehicleId}/${crypto.randomUUID()}${EXT[f.mimetype]}`);
  try {
    await Promise.all(files.map((f, i) => storage.put('vehicles', keys[i], f)));
    const created = await images.addMany(vehicleId, keys);
    res.status(201).json({ images: created.map(presentImage) });
  } catch (err) {
    await Promise.all(keys.map((k) => storage.remove('vehicles', k)));
    throw err;
  }
});

exports.remove = asyncHandler(async (req, res) => {
  const { id, imageId } = req.valid.params;
  await vehicles.assertOwner(id, req.user.id);
  const row = await images.remove(id, imageId); // DB first: a leftover object is harmless
  if (!row) throw new HttpError(404, 'Image not found');
  await storage.remove('vehicles', row.storage_path);
  res.status(204).end();
});
