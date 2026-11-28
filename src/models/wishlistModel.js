const db = require('../config/db');

// Ids only: lets the app mark hearts on the showroom without loading vehicles.
async function ids(userId) {
  const { rows } = await db.query(
    `SELECT w.vehicle_id
       FROM wishlist_items w
       JOIN vehicles v ON v.id = w.vehicle_id AND v.deleted_at IS NULL
      WHERE w.user_id = $1`,
    [userId]
  );
  return rows.map((r) => r.vehicle_id);
}

// Same columns as the showroom list, newest saved first. All statuses are
// returned so a saved vehicle that was sold still shows up (as "sold").
async function list(userId, { page, limit }) {
  const { rows } = await db.query(
    `SELECT v.id, v.seller_id, v.vehicle_type, v.title, v.brand, v.model, v.year, v.mileage_km,
            v.city, v.price, v.status, v.created_at,
            (SELECT storage_path FROM vehicle_images i
              WHERE i.vehicle_id = v.id ORDER BY i.position, i.created_at LIMIT 1) AS cover_image,
            count(*) OVER() AS total
       FROM wishlist_items w
       JOIN vehicles v ON v.id = w.vehicle_id AND v.deleted_at IS NULL
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC, v.id
      LIMIT $2 OFFSET $3`,
    [userId, limit, (page - 1) * limit]
  );
  const total = rows[0] ? Number(rows[0].total) : 0;
  return { total, items: rows.map(({ total: _t, ...r }) => r) };
}

// Idempotent: adding twice is fine. Returns false if the vehicle doesn't exist.
async function add(userId, vehicleId) {
  const { rowCount } = await db.query(
    `INSERT INTO wishlist_items (user_id, vehicle_id)
     SELECT $1, v.id FROM vehicles v WHERE v.id = $2 AND v.deleted_at IS NULL
     ON CONFLICT DO NOTHING`,
    [userId, vehicleId]
  );
  if (rowCount > 0) return true;
  const { rows } = await db.query(
    `SELECT 1 FROM vehicles WHERE id = $1 AND deleted_at IS NULL`,
    [vehicleId]
  );
  return rows.length > 0;
}

async function remove(userId, vehicleId) {
  await db.query(`DELETE FROM wishlist_items WHERE user_id = $1 AND vehicle_id = $2`, [
    userId,
    vehicleId,
  ]);
}

module.exports = { ids, list, add, remove };
