import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createInquiry, getInquiries, updateInquiryStatus, uploadDocuments, downloadDocument, deleteDocument } from "../controllers/inquiryController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get __dirname equivalent in ES6 modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../uploads/inquiries");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for document uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = file.originalname.split(".").pop();
        cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    // Allow only PDF and image files (PNG, JPG, JPEG)
    const allowedMimes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed. Only PDF, PNG, and JPG files are supported.`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 5, // Max 5 files per upload
    },
});

// Apply authentication middleware to all inquiry routes
router.use(requireAuth);

router.route("/").post(createInquiry).get(getInquiries);
router.route("/:id/status").put(updateInquiryStatus);
router.route("/:id/documents").post(upload.array("documents", 5), uploadDocuments);
router.route("/:id/documents/:docIndex").get(downloadDocument).delete(deleteDocument);

export default router;
