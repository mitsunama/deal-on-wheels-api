const wishlist = require('../models/wishlistModel');
const { presentListItem } = require('../utils/presenters');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const { items, total } = await wishlist.list(req.user.id, q);
  res.json({ items: items.map(presentListItem), page: q.page, limit: q.limit, total });
});

exports.ids = asyncHandler(async (req, res) => {
  res.json({ ids: await wishlist.ids(req.user.id) });
});

exports.add = asyncHandler(async (req, res) => {
  const ok = await wishlist.add(req.user.id, req.valid.params.id);
  if (!ok) throw new HttpError(404, 'Vehicle not found');
  res.status(204).end();
});

exports.remove = asyncHandler(async (req, res) => {
  await wishlist.remove(req.user.id, req.valid.params.id);
  res.status(204).end();
});
