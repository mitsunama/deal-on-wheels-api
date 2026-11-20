const { withTransaction, query } = require('../config/db');
const HttpError = require('../utils/HttpError');

/**
 * Lock order is always: vehicle row, then transaction row. Keeping one order
 * everywhere prevents deadlocks between concurrent create/complete/cancel calls.
 */
async function lockTransaction(client, txId) {
  const pre = await client.query('SELECT vehicle_id FROM transactions WHERE id = $1', [txId]);
  if (!pre.rows[0]) throw new HttpError(404, 'Transaction not found');
  await client.query('SELECT id FROM vehicles WHERE id = $1 FOR UPDATE', [pre.rows[0].vehicle_id]);
  const { rows } = await client.query('SELECT * FROM transactions WHERE id = $1 FOR UPDATE', [txId]);
  return rows[0];
}

const isParticipant = (tx, userId) => tx.buyer_id === userId || tx.seller_id === userId;

// Buyer starts a deal. vehicles: available -> pending
function create({ vehicleId, buyerId, agreedPrice }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, seller_id, status, price FROM vehicles
        WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [vehicleId]
    );
    const v = rows[0];
    if (!v) throw new HttpError(404, 'Vehicle not found');
    if (v.seller_id === buyerId) throw new HttpError(400, 'You cannot buy your own vehicle');
    if (v.status !== 'available') throw new HttpError(409, 'Vehicle is not available');

    // Unique index one_active_deal_per_vehicle is the backstop; error handler maps 23505 -> 409.
    const tx = await client.query(
      `INSERT INTO transactions (vehicle_id, seller_id, buyer_id, agreed_price)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [vehicleId, v.seller_id, buyerId, agreedPrice ?? v.price]
    );
    await client.query(`UPDATE vehicles SET status = 'pending', updated_at = now() WHERE id = $1`, [vehicleId]);
    return tx.rows[0];
  });
}

// Seller confirms the sale. transactions: pending -> completed, vehicles: pending -> sold
function complete(txId, actorId) {
  return withTransaction(async (client) => {
    const tx = await lockTransaction(client, txId);
    if (!isParticipant(tx, actorId)) throw new HttpError(404, 'Transaction not found');
    if (tx.seller_id !== actorId) throw new HttpError(403, 'Only the seller can complete a transaction');
    if (tx.status !== 'pending') throw new HttpError(409, `Transaction is already ${tx.status}`);

    const { rows } = await client.query(
      `UPDATE transactions SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING *`,
      [txId]
    );
    await client.query(`UPDATE vehicles SET status = 'sold', updated_at = now() WHERE id = $1`, [tx.vehicle_id]);
    return rows[0];
  });
}

// Buyer or seller backs out. transactions: pending -> cancelled, vehicles: pending -> available
function cancel(txId, actorId) {
  return withTransaction(async (client) => {
    const tx = await lockTransaction(client, txId);
    if (!isParticipant(tx, actorId)) throw new HttpError(404, 'Transaction not found');
    if (tx.status !== 'pending') throw new HttpError(409, `Transaction is already ${tx.status}`);

    const { rows } = await client.query(
      `UPDATE transactions SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [txId]
    );
    await client.query(`UPDATE vehicles SET status = 'available', updated_at = now() WHERE id = $1`, [tx.vehicle_id]);
    return rows[0];
  });
}

// Only participants can read a transaction.
async function findForUser(txId, userId) {
  const { rows } = await query(
    `SELECT t.*, v.title AS vehicle_title, v.brand, v.model, v.year,
            bu.username AS buyer_username, su.username AS seller_username
       FROM transactions t
       JOIN vehicles v  ON v.id = t.vehicle_id
       JOIN users bu    ON bu.id = t.buyer_id
       JOIN users su    ON su.id = t.seller_id
      WHERE t.id = $1 AND (t.buyer_id = $2 OR t.seller_id = $2)`,
    [txId, userId]
  );
  return rows[0] || null;
}

async function listForUser(userId, { role, status, page, limit }) {
  const params = [userId];
  let who = '(t.buyer_id = $1 OR t.seller_id = $1)';
  if (role === 'buyer') who = 't.buyer_id = $1';
  if (role === 'seller') who = 't.seller_id = $1';

  const where = [who];
  if (status) {
    params.push(status);
    where.push(`t.status = $${params.length}`);
  }
  params.push(limit, (page - 1) * limit);

  const { rows } = await query(
    `SELECT t.*, v.title AS vehicle_title, count(*) OVER() AS total
       FROM transactions t
       JOIN vehicles v ON v.id = t.vehicle_id
      WHERE ${where.join(' AND ')}
      ORDER BY t.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const total = rows[0] ? Number(rows[0].total) : 0;
  return { total, items: rows.map(({ total: _t, ...r }) => r) };
}

module.exports = { create, complete, cancel, findForUser, listForUser };
