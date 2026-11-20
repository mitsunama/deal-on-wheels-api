const db = require('../config/db');

const PUBLIC = 'id, username, email, description, profile_picture_path, created_at';

async function create({ username, email, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO users (username, email, password_hash) VALUES ($1,$2,$3) RETURNING ${PUBLIC}`,
    [username, email, passwordHash]
  );
  return rows[0];
}

// Only place password_hash is returned. Used by login.
async function findByEmailWithHash(email) {
  const { rows } = await db.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${PUBLIC} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function update(id, { username, description }) {
  const { rows } = await db.query(
    `UPDATE users
        SET username    = COALESCE($2, username),
            description = CASE WHEN $3::boolean THEN $4 ELSE description END
      WHERE id = $1
      RETURNING ${PUBLIC}`,
    [id, username ?? null, description !== undefined, description ?? null]
  );
  return rows[0] || null;
}

// Sets (or clears, with null) the picture key and returns the previous key so the caller can delete the old object.
async function setProfilePicture(id, key) {
  const { rows } = await db.query(
    `UPDATE users u SET profile_picture_path = $2
       FROM (SELECT id, profile_picture_path AS old_path FROM users WHERE id = $1 FOR UPDATE) o
      WHERE u.id = o.id
      RETURNING o.old_path`,
    [id, key]
  );
  return rows[0] ? rows[0].old_path : undefined; // undefined = user not found
}

module.exports = { create, findByEmailWithHash, findById, update, setProfilePicture };
