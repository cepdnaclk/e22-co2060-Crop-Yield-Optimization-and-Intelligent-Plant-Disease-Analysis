/**
 * Mongoose Schema: Farms (farms)
 * Defines the structure for farm entities linked to Farmer profiles.
 * Also embeds the Harvest subsystem (sub-document arrays).
 */
import mongoose from "mongoose";

const farmSchema = new mongoose.Schema({
    farmId: {
        type: String,
        required: true,
        unique: true
    },

    farmName: {
        type: String,
        required: true
    },

    location: {
        type: String,
        required: true
    },

    district: {
        type: String,
        required: true,
        enum: [
            'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota',
            'Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale',
            'Matara','Monaragala','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'
        ],
    },
    division: {
        type: String,
        required: true
    },

    sizeInAcres: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        default: "active"
    },

    harvests: [
        {
            season: {
                type: String,
                required: true
            },
            year: {
                type: Number,
                required: true
            },
            harvestQty: {
                type: Number,
                default: 0
            },
            pointsEarned: {
                type: Number,
                default: null
            },
            createdDate: {
                type: Date,
                default: Date.now
            }
        }
    ],

    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },

    crop: {
        type: String,
        required: true
    },

    createdDate: {
        type: Date,
        default: Date.now
    }
});

const Farm = mongoose.model("farms", farmSchema);
export default Farm