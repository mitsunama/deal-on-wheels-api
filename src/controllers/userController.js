const crypto = require('crypto');
const users = require('../models/userModel');
const storage = require('../services/storage');
const { EXT } = require('../middleware/upload');
const { presentUser } = require('../utils/presenters');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');

exports.getMe = asyncHandler(async (req, res) => {
  const user = await users.findById(req.user.id);
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ user: presentUser(user) });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await users.update(req.user.id, req.valid.body);
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ user: presentUser(user) });
});

// Upload new object -> point the DB at it -> delete the old object.
exports.setPicture = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No image uploaded (field name: avatar)');
  const key = `${req.user.id}/${crypto.randomUUID()}${EXT[req.file.mimetype]}`;
  await storage.put('avatars', key, req.file);

  let oldKey;
  try {
    oldKey = await users.setProfilePicture(req.user.id, key);
    if (oldKey === undefined) throw new HttpError(404, 'User not found');
  } catch (err) {
    await storage.remove('avatars', key);
    throw err;
  }
  await storage.remove('avatars', oldKey);
  res.json({ user: presentUser(await users.findById(req.user.id)) });
});

exports.removePicture = asyncHandler(async (req, res) => {
  const oldKey = await users.setProfilePicture(req.user.id, null);
  if (oldKey === undefined) throw new HttpError(404, 'User not found');
  await storage.remove('avatars', oldKey);
  res.status(204).end();
});
