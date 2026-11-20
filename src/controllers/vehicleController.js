const vehicles = require('../models/vehicleModel');
const { presentVehicle, presentListItem } = require('../utils/presenters');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const { items, total } = await vehicles.list(q);
  res.json({ items: items.map(presentListItem), page: q.page, limit: q.limit, total });
});

exports.get = asyncHandler(async (req, res) => {
  const vehicle = await vehicles.findById(req.valid.params.id);
  if (!vehicle) throw new HttpError(404, 'Vehicle not found');
  res.json({ vehicle: presentVehicle(vehicle) });
});

exports.create = asyncHandler(async (req, res) => {
  const vehicle = await vehicles.create(req.user.id, req.valid.body);
  res.status(201).json({ vehicle });
});

exports.update = asyncHandler(async (req, res) => {
  const vehicle = await vehicles.update(req.valid.params.id, req.user.id, req.valid.body);
  res.json({ vehicle });
});

exports.remove = asyncHandler(async (req, res) => {
  await vehicles.softDelete(req.valid.params.id, req.user.id);
  res.status(204).end();
});
