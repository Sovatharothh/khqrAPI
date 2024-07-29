const dotEnv = require("dotenv");
dotEnv.config();

const express = require("express");
const multer = require("multer");
const Jimp = require("jimp");
const fs = require("fs");
const path = require("path");
const jsQR = require("jsqr");
const QRCode = require("qrcode");
const { BakongKHQR } = require("bakong-khqr");

const app = express();

const uploadDir = path.join(__dirname, 'uploads');
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
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
  }
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
      return res.status(400).json({
        status: 400,
        message: "No file uploaded",
        body: {}
      });
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
        res.json({
          status: 200,
          message: "QR String Extracted Successfully",
          body: {
            data: qrContent
          }
        });
      } else {
        res.status(400).json({
          status: 400,
          message: "Invalid KHQR code",
          body: {}
        });
      }
    } else {
      res.status(400).json({
        status: 400,
        message: "No QR code found in the image",
        body: {}
      });
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
    res.status(500).json({
      status: 500,
      message: "Error decoding QR code",
      body: {
        error: error.message
      }
    });
  }
});

// Generate QR code from text
app.post("/generate", (req, res) => {
  if (!req.body.text) {
    return res.status(400).json({
      status: 400,
      message: "Please enter a valid text",
      body: {}
    });
  }

  try {
    QRCode.toDataURL(req.body.text, (err, url) => {
      if (err) {
        return res.status(500).json({
          status: 500,
          message: "Error creating QR code",
          body: {
            error: err.message
          }
        });
      }
      res.json({
        status: 200,
        message: "QR Code Generated Successfully",
        body: {
          qr: url
        }
      });
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Error creating QR code",
      body: {
        error: error.message
      }
    });
  }
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 500,
    message: err.message,
    body: {}
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
