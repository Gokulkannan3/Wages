const { cloudinary } = require("../config/cloudinaryconfig")

exports.uploadImage = async (req, res) => {
  const { image } = req.body
  try {
    // Ensure the base64 string is properly formatted for Cloudinary
    const base64Data = image.startsWith("data:image/") ? image : `data:image/png;base64,${image}`

    const uploadResponse = await cloudinary.uploader.upload(base64Data, {
      folder: "worker_images",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png"],
    })
    res.json({ url: uploadResponse.secure_url })
  } catch (err) {
    console.error("Error uploading image:", err.message)
    res.status(500).json({ error: err.message })
  }
}
