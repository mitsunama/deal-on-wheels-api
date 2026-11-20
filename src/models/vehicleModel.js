const db = require('../config/db');
const HttpError = require('../utils/HttpError');

// API field -> DB column (whitelist for dynamic UPDATE)
const COLUMNS = {
  title: 'title', brand: 'brand', model: 'model', year: 'year',
  mileageKm: 'mileage_km', transmission: 'transmission', fuelType: 'fuel_type',
  city: 'city', price: 'price', description: 'description', specs: 'specs',
};

const SORTS = {
  newest: 'v.created_at DESC',
  price_asc: 'v.price ASC, v.id',
  price_desc: 'v.price DESC, v.id',
  year_desc: 'v.year DESC, v.id',
};

async function list(f) {
  const where = ['v.deleted_at IS NULL', 'v.status = $1'];
  const params = [f.status];
  const add = (sql, val) => {
    params.push(val);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (f.brand) add('lower(v.brand) = lower(?)', f.brand);
  if (f.model) add('lower(v.model) = lower(?)', f.model);
  if (f.city) add('lower(v.city) = lower(?)', f.city);
  if (f.year) add('v.year = ?', f.year);
  if (f.minPrice) add('v.price >= ?', f.minPrice);
  if (f.maxPrice) add('v.price <= ?', f.maxPrice);
  if (f.specs) add('v.specs @> ?::jsonb', JSON.stringify(f.specs));

  params.push(f.limit, (f.page - 1) * f.limit);
  const { rows } = await db.query(
    `SELECT v.id, v.seller_id, v.title, v.brand, v.model, v.year, v.mileage_km,
            v.city, v.price, v.status, v.created_at,
            (SELECT storage_path FROM vehicle_images i
              WHERE i.vehicle_id = v.id ORDER BY i.position, i.created_at LIMIT 1) AS cover_image,
            count(*) OVER() AS total
       FROM vehicles v
      WHERE ${where.join(' AND ')}
      ORDER BY ${SORTS[f.sort]}
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const total = rows[0] ? Number(rows[0].total) : 0;
  return { total, items: rows.map(({ total: _t, ...r }) => r) };
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT v.*, u.username AS seller_username,
            COALESCE((SELECT json_agg(json_build_object('id', i.id, 'storage_path', i.storage_path, 'position', i.position)
                                      ORDER BY i.position, i.created_at)
                        FROM vehicle_images i WHERE i.vehicle_id = v.id), '[]') AS images
       FROM vehicles v
       JOIN users u ON u.id = v.seller_id
      WHERE v.id = $1 AND v.deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
}

async function create(sellerId, d) {
  const { rows } = await db.query(
    `INSERT INTO vehicles
       (seller_id, title, brand, model, year, mileage_km, transmission, fuel_type, city, price, description, specs)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12::jsonb, '{}'::jsonb))
     RETURNING *`,
    [sellerId, d.title, d.brand, d.model, d.year, d.mileageKm ?? null, d.transmission ?? null,
     d.fuelType ?? null, d.city ?? null, d.price, d.description ?? null,
     d.specs ? JSON.stringify(d.specs) : null]
  );
  return rows[0];
}

// Throws 404 (missing/deleted) or 403 (not the seller). Returns { id, seller_id, status }.
async function assertOwner(vehicleId, userId, client = db) {
  const { rows } = await client.query(
    'SELECT id, seller_id, status FROM vehicles WHERE id = $1 AND deleted_at IS NULL',
    [vehicleId]
  );
  const v = rows[0];
  if (!v) throw new HttpError(404, 'Vehicle not found');
  if (v.seller_id !== userId) throw new HttpError(403, 'You do not own this vehicle');
  return v;
}

// Only editable while 'available' so a buyer's pending deal can't be changed under them.
async function update(id, sellerId, changes) {
  const sets = [];
  const params = [id, sellerId];
  for (const [key, col] of Object.entries(COLUMNS)) {
    if (changes[key] === undefined) continue;
    params.push(key === 'specs' ? JSON.stringify(changes[key]) : changes[key]);
    sets.push(`${col} = $${params.length}${key === 'specs' ? '::jsonb' : ''}`);
  }
  const { rows } = await db.query(
    `UPDATE vehicles SET ${sets.join(', ')}, updated_at = now()
      WHERE id = $1 AND seller_id = $2 AND deleted_at IS NULL AND status = 'available'
      RETURNING *`,
    params
  );
  if (rows[0]) return rows[0];

  const v = await assertOwner(id, sellerId);
  throw new HttpError(409, `Vehicle is ${v.status} and cannot be edited`);
}

async function softDelete(id, sellerId) {
  const { rowCount } = await db.query(
    `UPDATE vehicles SET deleted_at = now(), updated_at = now()
      WHERE id = $1 AND seller_id = $2 AND deleted_at IS NULL AND status = 'available'`,
    [id, sellerId]
  );
  if (rowCount) return;

  const v = await assertOwner(id, sellerId);
  throw new HttpError(409, `Vehicle is ${v.status} and cannot be deleted`);
}

module.exports = { list, findById, create, update, softDelete, assertOwner };
