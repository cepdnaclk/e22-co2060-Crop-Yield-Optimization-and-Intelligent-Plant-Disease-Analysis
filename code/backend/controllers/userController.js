import User from "../models/user.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
dotenv.config()

/**
 * Creates a new user in the database.
 * Hashes the password asynchronously before saving.
 * 
 * @param {Object} req - Express request object containing user data in the body.
 * @param {Object} res - Express response object.
 */
export async function createUser(req, res) {
    try {
        // Hash the password asynchronously to avoid Node event loop blocking
        const password = await bcrypt.hash(req.body.password, 10)

        const userData = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: password,
            phone: req.body.phone,
            isBlocked: req.body.isBlocked,
            role: req.body.role,
            image: req.body.image,
            nic: req.body.nic,
            address: req.body.address,
            division: req.body.division,
            district: req.body.district,
            points: req.body.points
        };

        const user = new User(userData)
        await user.save()

        res.json({
            message: "User Created Successfully"
        })
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({
            message: "Failed to create user",
            error: error.message
        })
    }
}


/**
 * Authenticates a user and issues a JWT token.
 * Validates the user role against the intended portal (Farmer vs Admin).
 * 
 * @param {Object} req - Express request object containing email, password, and intendedRole.
 * @param {Object} res - Express response object.
 */
export async function loginUser(req, res) {
    const email = req.body.email
    const password = req.body.password
    const intendedRole = req.body.intendedRole // 'farmer' or 'admin'

    try {
        const user = await User.findOne({ email: email })

        if (user == null) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        // Check if user is blocked
        if (user.isBlocked) {
            return res.status(403).json({
                message: "Your account has been blocked. Please contact support."
            })
        }

        // Verify password asynchronously
        const isPasswordCorrect = await bcrypt.compare(password, user.password)

        const normalizedPoints = Math.round(Number(user.points) || 0)

        if (isPasswordCorrect) {
            // Validate role matches the portal they are trying to log into
            const normalizedDbRole = user.role === 'user' ? 'farmer' : user.role
            if (intendedRole && normalizedDbRole !== intendedRole) {
                return res.status(401).json({
                    message: "Invalid role selected. Please check your account type."
                })
            }

            // Generate authentication token
            const token = jwt.sign(
                {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    isBlocked: user.isBlocked,
                    isEmailVerified: user.isEmailVerified,
                    Image: user.image,
                    points: normalizedPoints
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' } // Token expires in 24 hours
            )

            res.json({
                token: token,
                message: "Login Successful",
                user: {
                    _id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    type: user.role,
                    points: normalizedPoints,
                    district: user.district,
                    division: user.division,
                    image: user.image
                }
            })
        } else {
            return res.status(401).json({
                message: "Incorrect Password"
            })
        }
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ message: "Server error during login" });
    }
}

/**
 * Utility to check if the current requester is an administrator.
 * Relies on `req.user` being injected by the authentication middleware.
 * 
 * @param {Object} req - Express request object.
 * @returns {Boolean} True if user is admin, false otherwise.
 */
export function isAdmin(req) {
    if (!req.user) {
        return false;
    }
    return req.user.role === "admin";
}

/**
 * Fetches the complete profile of the currently logged-in user.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export async function fetchUser(req, res) {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: "Unauthorized. Please log in again." });
        }

        const user = await User.findOne({ email: req.user.email }).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const normalizedUser = {
            ...user.toObject(),
            points: Math.round(Number(user.points) || 0),
        };

        res.json({
            message: "User retrieved successfully",
            user: normalizedUser
        });
    } catch (error) {
        console.error("Error fetching user profile", error);
        res.status(500).json({ message: "Failed to fetch profile", error: error.message });
    }
}

/**
 * Retrieves a list of recently registered farmers for the admin dashboard.
 * 
 * @param {Object} req - Express request object (accepts `limit` via query param).
 * @param {Object} res - Express response object.
 */
export async function getRecentFarmers(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 4; // Default to 4 recent farmers

        // Fetch recently registered farmers (role = 'farmer'), sorted by creation date descending
        const recentFarmers = await User.find({ role: 'farmer' })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('firstName lastName division district image nic createdAt');

        const formattedFarmers = recentFarmers.map(farmer => ({
            _id: farmer._id,
            name: `${farmer.firstName} ${farmer.lastName}`,
            firstName: farmer.firstName,
            lastName: farmer.lastName,
            location: farmer.district || farmer.division || 'Unknown',
            district: farmer.district,
            division: farmer.division,
            date: farmer.createdAt,
            image: farmer.image,
            nic: farmer.nic,
            status: 'Active' // Default status; can be extended if needed
        }));

        res.json({
            message: "Recent farmers retrieved successfully",
            count: formattedFarmers.length,
            farmers: formattedFarmers
        });
    } catch (error) {
        console.error("Error retrieving recent farmers:", error);
        res.status(500).json({
            message: "Failed to retrieve recent farmers",
            error: error.message
        });
    }
}

/**
 * Updates the profile of the currently logged-in user.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export async function updateProfile(req, res) {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: "Unauthorized. Please log in again." });
        }

        const updateData = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            address: req.body.address,
            district: req.body.district,
            division: req.body.division,
            image: req.body.image,
        };

        // Remove undefined fields so we don't accidentally overwrite with null
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const updatedUser = await User.findOneAndUpdate(
            { email: req.user.email },
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found." });
        }
        res.json({
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Error updating user profile", error);
        res.status(500).json({ message: "Failed to update profile", error: error.message });
    }
}
