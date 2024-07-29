const dotEnv = require("dotenv");
dotEnv.config();

const express = require("express");
const multer = require("multer");
const Jimp = require("jimp");
const fs = require("fs");
const jsQR = require("jsqr");
const QRCode = require("qrcode");
const { BakongKHQR } = require("bakong-khqr");

const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 3 * 1000000, // 3MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error("Invalid file type");
      error.code = "INVALID_FILE_TYPE";
      return cb(error, false);
    }
    cb(null, true);
  },
});

// Middleware to parse request payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get("/", (req, res) => {
  res.send("Polymer KHQR API");
});

// Decode QR code from uploaded image
app.post("/decode", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Load image using Jimp
    const jimpImage = await Jimp.read(req.file.path);
    const imageData = {
      data: new Uint8ClampedArray(jimpImage.bitmap.data),
      width: jimpImage.bitmap.width,
      height: jimpImage.bitmap.height,
    };

    // Use jsQR to decode the QR code
    const decodedQR = jsQR(imageData.data, imageData.width, imageData.height);
    if (decodedQR) {
      const qrContent = decodedQR.data;

      // Validate the KHQR code
      const isKHQR = BakongKHQR.verify(qrContent).isValid;
      if (isKHQR) {
        res.json({ data: qrContent });
      } else {
        res.status(400).json({ error: "Invalid KHQR code" });
      }
    } else {
      res.status(400).json({ error: "No QR code found in the image" });
    }

    // Remove image after processing
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      // File removed
    });
  } catch (error) {
    res.status(500).json({ error: "Error decoding QR code", message: error.message });
  }
});

// Generate QR code from text
app.post("/generate", (req, res) => {
  if (!req.body.text) {
    return res.status(400).json({ error: "Please enter a valid text" });
  }

  try {
    QRCode.toDataURL(req.body.text, (err, url) => {
      if (err) {
        return res.status(500).json({ error: "Error creating QR code", message: err.message });
      }
      res.json({ qr: url });
    });
  } catch (error) {
    res.status(500).json({ error: "Error creating QR code", message: error.message });
  }
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({
    status: 500,
    message: err.message,
    body: {},
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
