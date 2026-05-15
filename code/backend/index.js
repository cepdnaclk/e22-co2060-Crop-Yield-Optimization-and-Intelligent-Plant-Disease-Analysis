/**
 * Main application entry point for the AgriConnect backend.
 * Configures Express, CORS, MongoDB connection, routing, and global JWT middleware.
 */

/*Test CICD */
import express from "express"
import mongoose from "mongoose"
import dotenv from "dotenv"
import bodyParser from "body-parser"
import cors from "cors"
import userRouter from "./routers/userRouter.js"
import farmRouter from "./routers/farmRouter.js"
import jwt from "jsonwebtoken"
import avgYieldRouter from "./routers/avgYieldRouter.js"
import inquiryRouter from "./routers/inquiryRouter.js"

import dns from "node:dns"
dns.setServers(['1.1.1.1', '8.8.8.8'])

dotenv.config()


const app = express()

// Enable CORS for frontend
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173'
].filter(Boolean)

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}))

// Enable JSON request body parsing
app.use(express.json())

/**
 * Global Authentication Middleware
 * Validates 'Authorization: Bearer <token>' headers on incoming requests.
 * If present and valid, decodes the token and attaches `req.user`.
 * Skips token verification for public endpoints (login, register).
 */
app.use(
    (req, res, next) => {
        // Public endpoints that don't require authentication
        const publicEndpoints = ['/api/users/login', '/api/users']
        
        // Skip token verification for public endpoints
        if (publicEndpoints.some(endpoint => req.path === endpoint)) {
            return next()
        }

        const value = req.header("Authorization")
        if (value != null) {
            const token = value.replace("Bearer ", "")

            jwt.verify(token, process.env.JWT_SECRET,
                (err, decoded) => {
                    if (decoded == null) {
                        return res.status(403).json({
                            message: "unauthorized"
                        })
                    } else {
                        req.user = decoded
                        next()
                    }

                }
            )

        } else {
            next()
        }

    }
)

/**
 * Initialize MongoDB Connection and start the server.
 */
const connectionString = process.env.MONGO_URI

mongoose.connect(connectionString).then(
    () => {
        console.log("Database Connected")

    }
).catch(
    () => {
        console.log("Database Connection Failed")
    }
)

app.use("/api/users", userRouter)
app.use("/api/farms", farmRouter)
app.use("/api/avgYields", avgYieldRouter)
app.use("/api/inquiries", inquiryRouter)



app.listen(5000, '0.0.0.0', () => {
    console.log("server started at port 5000")
})

app.get("/health", (req,res)=>{
  res.status(200).json({status:"ok"});
});