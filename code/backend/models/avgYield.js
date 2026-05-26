/**
 * Mongoose Schema: Average Yields (avgYields)
 * Stores the average crop yield calculation thresholds for calculating points.
 * Ensures an index on district/crop/season/year to prevent duplicates.
 */
import mongoose from "mongoose";


const avgYieldSchema = new mongoose.Schema({
    district: {
        type: String,
        required: true
    },
    crop: {
        type: String,
        required: true
    },
    season: {
        type: String,
        required: true,
        enum: ["Maha", "Yala"]
    },
    year: {
        type: Number,
        required: true
    },
    averageYield: {
        type: Number,
        required: true
    }
});

// Unique per district + crop + season + year
avgYieldSchema.index(
    { district: 1, season: 1, crop: 1, year: 1 },
    { unique: true }
);

const AvgYield = mongoose.model("avgYields", avgYieldSchema);
export default AvgYield;
