import cloudinary from "../config/cloudinary.js";

export const uploadProfileImageToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
            return reject(new Error("Invalid image file"));
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "veloop/profile-images",
                resource_type: "image",
                transformation: [
                    {
                        width: 500,
                        height: 500,
                        crop: "limit",
                        quality: "auto",
                        fetch_format: "auto",
                    },
                ],
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                resolve({
                    imageUrl: result.secure_url,
                    publicId: result.public_id,
                    format: result.format,
                    bytes: result.bytes,
                });
            }
        );

        uploadStream.end(fileBuffer);
    });
};

export const deleteProfileImageFromCloudinary = async (publicId) => {
    if (!publicId || typeof publicId !== "string") {
        throw new Error("Invalid Cloudinary public ID");
    }

    return cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
    });
};
