import AvgYield from "../models/avgYield.js";
import { isAdmin } from "./userController.js";
import { recalculatePendingPointsForAverage } from "./farmController.js";



function buildUniqueYieldKeys(records) {
   const uniqueMap = new Map();

   for (const record of records) {
      const key = `${record.district}::${record.crop}::${record.season}::${record.year}`;
      uniqueMap.set(key, {
         district: record.district,
         crop: record.crop,
         season: record.season,
         year: Number(record.year),
      });
   }

   return Array.from(uniqueMap.values());
}

/**
 * Creates average yield records for different crops and districts.
 * Supports both bulk insertion (array of objects) and single insertion.
 * Only administrators are permitted to perform this action.
 * 
 * @param {Object} req - Express request object containing yield data.
 * @param {Object} res - Express response object.
 */
export async function createAvgYield(req, res) {

   if (!isAdmin(req)) {
      return res.status(403).json({
         message: "Access denied. Admins only"
      });
   }

   try {

      const data = req.body;

      // 🔹 If request body is an array → bulk insert
      if (Array.isArray(data)) {

         const response = await AvgYield.insertMany(data, { ordered: false });

         const uniqueCombos = buildUniqueYieldKeys(response);
         for (const combo of uniqueCombos) {
            await recalculatePendingPointsForAverage(combo);
         }

         return res.status(201).json({
            message: "Average yields created successfully",
            count: response.length,
            avgYields: response
         });
      }

      // 🔹 If single object → normal save
      const avgYield = new AvgYield(data);
      const response = await avgYield.save();

      const recalculation = await recalculatePendingPointsForAverage({
         district: response.district,
         crop: response.crop,
         season: response.season,
         year: response.year,
      });

      return res.status(201).json({
         message: "Average yield created successfully",
         avgYield: response,
         pendingPointsRecalculated: recalculation,
      });

   } catch (error) {
      console.error("Error creating average yield", error);

      return res.status(500).json({
         message: "Failed to create average yield",
         error: error.message
      });
   }
}
