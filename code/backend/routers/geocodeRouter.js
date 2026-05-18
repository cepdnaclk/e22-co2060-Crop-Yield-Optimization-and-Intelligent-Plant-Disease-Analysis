/**
 * Geocode Proxy Router
 * Proxies Geoapify API requests from the frontend so the API key
 * is never exposed in the browser bundle.
 *
 * Routes:
 *   GET /api/geocode/reverse?lat=&lon=       → Geoapify reverse geocode
 *   GET /api/geocode/autocomplete?text=      → Geoapify autocomplete
 */

import express from 'express'

const router = express.Router()

const GEOAPIFY_BASE = 'https://api.geoapify.com/v1/geocode'

/**
 * GET /api/geocode/reverse
 * Query params: lat, lon
 */
router.get('/reverse', async (req, res) => {
    const { lat, lon } = req.query

    if (!lat || !lon) {
        return res.status(400).json({ message: 'lat and lon are required' })
    }

    const apiKey = process.env.GEOAPIFY_KEY?.trim()
    if (!apiKey) {
        return res.status(500).json({ message: 'Geocoding service not configured' })
    }

    try {
        const url = `${GEOAPIFY_BASE}/reverse?lat=${lat}&lon=${lon}&apiKey=${apiKey}`
        const response = await fetch(url)
        const data = await response.json()
        return res.json(data)
    } catch (err) {
        console.error('Geoapify reverse geocode error:', err)
        return res.status(502).json({ message: 'Geocoding service unavailable' })
    }
})

/**
 * GET /api/geocode/autocomplete
 * Query params: text, limit (optional, default 5)
 */
router.get('/autocomplete', async (req, res) => {
    const { text, limit = 5 } = req.query

    if (!text) {
        return res.status(400).json({ message: 'text query parameter is required' })
    }

    const apiKey = process.env.GEOAPIFY_KEY?.trim()
    if (!apiKey) {
        return res.status(500).json({ message: 'Geocoding service not configured' })
    }

    try {
        const url = `${GEOAPIFY_BASE}/autocomplete?text=${encodeURIComponent(text)}&filter=countrycode:lk&limit=${limit}&apiKey=${apiKey}`
        const response = await fetch(url)
        const data = await response.json()
        return res.json(data)
    } catch (err) {
        console.error('Geoapify autocomplete error:', err)
        return res.status(502).json({ message: 'Geocoding service unavailable' })
    }
})

export default router
