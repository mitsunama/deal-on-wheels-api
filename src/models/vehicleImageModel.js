const { withTransaction, query } = require('../config/db');

// Inserts all keys atomically; each gets the next free position for the vehicle.
function addMany(vehicleId, keys) {
  return withTransaction(async (client) => {
    const created = [];
    for (const key of keys) {
      const { rows } = await client.query(
        `INSERT INTO vehicle_images (vehicle_id, storage_path, position)
         SELECT $1, $2, COALESCE(MAX(position) + 1, 0) FROM vehicle_images WHERE vehicle_id = $1
         RETURNING *`,
        [vehicleId, key]
      );
      created.push(rows[0]);
    }
    return created;
  });
}

// Returns the deleted row (so the caller can remove the object) or null.
async function remove(vehicleId, imageId) {
  const { rows } = await query(
    'DELETE FROM vehicle_images WHERE id = $1 AND vehicle_id = $2 RETURNING *',
    [imageId, vehicleId]
  );
  return rows[0] || null;
}

module.exports = { addMany, remove };
