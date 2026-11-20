const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const users = require('../models/userModel');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { presentUser } = require('../utils/presenters');

const sign = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.valid.body;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await users.create({ username, email, passwordHash }); // 23505 handled globally
  res.status(201).json({ user: presentUser(user), token: sign(user.id) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.valid.body;
  const row = await users.findByEmailWithHash(email);
  const ok = row && (await bcrypt.compare(password, row.password_hash));
  if (!ok) throw new HttpError(401, 'Invalid email or password');
  const user = await users.findById(row.id);
  res.json({ user: presentUser(user), token: sign(user.id) });
});
