import { Category } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import slugify from '../utils/slugify.js';

/**
 * GET /categories — Public
 */
export const listCategories = catchAsync(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });

  res.status(200).json({
    success: true,
    data: { categories },
  });
});

/**
 * POST /categories — Admin
 * Body: { name, imageUrl? }
 */
export const createCategory = catchAsync(async (req, res) => {
  const { name, imageUrl } = req.body;

  if (!name) {
    throw new ApiError(400, 'name wajib diisi.');
  }

  const slug = slugify(name);

  const existing = await Category.findOne({ slug });
  if (existing) {
    throw new ApiError(409, 'Kategori dengan nama tersebut sudah ada.');
  }

  const category = await Category.create({ name, slug, imageUrl: imageUrl || null });

  res.status(201).json({
    success: true,
    message: 'Kategori berhasil ditambahkan.',
    data: { category },
  });
});