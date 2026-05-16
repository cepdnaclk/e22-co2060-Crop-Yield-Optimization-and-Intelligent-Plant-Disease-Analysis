import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
    {
        farmer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Reviewed", "Resolved"],
            default: "Pending",
        },
        documents: [
            {
                filename: {
                    type: String,
                    required: true,
                },
                originalname: {
                    type: String,
                    required: true,
                },
                mimetype: {
                    type: String,
                    required: true,
                },
                size: {
                    type: Number,
                    required: true,
                },
                path: {
                    type: String,
                    required: true,
                },
                uploadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Inquiry = mongoose.model("Inquiry", inquirySchema);
export default Inquiry;
