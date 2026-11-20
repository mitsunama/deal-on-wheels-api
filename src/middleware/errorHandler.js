const HttpError = require('../utils/HttpError');

const CONSTRAINT_MESSAGES = {
  users_username_key: 'Username already taken',
  users_email_key: 'Email already registered',
  one_active_deal_per_vehicle: 'Vehicle already has an active deal',
};

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.name === 'MulterError') return res.status(400).json({ error: err.message });

  // Postgres error codes
  switch (err.code) {
    case '23505': // unique_violation
      return res.status(409).json({ error: CONSTRAINT_MESSAGES[err.constraint] || 'Duplicate value' });
    case '23503': // foreign_key_violation
      return res.status(409).json({ error: 'Referenced record missing or still in use' });
    case '23514': // check_violation
    case '22P02': // invalid_text_representation (e.g. bad uuid)
      return res.status(400).json({ error: 'Invalid data' });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
