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
import axios from "axios"
import userRouter from "./routers/userRouter.js"
import farmRouter from "./routers/farmRouter.js"
import jwt from "jsonwebtoken"
import avgYieldRouter from "./routers/avgYieldRouter.js"
import inquiryRouter from "./routers/inquiryRouter.js"

import dns from "node:dns"
dns.setServers(['1.1.1.1', '8.8.8.8'])

dotenv.config()

const CHATBOT_WEBHOOK_URL = process.env.CHATBOT_WEBHOOK_URL || 'https://n8n-opvk.onrender.com/webhook/246e550d-c772-4fcb-bae5-e847e8c632ce/chat'
const CHATBOT_WEBHOOK_TEST_URL = process.env.CHATBOT_WEBHOOK_TEST_URL || ''


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
 * Note: If no token is provided, it currently falls through (open by default).
 */
app.use(
    (req, res, next) => {
        const value = req.header("Authorization")
        if (value != null) {
            const token = value.replace("Bearer ", "")

            jwt.verify(token, process.env.JWT_SECRET,
                (err, decoded) => {
                    if (decoded == null) {
                        res.status(403).json({
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

app.post('/api/chatbot', async (req, res) => {
    try {
        const response = await axios.post(CHATBOT_WEBHOOK_URL, req.body, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        })

        res.status(response.status).json(response.data)
    } catch (error) {
        const firstStatus = error.response?.status || 502
        const firstData = error.response?.data

        if (firstStatus === 404 && CHATBOT_WEBHOOK_TEST_URL && CHATBOT_WEBHOOK_TEST_URL !== CHATBOT_WEBHOOK_URL) {
            try {
                const retryResponse = await axios.post(CHATBOT_WEBHOOK_TEST_URL, req.body, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                })

                return res.status(retryResponse.status).json(retryResponse.data)
            } catch (retryError) {
                const retryStatus = retryError.response?.status || 502
                const retryData = retryError.response?.data

                return res.status(retryStatus).json({
                    message: retryData?.message || firstData?.message || 'The n8n webhook is not registered or the workflow is inactive.',
                    hint: retryData?.hint || firstData?.hint || 'Activate the workflow in n8n, or set CHATBOT_WEBHOOK_TEST_URL if you are using a test webhook.',
                    raw: retryData || firstData
                })
            }
        }

        res.status(firstStatus).json({
            message: firstData?.message || 'The n8n webhook is not registered or the workflow is inactive.',
            hint: firstData?.hint || 'Activate the workflow in n8n, or set CHATBOT_WEBHOOK_TEST_URL if you are using a test webhook.',
            raw: firstData
        })
    }
})



app.listen(5000, '0.0.0.0', () => {
    console.log("server started at port 5000")
})

app.get("/health", (req,res)=>{
  res.status(200).json({status:"ok"});
});