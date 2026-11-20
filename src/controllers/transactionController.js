const transactions = require('../models/transactionModel');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  const transaction = await transactions.create({
    vehicleId: req.valid.params.id,
    buyerId: req.user.id,
    agreedPrice: req.valid.body.agreedPrice,
  });
  res.status(201).json({ transaction });
});

exports.list = asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const { items, total } = await transactions.listForUser(req.user.id, q);
  res.json({ items, page: q.page, limit: q.limit, total });
});

exports.get = asyncHandler(async (req, res) => {
  const transaction = await transactions.findForUser(req.valid.params.id, req.user.id);
  if (!transaction) throw new HttpError(404, 'Transaction not found');
  res.json({ transaction });
});

exports.complete = asyncHandler(async (req, res) => {
  const transaction = await transactions.complete(req.valid.params.id, req.user.id);
  res.json({ transaction });
});

exports.cancel = asyncHandler(async (req, res) => {
  const transaction = await transactions.cancel(req.valid.params.id, req.user.id);
  res.json({ transaction });
});
