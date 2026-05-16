import Inquiry from "../models/inquiryModel.js";
import { isAdmin } from "./userController.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES6 modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../uploads/inquiries");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// @desc    Submit a new inquiry (Farmer)
// @route   POST /api/inquiries
// @access  Private (Farmer)
export const createInquiry = async (req, res) => {
    try {
        const { subject, message, farmerId } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ message: "Subject and message are required" });
        }

        const inquiry = new Inquiry({
            farmer: farmerId || req.user?._id, // Support either explicit passing or from auth middleware
            subject,
            message,
            documents: [], // Initialize with empty documents array
        });

        const createdInquiry = await inquiry.save();
        res.status(201).json(createdInquiry);
    } catch (error) {
        console.error("Error creating inquiry:", error);
        res.status(500).json({ message: "Failed to submit inquiry", error: error.message });
    }
};

// @desc    Get all inquiries (Admin)
// @route   GET /api/inquiries
// @access  Private 
export const getInquiries = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized." });
        }

        const queryFilter = req.user.role === 'admin' ? {} : { farmer: req.user.id };

        const inquiries = await Inquiry.find(queryFilter)
            .populate("farmer", "firstName lastName email district")
            .sort({ createdAt: -1 });

        // Ensure documents field is included in response
        const inquiriesWithDocs = inquiries.map(inq => {
            const inquiry = inq.toObject ? inq.toObject() : inq;
            return {
                ...inquiry,
                documents: inq.documents || [],
            };
        });

        res.json({ inquiries: inquiriesWithDocs });
    } catch (error) {
        console.error("Error fetching inquiries:", error);
        res.status(500).json({ message: "Failed to fetch inquiries", error: error.message });
    }
};

