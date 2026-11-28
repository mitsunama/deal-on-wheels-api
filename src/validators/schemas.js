const { z } = require('zod');

const uuid = z.string().uuid();

const idParam = z.object({ id: uuid });
const idAndImageParam = z.object({ id: uuid, imageId: uuid });

const register = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
});

const login = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const updateProfile = z
  .object({
    username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    description: z.string().max(1000).nullable(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');

// under_4 = fewer than 4 wheels (motorcycle, scooter, trike); four_plus = 4 wheels or more
const vehicleType = z.enum(['under_4', 'four_plus']);

const vehicleBase = z.object({
  vehicleType,
  title: z.string().trim().min(3).max(150),
  brand: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  year: z.number().int().min(1900).max(2100),
  mileageKm: z.number().int().min(0).nullable(),
  transmission: z.string().trim().max(30).nullable(),
  fuelType: z.string().trim().max(30).nullable(),
  city: z.string().trim().max(80).nullable(),
  price: z.number().int().positive(),
  description: z.string().max(5000).nullable(),
  specs: z.record(z.any()),
});

const createVehicle = vehicleBase.partial({
  vehicleType: true, mileageKm: true, transmission: true, fuelType: true, city: true, description: true, specs: true,
});

const updateVehicle = vehicleBase
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');

const listVehiclesQuery = z.object({
  // free-text search over title, brand, model, city and description
  q: z.string().trim().max(100).optional(),
  vehicleType: vehicleType.optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  city: z.string().optional(),
  year: z.coerce.number().int().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  status: z.enum(['available', 'pending', 'sold']).default('available'),
  // JSON string, e.g. specs={"color":"red"} -> uses jsonb @> (GIN index)
  specs: z
    .string()
    .optional()
    .transform((s, ctx) => {
      if (s === undefined) return undefined;
      try {
        const v = JSON.parse(s);
        if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error();
        return v;
      } catch {
        ctx.addIssue({ code: 'custom', message: 'specs must be a JSON object' });
        return z.NEVER;
      }
    }),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'year_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const createTransaction = z.object({
  // optional: defaults to the vehicle's listed price
  agreedPrice: z.number().int().positive().optional(),
});

const listTransactionsQuery = z.object({
  role: z.enum(['buyer', 'seller']).optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const listWishlistQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = {
  listWishlistQuery,
  idParam, idAndImageParam, register, login, updateProfile,
  createVehicle, updateVehicle, listVehiclesQuery,
  createTransaction, listTransactionsQuery,
};
