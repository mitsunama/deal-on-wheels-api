const storage = require('../services/storage');

// DB stores bucket-relative keys; the API returns full URLs.
const presentUser = (u) =>
  u && { ...u, profile_picture_url: storage.url('avatars', u.profile_picture_path) };

const presentImage = (i) => ({ ...i, url: storage.url('vehicles', i.storage_path) });

const presentVehicle = (v) => ({ ...v, images: (v.images || []).map(presentImage) });

const presentListItem = ({ cover_image, ...rest }) => ({
  ...rest,
  cover_image_url: storage.url('vehicles', cover_image),
});

module.exports = { presentUser, presentImage, presentVehicle, presentListItem };