// @desc    Update inquiry status (Admin)
// @route   PUT /api/inquiries/:id/status
// @access  Private (Admin)
export const updateInquiryStatus = async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "Access denied. Admins only" });
    }

    try {
        const { status } = req.body;

        if (!["Pending", "Reviewed", "Resolved"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const inquiry = await Inquiry.findById(req.params.id);

        if (inquiry) {
            inquiry.status = status;
            const updatedInquiry = await inquiry.save();

            // Re-fetch with populated farmer info
            const populatedInquiry = await Inquiry.findById(updatedInquiry._id)
                .populate("farmer", "firstName lastName email district");

            res.json(populatedInquiry);
        } else {
            res.status(404).json({ message: "Inquiry not found" });
        }
    } catch (error) {
        console.error("Error updating inquiry status:", error);
        res.status(500).json({ message: "Failed to update inquiry", error: error.message });
    }
};

// @desc    Upload documents to an inquiry (Farmer)
// @route   POST /api/inquiries/:id/documents
// @access  Private (Farmer)
export const uploadDocuments = async (req, res) => {
    try {
        const inquiryId = req.params.id;

        console.log("=== Upload Documents Debug ===");
        console.log("Inquiry ID:", inquiryId);
        console.log("Files received:", req.files?.length || 0);
        console.log("Files:", req.files?.map(f => ({ name: f.originalname, path: f.path })));

        // Check if inquiry exists and belongs to the user (or user is admin)
        const inquiry = await Inquiry.findById(inquiryId);
        if (!inquiry) {
            return res.status(404).json({ message: "Inquiry not found" });
        }

        if (req.user.role !== 'admin' && inquiry.farmer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to upload documents for this inquiry" });
        }

        if (!req.files || req.files.length === 0) {
            console.log("No files in request");
            return res.status(400).json({ message: "No files uploaded" });
        }

        console.log("Processing files:", req.files.map(f => ({ name: f.originalname, size: f.size })));

        // Add documents to inquiry - ensure absolute paths
        const uploadedDocs = req.files.map((file) => {
            // Ensure path is absolute
            let filePath = file.path;
            if (!path.isAbsolute(filePath)) {
                filePath = path.join(uploadsDir, path.basename(filePath));
            }
            console.log("Storing document with path:", filePath);
            return {
                filename: file.filename,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: filePath,
                uploadedAt: new Date(),
            };
        });

        console.log("Docs to add:", uploadedDocs);

        inquiry.documents.push(...uploadedDocs);
        const updatedInquiry = await inquiry.save();

        console.log("Updated inquiry documents:", updatedInquiry.documents);

        // Re-fetch with populated farmer info
        const populatedInquiry = await Inquiry.findById(updatedInquiry._id)
            .populate("farmer", "firstName lastName email district");

        console.log("Final populated inquiry:", populatedInquiry);

        res.json({
            message: "Documents uploaded successfully",
            inquiry: populatedInquiry,
        });
    } catch (error) {
        console.error("Error uploading documents:", error);
        res.status(500).json({ message: "Failed to upload documents", error: error.message });
    }
};

// @desc    Download a document from an inquiry (Admin)
// @route   GET /api/inquiries/:id/documents/:docIndex
// @access  Private (Admin)
export const downloadDocument = async (req, res) => {
    try {
        const { id, docIndex } = req.params;
        console.log("=== DOWNLOAD DEBUG ===");
        console.log("User object:", req.user);
        console.log("User role:", req.user?.role);
        console.log("Inquiry ID:", id);
        console.log("Doc Index:", docIndex);

        // Check authentication first
        if (!req.user) {
            console.log("No user object found");
            return res.status(401).json({ message: "Unauthorized: No user found" });
        }

        // Only admins can download documents (case-insensitive)
        const userRole = (req.user.role || "").toLowerCase();
        if (userRole !== 'admin') {
            console.log("User is not admin. Role:", req.user.role);
            return res.status(403).json({ message: `Only admins can download documents. Your role: ${req.user.role || 'none'}` });
        }

        const inquiry = await Inquiry.findById(id);
        if (!inquiry) {
            console.log("Inquiry not found:", id);
            return res.status(404).json({ message: "Inquiry not found" });
        }

        console.log("Documents in inquiry:", inquiry.documents?.length || 0);

        const docIdx = parseInt(docIndex);
        if (isNaN(docIdx) || docIdx < 0 || !inquiry.documents || docIdx >= inquiry.documents.length) {
            console.log("Invalid document index:", docIndex, "Total docs:", inquiry.documents?.length || 0);
            return res.status(400).json({ message: `Invalid document index: ${docIndex}` });
        }

        const document = inquiry.documents[docIdx];
        
        // Try to resolve the file path - handle both absolute and relative paths
        let filePath = document.path;
        
        // If path is relative, convert to absolute
        if (!path.isAbsolute(filePath)) {
            filePath = path.join(uploadsDir, path.basename(filePath));
            console.log("Path was relative, converted to:", filePath);
        }
        
        console.log("Document to download:", {
            filename: document.filename,
            originalname: document.originalname,
            storedPath: document.path,
            resolvedPath: filePath,
            exists: fs.existsSync(filePath)
        });

        // Check if file exists
        if (!filePath || !fs.existsSync(filePath)) {
            console.log("File not found at resolved path:", filePath);
            console.log("Current working directory:", process.cwd());
            return res.status(404).json({ message: `File not found. Path: ${filePath}` });
        }

        console.log("Sending file:", document.originalname);
        // Send the file
        res.download(filePath, document.originalname);
    } catch (error) {
        console.error("Error downloading document:", error);
        res.status(500).json({ message: "Failed to download document", error: error.message });
    }
};

// @desc    Delete a document from an inquiry (Farmer/Admin)
// @route   DELETE /api/inquiries/:id/documents/:docIndex
// @access  Private
export const deleteDocument = async (req, res) => {
    try {
        const { id, docIndex } = req.params;

        const inquiry = await Inquiry.findById(id);
        if (!inquiry) {
            return res.status(404).json({ message: "Inquiry not found" });
        }

        // Check authorization
        if (req.user.role !== 'admin' && inquiry.farmer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to delete documents from this inquiry" });
        }

        const docIdx = parseInt(docIndex);
        if (isNaN(docIdx) || docIdx < 0 || docIdx >= inquiry.documents.length) {
            return res.status(400).json({ message: "Invalid document index" });
        }

        const document = inquiry.documents[docIdx];

        // Delete file from filesystem
        if (fs.existsSync(document.path)) {
            fs.unlinkSync(document.path);
        }

        // Remove document from array
        inquiry.documents.splice(docIdx, 1);
        const updatedInquiry = await inquiry.save();

        // Re-fetch with populated farmer info
        const populatedInquiry = await Inquiry.findById(updatedInquiry._id)
            .populate("farmer", "firstName lastName email district");

        res.json({
            message: "Document deleted successfully",
            inquiry: populatedInquiry,
        });
    } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ message: "Failed to delete document", error: error.message });
    }
};
