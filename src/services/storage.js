const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Logical name -> bucket. Add a third bucket here and nothing else changes.
const BUCKETS = {
  vehicles: { name: process.env.VEHICLE_BUCKET, publicUrl: process.env.VEHICLE_BUCKET_PUBLIC_URL },
  avatars: { name: process.env.AVATAR_BUCKET, publicUrl: process.env.AVATAR_BUCKET_PUBLIC_URL },
};

const s3 = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: Boolean(process.env.S3_ENDPOINT), // needed by MinIO/R2/Supabase
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

function bucketFor(logical) {
  const b = BUCKETS[logical];
  if (!b || !b.name) throw new Error(`Bucket "${logical}" is not configured`);
  return b;
}

// Keys contain a uuid and are never overwritten, so they can be cached forever.
async function put(logical, key, file) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketFor(logical).name,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return key;
}

// Best effort: an orphaned object is harmless, a failed request must not break the API call.
async function remove(logical, key) {
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucketFor(logical).name, Key: key }));
  } catch (err) {
    console.error(`Failed to delete ${logical}/${key}:`, err.message);
  }
}

const url = (logical, key) => (key ? `${bucketFor(logical).publicUrl.replace(/\/$/, '')}/${key}` : null);

module.exports = { put, remove, url };
