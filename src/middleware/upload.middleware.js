import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 4096;
const MAX_IMAGE_HEIGHT = 4096;
const MAX_IMAGE_PIXELS = 16_000_000;

const uploadProfileImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const error = new Error(
        "Only JPG, PNG and WEBP images are allowed"
      );
      error.statusCode = 400;
      return callback(error);
    }

    callback(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 20,
    parts: 21,
  },
});

export const validateProfileImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const buffer = req.file.buffer;

    if (
      !Buffer.isBuffer(buffer) ||
      buffer.length === 0 ||
      buffer.length > MAX_FILE_SIZE
    ) {
      const error = new Error("Invalid profile image file");
      error.statusCode = 400;
      throw error;
    }

    const detectedType = await fileTypeFromBuffer(buffer);

    if (
      !detectedType ||
      !ALLOWED_MIME_TYPES.includes(detectedType.mime) ||
      detectedType.mime !== req.file.mimetype
    ) {
      const error = new Error(
        "Invalid image content. Upload a genuine JPG, PNG or WEBP image."
      );
      error.statusCode = 400;
      throw error;
    }

    const image = sharp(buffer, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: "warning",
    });

    const metadata = await image.metadata();

    if (
      !metadata.width ||
      !metadata.height ||
      !["jpeg", "png", "webp"].includes(metadata.format)
    ) {
      const error = new Error("Invalid or unsupported image");
      error.statusCode = 400;
      throw error;
    }

    if (
      metadata.width > MAX_IMAGE_WIDTH ||
      metadata.height > MAX_IMAGE_HEIGHT ||
      metadata.width * metadata.height > MAX_IMAGE_PIXELS
    ) {
      const error = new Error(
        "Image dimensions are too large. Maximum allowed dimensions are 4096 x 4096."
      );
      error.statusCode = 400;
      throw error;
    }

    // Fully decode the image without retaining another output file.
    await sharp(buffer, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: "warning",
    }).rotate().toBuffer();

    return next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 400;
      error.message = "Invalid or corrupted image file";
    }

    return next(error);
  }
};

export default uploadProfileImage;
