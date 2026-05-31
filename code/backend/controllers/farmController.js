import Farm from "../models/farm.js";
import User from "../models/user.js";
import { isAdmin } from "./userController.js";
import AvgYield from "../models/avgYield.js";
import { sendPointsAwardedEmail } from "../services/emailService.js";

function normalizeText(value) {
  return (value || "").trim().toLowerCase();
}

const ALLOWED_DISTRICTS = [
  'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota',
  'Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale',
  'Matara','Monaragala','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'
];

const ALLOWED_DIVISIONS = {
  'Ampara': ['Ampara', 'Kalmunai', 'Samanturai'],
  'Anuradhapura': ['Anuradhapura City', 'Anuradhapura South', 'Embbekke', 'Galnewa', 'Habarana', 'Ipalogama', 'Kekirawa', 'Madawachchiya', 'Mihintale', 'Nuwara Wewa', 'Rajarata', 'Tambuttegama', 'Thalwella', 'Wilgamuwa'],
  'Badulla': ['Badulla', 'Bandarawela', 'Haputale', 'Kandaketiya', 'Passara', 'Welimada'],
  'Batticaloa': ['Batticaloa', 'Chavakachcheri', 'Eravur', 'Kaluwanchikudi', 'Kattankudy', 'Manmunai North', 'Manmunai South', 'Porativu'],
  'Colombo': ['Colombo', 'Borella', 'Colombo South', 'Dehiwala', 'Kaduwela', 'Kelaniya', 'Kolonnawa', 'Maharagama', 'Minuwangoda', 'Moratuwa', 'Nugegoda', 'Padukka', 'Piliyandala'],
  'Galle': ['Galle', 'Ambalangoda', 'Benthota', 'Buwanekande', 'Habaraduwa', 'Imaduwa', 'Koggala', 'Mirissa', 'Unawatuna', 'Weligama'],
  'Gampaha': ['Gampaha', 'Attanagalla', 'Biyagama', 'Ganemulla', 'Heiyanthuduwa', 'Katunayake', 'Kelaniya', 'Minuwangoda', 'Negombo', 'Seeduwa', 'Wattala', 'Yakmulla'],
  'Hambantota': ['Hambantota', 'Mirissa', 'Tangalla', 'Tissamaharama', 'Walasmulla', 'Wellawaththu', 'Yakkalamulla'],
  'Jaffna': ['Jaffna', 'Chavakacheri', 'Chulipuram', 'Delft', 'Jaffna North', 'Jaffna West', 'Kayts', 'Kopay', 'Nallur', 'Nanthottam', 'Point Pedro', 'Sandilipay', 'Valigamam'],
  'Kalutara': ['Kalutara', 'Bandaragama', 'Beruwala', 'Matugama', 'Millaniya', 'Panadura', 'Wadduwa'],
  'Kandy': ['Kandy', 'Akurana', 'Asgiriya', 'Dambulla', 'Gampola', 'Getambe', 'Harispattuwa', 'Katugastota', 'Kundasale', 'Nawalapitiya', 'Poojapitiya', 'Wattegama', 'Yatinuwara'],
  'Kegalle': ['Kegalle', 'Dedigama', 'Deraniyagala', 'Galigamuwa', 'Hewessa', 'Kitulgala', 'Ruwanwella', 'Warakapola', 'Yatiyanthota'],
  'Kilinochchi': ['Akkaraipattu', 'Chavakachcheri', 'Jaffna', 'Kilinochchi', 'Pulmoddai', 'Vembadi'],
  'Kurunegala': ['Kurunegala', 'Attanagalla', 'Bingiriya', 'Dambadeniya', 'Galgamuwa', 'Hakgala', 'Ibbagamuwa', 'Kurunegala North', 'Kurunegala South', 'Madampe', 'Mawathagama', 'Narammala', 'Nikaweratota', 'Polgahawela', 'Wariyapola', 'Yapahuwa'],
  'Mannar': ['Mannar', 'Arippu', 'Balapitiya', 'Medawachchiya', 'Talaimannar'],
  'Matale': ['Matale', 'Dambulla', 'Galewela', 'Hilakotte', 'Matale North', 'Matale South', 'Naula', 'Rattota', 'Thalawa'],
  'Matara': ['Matara', 'Attalbage', 'Devinuwara', 'Kamburupitiya', 'Morawaka', 'Nilwala', 'Pasgoda', 'Weligama'],
  'Monaragala': ['Monaragala', 'Badalla', 'Bibile', 'Buttala', 'Hakmana', 'Kataragama', 'Medagama', 'Ruwanwella', 'Wellawaya'],
  'Mullaitivu': ['Mullaitivu', 'Akkaraipattu', 'Batticaloa East', 'Kantale', 'Kirati', 'Kuchchaveli', 'Oddusuddan', 'Sampur', 'Valaichenai'],
  'Nuwara Eliya': ['Nuwara Eliya', 'Ambewela', 'Bogawantalawa', 'Ginigathena', 'Hanguranketha', 'Kundasale', 'Madulsima', 'Talawakelle', 'Walapane', 'Welimada'],
  'Polonnaruwa': ['Polonnaruwa', 'Habarana', 'Hingurakgoda', 'Kaduruwela', 'Minipe', 'Seruwavila', 'Thalawa'],
  'Puttalam': ['Puttalam', 'Alutnuwara', 'Anamaduwa', 'Chilaw', 'Habaraduwa', 'Nattandiya', 'Puttalam North', 'Puttalam South', 'Wacchasbadda', 'Wilwatta'],
  'Ratnapura': ['Ratnapura', 'Balangoda', 'Bulathkohupelella', 'Eheliyagoda', 'Kalawana', 'Opanayaka', 'Pelmadulla', 'Weligallela'],
  'Trincomalee': ['Trincomalee', 'Habarana', 'Kantale', 'Kuchchaveli', 'Muttur', 'Nilaveli', 'Seruwavila', 'Trincomalee North', 'Trincomalee South', 'Verugal'],
  'Vavuniya': ['Vavuniya', 'Cheddikulam', 'Eluthumadduval', 'Vengalacheddikulam']
};

async function computePointsFromAverageYield(farm, season, yearNum, harvestQtyNum) {
  const farmYield = harvestQtyNum / farm.sizeInAcres;

  const avgYieldRecord = await AvgYield.findOne({
    district: farm.district,
    crop: farm.crop,
    season,
    year: yearNum,
  });

  if (!avgYieldRecord) {
    return {
      farmYield,
      averageYield: null,
      maxYieldAcrossDistricts: null,
      pointsEarned: null,
      pointsPending: true,
    };
  }

  const avgYield = avgYieldRecord.averageYield;

  const maxYieldRecord = await AvgYield.find(
    { season, year: yearNum, crop: farm.crop },
    "averageYield"
  )
    .sort({ averageYield: -1 })
    .limit(1);

  const Y_MAX = maxYieldRecord.length ? maxYieldRecord[0].averageYield : avgYield;

  const P_MAX = 1000;
  const denominator = Y_MAX - avgYield;
  let pointsEarned = 0;

  if (avgYield > 0) {
    if (farmYield >= avgYield) {
      const bonus = P_MAX * 0.2 * (farmYield / avgYield);
      if (denominator > 0) {
        const numerator = farmYield - avgYield;
        pointsEarned = P_MAX * Math.sqrt(numerator / denominator) + bonus;
      } else {
        pointsEarned = bonus;
      }
    } else {
      pointsEarned = P_MAX * 0.2 * (farmYield / avgYield);
    }
  }

  return {
    farmYield,
    averageYield: avgYield,
    maxYieldAcrossDistricts: Y_MAX,
    pointsEarned: Math.round(pointsEarned),
    pointsPending: false,
  };
}

/**
 * Creates a new farm profile and associates it with a farmer via their NIC.
 * Automatically generates a sequential Farm ID (FAMXXXXX).
 * 
 * @param {Object} req - Express request object containing farmData and farmerNIC.
 * @param {Object} res - Express response object.
 */
export async function createFarm(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Access denied. Admins only" });
  }

  const { farmerNIC, ...farmData } = req.body;

  // Validate district presence and value
  if (!farmData.district || !ALLOWED_DISTRICTS.includes(String(farmData.district))) {
    return res.status(400).json({ message: "Invalid or missing district. Please provide one of the allowed districts.", allowedDistricts: ALLOWED_DISTRICTS });
  }

  // Validate division presence and that it belongs to the provided district
  const districtKey = String(farmData.district);
  if (!farmData.division || !ALLOWED_DIVISIONS[districtKey] || !ALLOWED_DIVISIONS[districtKey].includes(String(farmData.division))) {
    return res.status(400).json({ message: "Invalid or missing DS division for the selected district.", allowedDivisions: ALLOWED_DIVISIONS[districtKey] || [] });
  }

  // Find the farmer by NIC
  const farmer = await User.findOne({ nic: farmerNIC });
  if (!farmer) {
    return res.status(404).json({ message: "Farmer not found" });
  }

  let retryCount = 0;
  let success = false;
  let savedFarm = null;

  // Retry loop up to 5 times for resolving race conditions
  while (retryCount < 5 && !success) {
    try {
      let farmId = "FAM00202";
      // Sort by _id to accurately get the latest inserted document
      const latestid = await Farm.find().sort({ _id: -1 }).limit(1);

      if (latestid.length > 0 && latestid[0].farmId) {
        const lastfarmIdString = latestid[0].farmId;
        const lastfarmIdWithoutPrefix = lastfarmIdString.replace("FAM", "");
        const lastfarmIdInInteger = parseInt(lastfarmIdWithoutPrefix, 10) || 201;
        // Increment by 1 + retryCount to step over conflicting IDs on retries
        const newfarmIdInInteger = lastfarmIdInInteger + 1 + retryCount;
        const newfarmIdWithoutPrefix = newfarmIdInInteger.toString().padStart(5, "0");
        farmId = "FAM" + newfarmIdWithoutPrefix;
      }

      const farm = new Farm({
        ...farmData,
        farmer: farmer._id,
        farmId: farmId
      });

      savedFarm = await farm.save();
      success = true;
    } catch (error) {
      if (error.code === 11000 && error.keyPattern && error.keyPattern.farmId) {
        // Duplicate key error on farmId (concurrency collision)
        retryCount++;
        continue;
      } else {
        console.error("Error creating farm:", error);
        return res.status(500).json({ message: "Failed", error: error.message });
      }
    }
  }

  if (success) {
    return res.json({ message: "Farm created successfully", farm: savedFarm });
  } else {
    return res.status(500).json({ message: "Failed to generate a unique Farm ID due to high traffic. Please try again." });
  }
}


/**
 * Helper function to dynamically calculate points based on previous year's actual harvest data.
 * 
 * @param {Number} farmYield - The current harvest's yield per acre.
 * @param {String} crop - The crop type (e.g. 'Paddy').
 * @param {String} season - The season (e.g. 'Maha').
 * @param {Number} prevYear - The year to fetch the average from (currentHarvestYear - 1).
 * @returns {Number} The calculated points for this harvest.
 */
async function calculatePointsForHarvest(farmYield, crop, season, prevYear) {
  const P_MAX = 1000;
  const Y_MAX = 20000; // Hardcoded theoretical maximum yield per acre in kg

  // 1. Find all farms that grew this crop
  const farmsWithCrop = await Farm.find({ crop: new RegExp(`^${crop}$`, 'i') }).lean();

  let totalPrevYield = 0;
  let totalPrevAcres = 0;

  // 2. Aggregate actual harvest yield and acres for the target season & prevYear
  for (const farm of farmsWithCrop) {
    if (!farm.harvests || !farm.sizeInAcres) continue;

    const prevHarvest = farm.harvests.find(h =>
      h.season && h.season.toLowerCase() === season.toLowerCase() &&
      Number(h.year) === Number(prevYear)
    );

    if (prevHarvest && prevHarvest.harvestQty) {
      totalPrevYield += prevHarvest.harvestQty;
      // We assume the whole farm size was cultivated for that crop
      totalPrevAcres += farm.sizeInAcres;
    }
  }

  // 3. Calculate dynamic average yield
  let avgYield = 0;
  if (totalPrevAcres > 0) {
    avgYield = totalPrevYield / totalPrevAcres;
  }

  // 4. If no previous year data exists, award 0 points.
  if (avgYield === 0) {
    return 0;
  }

  // 5. Apply the formula
  const numerator = Math.max(0, farmYield - avgYield);
  const denominator = (Y_MAX - avgYield);
  let pointsEarned = 0;

  if (denominator > 0) {
    pointsEarned = P_MAX * Math.sqrt(numerator / denominator);
  }

  return Math.round(pointsEarned); // Return rounded to nearest integer
}

/**
 * Adds a new harvest record for a farm and calculates/awards points to the farmer.
 * Uses a mathematical formula to compare the farm's yield against local/global averages.
 * 
 * Points Formula: `P_MAX * sqrt( max(0, farm_yield - avg_yield) / (Y_MAX - avg_yield) )`
 * 
 * @param {Object} req - Express request object containing farmId, season, year, harvestQty.
 * @param {Object} res - Express response object.
 */
// add harvest and update points automatically in farmers
// y max = maximum average yield for that season and year across all districts
// points = P max * sqrt((farm yield - average yield) / (y max - average yield)) + P max * 0.2* (farm yield / average yield) if farm yield >= average yield
// if farm yield < average yield → points = P max * 0.2 * (farm yield / average yield)

export const addHarvestAndPoints = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Access denied. Admins only" });
  }
  const { farmId, season, year, harvestQty } = req.body;
  
  // Convert year and harvestQty to numbers to ensure proper type matching
  const yearNum = Number(year);
  const harvestQtyNum = Number(harvestQty);

  try {
    // Find farm by farmId
    const farm = await Farm.findOne({ farmId });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    // Add or update harvest (without saving yet)
    const existingHarvest = farm.harvests.find(
      (h) => h.season === season && h.year === yearNum
    );
    const previousPoints = Number(existingHarvest?.pointsEarned || 0);

    if (existingHarvest) {
      existingHarvest.harvestQty = harvestQtyNum;
    } else {
      farm.harvests.push({ season, year: yearNum, harvestQty: harvestQtyNum });
    }

    const {
      farmYield,
      averageYield,
      maxYieldAcrossDistricts,
      pointsEarned,
      pointsPending,
    } = await computePointsFromAverageYield(farm, season, yearNum, harvestQtyNum);

    // Update the harvest with pointsEarned
    const harvestToUpdate = farm.harvests.find(
      (h) => h.season === season && h.year === yearNum
    );
    if (harvestToUpdate) {
      harvestToUpdate.pointsEarned = pointsPending ? null : pointsEarned;
    }

    // Save farm once with all updates
    await farm.save();

    const nextPoints = pointsPending ? 0 : Number(pointsEarned || 0);
    const delta = nextPoints - previousPoints;

    // Update farmer points by delta to keep totals accurate on edits/retries.
    let updatedFarmer = null;
    if (delta !== 0) {
      updatedFarmer = await User.findByIdAndUpdate(
        farm.farmer,
        { $inc: { points: delta } },
        { new: true }   // Return the updated document so we have the new total
      );
    }

    // Send points notification email (fire-and-forget — never blocks the response)
    if (!pointsPending && delta > 0 && updatedFarmer) {
      sendPointsAwardedEmail({
        farmerEmail:  updatedFarmer.email,
        farmerName:   `${updatedFarmer.firstName} ${updatedFarmer.lastName}`,
        farmName:     farm.farmName,
        farmId:       farm.farmId,
        season,
        year:         yearNum,
        pointsEarned: Math.round(pointsEarned),
        totalPoints:  Math.round(updatedFarmer.points),
        harvestQty:   harvestQtyNum,
        crop:         farm.crop,
      }).catch((err) =>
        console.error("[EmailService] Unhandled error in points email:", err.message)
      );
    }

    res.json({
      message: pointsPending
        ? "Harvest added. Points pending until average yield is available"
        : "Harvest added and points calculated",
      farmYield,
      averageYield,
      maxYieldAcrossDistricts,
      pointsEarned,
      pointsPending,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export async function recalculatePendingPointsForAverage({ district, crop, season, year }) {
  const yearNum = Number(year);
  const districtNormalized = normalizeText(district);
  const cropNormalized = normalizeText(crop);

  const farms = await Farm.find({
    harvests: {
      $elemMatch: {
        season,
        year: yearNum,
      },
    },
  });

  let farmsUpdated = 0;
  let harvestsUpdated = 0;
  let pointsApplied = 0;

  for (const farm of farms) {
    if (
      normalizeText(farm.district) !== districtNormalized ||
      normalizeText(farm.crop) !== cropNormalized
    ) {
      continue;
    }

    let farmChanged = false;
    let farmerDelta = 0;

    for (const harvest of farm.harvests) {
      if (harvest.season !== season || Number(harvest.year) !== yearNum) {
        continue;
      }

      const isPending = harvest.pointsEarned === null || harvest.pointsEarned === undefined;
      if (!isPending) {
        continue;
      }

      const computed = await computePointsFromAverageYield(
        farm,
        season,
        yearNum,
        Number(harvest.harvestQty)
      );

      if (computed.pointsPending) {
        continue;
      }

      harvest.pointsEarned = computed.pointsEarned;
      farmChanged = true;
      harvestsUpdated += 1;
      farmerDelta += Number(computed.pointsEarned || 0);
    }

    if (!farmChanged) {
      continue;
    }

    await farm.save();
    farmsUpdated += 1;

    if (farmerDelta !== 0) {
      const updatedFarmer = await User.findByIdAndUpdate(
        farm.farmer,
        { $inc: { points: farmerDelta } },
        { new: true }   // Return updated document for email
      );
      pointsApplied += farmerDelta;

      // Notify farmer by email for each pending harvest that just received points.
      // One email per farm (summarises the delta awarded across all resolved harvests).
      if (updatedFarmer && farmerDelta > 0) {
        // Use the first resolved harvest on this farm for context
        const resolvedHarvest = farm.harvests.find(
          (h) => h.season === season && Number(h.year) === yearNum && h.pointsEarned !== null
        );
        sendPointsAwardedEmail({
          farmerEmail:  updatedFarmer.email,
          farmerName:   `${updatedFarmer.firstName} ${updatedFarmer.lastName}`,
          farmName:     farm.farmName,
          farmId:       farm.farmId,
          season,
          year:         yearNum,
          pointsEarned: Math.round(farmerDelta),
          totalPoints:  Math.round(updatedFarmer.points),
          harvestQty:   resolvedHarvest ? resolvedHarvest.harvestQty : 0,
          crop:         farm.crop,
        }).catch((err) =>
          console.error("[EmailService] Unhandled error in pending-points email:", err.message)
        );
      }
    }
  }

  return {
    farmsUpdated,
    harvestsUpdated,
    pointsApplied,
  };
}


/**
 * Sweeps through all farmers, recalculates points for every harvest they've ever made based on the new dynamic formula,
 * sums them up, and updates the total points value on their User profile.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const recalculateAllPoints = async (req, res) => {
  try {
    const allUsers = await User.find({ role: { $in: ['farmer', 'user'] } });

    let processedCount = 0;

    for (const user of allUsers) {
      const userFarms = await Farm.find({ farmer: user._id });
      let totalUserPoints = 0;

      for (const farm of userFarms) {
        if (!farm.harvests || farm.harvests.length === 0) continue;

        let farmModified = false;

        for (const harvest of farm.harvests) {
          if (!harvest.harvestQty || !harvest.year || !harvest.season) continue;

          const computed = await computePointsFromAverageYield(
            farm,
            harvest.season,
            Number(harvest.year),
            Number(harvest.harvestQty)
          );

          const nextPoints = computed.pointsPending ? null : Number(computed.pointsEarned || 0);
          const currentPoints =
            harvest.pointsEarned === null || harvest.pointsEarned === undefined
              ? null
              : Number(harvest.pointsEarned);

          if (currentPoints !== nextPoints) {
            harvest.pointsEarned = nextPoints;
            farmModified = true;
          }

          if (nextPoints !== null) {
            totalUserPoints += nextPoints;
          }
        }

        if (farmModified) {
          await farm.save();
        }
      }

      // Update User total points exact (rounded to nearest integer)
      const roundedTotalPoints = Math.round(totalUserPoints);
      if (user.points !== roundedTotalPoints) {
        user.points = roundedTotalPoints;
        await user.save();
      }

      processedCount++;
    }

    res.json({
      message: "Points recalculated successfully from available average yield data.",
      usersProcessed: processedCount
    });

  } catch (error) {
    console.error("Error recalculating points:", error);
    res.status(500).json({ message: "Failed to recalculate points", error: error.message });
  }
};

/**
 * Retrieves a list of all farms in the system, populated with detailed farmer data.
 * Used primarily for the admin dashboard's farm management table.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object returning formatted farm array.
 */
export const getAllFarms = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized. Please log in." });
    }

    // Determine query filter based on user role
    const queryFilter = req.user.role === 'admin' ? {} : { farmer: req.user.id };

    // Populate farmer details from users collection
    const farms = await Farm.find(queryFilter)
      .populate('farmer', 'firstName lastName nic phone division district points image')
      .select('farmId farmName location district sizeInAcres crop status createdDate harvests farmer')
      .lean();

    // Format the response with all required fields
    const formattedFarms = farms.map(farm => ({
      farmId: farm.farmId,
      farmName: farm.farmName,
      location: farm.location,
      farmerName: farm.farmer ? `${farm.farmer.firstName} ${farm.farmer.lastName}` : 'Unknown',
      farmerNIC: farm.farmer?.nic || 'N/A',
      phone: farm.farmer?.phone || 'N/A',
      division: farm.farmer?.division || farm.division || 'N/A',
      district: farm.district || 'N/A',
      farmSize: farm.sizeInAcres,
      crop: farm.crop,
      status: farm.status,
      points: Math.round(farm.farmer?.points || 0),
      farmerImage: farm.farmer?.image || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png',
      createdDate: farm.createdDate,
      harvests: farm.harvests || []
    }));

    res.json({
      message: "Farms retrieved successfully",
      count: formattedFarms.length,
      farms: formattedFarms
    });
  } catch (error) {
    console.error("Error retrieving farms", error);
    res.status(500).json({ message: "Failed to retrieve farms", error: error.message });
  }
};

/**
 * Retrieves a single farm by its custom `farmId` along with the associated farmer profile.
 * 
 * @param {Object} req - Express request object containing farmId param.
 * @param {Object} res - Express response object.
 */
export const getFarmById = async (req, res) => {
  try {
    const { farmId } = req.params;

    const farm = await Farm.findOne({ farmId: farmId })
      .populate('farmer', 'firstName lastName nic phone division district points address image')
      .lean();

    if (!farm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    const formattedFarm = {
      farmId: farm.farmId,
      farmName: farm.farmName,
      location: farm.location,
      farmerName: farm.farmer ? `${farm.farmer.firstName} ${farm.farmer.lastName}` : 'Unknown',
      farmerNIC: farm.farmer?.nic || 'N/A',
      phone: farm.farmer?.phone || 'N/A',
      division: farm.farmer?.division || farm.location || 'N/A',
      district: farm.district || 'N/A',
      farmSize: farm.sizeInAcres,
      crop: farm.crop,
      status: farm.status,
      points: Math.round(farm.farmer?.points || 0),
      createdDate: farm.createdDate,
      harvests: farm.harvests || [],
      farmerDetails: farm.farmer
    };

    res.json({
      message: "Farm retrieved successfully",
      farm: formattedFarm
    });
  } catch (error) {
    console.error("Error retrieving farm", error);
    res.status(500).json({ message: "Failed to retrieve farm", error: error.message });
  }
};

/**
 * Updates an existing farm profile.
 * Only administrators are permitted to call this endpoint.
 * 
 * @param {Object} req - Express request object containing the updated fields.
 * @param {Object} res - Express response object.
 */
export async function updateFarm(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Access denied. Admins only" });
  }

  try {
    const { farmId } = req.params;
    const { farmName, location, crop, sizeInAcres, district, status } = req.body;

    // Find and update farm
    const farm = await Farm.findOne({ farmId: farmId });
    if (!farm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    // Update only provided fields
    if (farmName) farm.farmName = farmName;
    if (location) farm.location = location;
    if (crop) farm.crop = crop;
    if (sizeInAcres !== undefined) farm.sizeInAcres = sizeInAcres;
    if (district) farm.district = district;
    if (status) farm.status = status;

    const updatedFarm = await farm.save();

    res.json({
      message: "Farm updated successfully",
      farm: updatedFarm
    });
  } catch (error) {
    console.error("Error updating farm", error);
    res.status(500).json({ message: "Failed to update farm", error: error.message });
  }
}

/**
 * Deletes a farm from the system based on its `farmId`.
 * Only administrators are permitted to call this endpoint.
 * 
 * @param {Object} req - Express request object containing farmId param.
 * @param {Object} res - Express response object.
 */
export async function deleteFarm(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Access denied. Admins only" });
  }

  try {
    const { farmId } = req.params;

    const farm = await Farm.findOne({ farmId: farmId });
    if (!farm) {
      return res.status(404).json({ message: "Farm not found" });
    }

    await Farm.deleteOne({ farmId: farmId });

    res.json({
      message: "Farm deleted successfully",
      deletedFarmId: farmId
    });
  } catch (error) {
    console.error("Error deleting farm", error);
    res.status(500).json({ message: "Failed to delete farm", error: error.message });
  }
}

/**
 * Flattens all nested harvest objects across all farms into a single timeline array.
 * Calculates yield-per-acre dynamically for table display on the admin UI.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object returning a flat list of harvests.
 */
export const getHarvestHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized. Please log in." });
    }

    // Determine query filter based on user role
    const queryFilter = req.user.role === 'admin' ? {} : { farmer: req.user.id };

    const farms = await Farm.find(queryFilter).populate('farmer', 'firstName lastName nic');

    const harvestHistory = [];

    farms.forEach(farm => {
      if (farm.harvests && farm.harvests.length > 0) {
        farm.harvests.forEach(harvest => {
          const yieldPerAcre = harvest.harvestQty / farm.sizeInAcres;

          harvestHistory.push({
            harvestId: harvest._id,
            farmId: farm.farmId,
            farmName: farm.farmName,
            farmerName: farm.farmer ? `${farm.farmer.firstName} ${farm.farmer.lastName}` : 'Unknown',
            farmerNIC: farm.farmer ? farm.farmer.nic : 'N/A',
            season: harvest.season,
            year: harvest.year,
            crop: farm.crop,
            location: farm.location,
            district: farm.district,
            acres: farm.sizeInAcres,
            harvestQty: harvest.harvestQty,
            yieldPerAcre: parseFloat(yieldPerAcre.toFixed(2)),
            pointsEarned:
              harvest.pointsEarned === null || harvest.pointsEarned === undefined
                ? null
                : Math.round(harvest.pointsEarned),
            harvestDate: harvest.createdDate
          });
        });
      }
    });

    // Sort by harvest date (most recent first)
    harvestHistory.sort((a, b) => new Date(b.harvestDate) - new Date(a.harvestDate));

    res.json({
      harvests: harvestHistory,
      total: harvestHistory.length
    });
  } catch (error) {
    console.error("Error fetching harvest history:", error);
    res.status(500).json({ message: "Failed to fetch harvest history", error: error.message });
  }
};

/**
 * Retrieves a distinct, alphabetically sorted list of all unique crops planted.
 * Useful for building active dropdown filters in the UI.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getAllCrops = async (req, res) => {
  try {
    const crops = await Farm.distinct('crop');

    // Sort crops alphabetically
    crops.sort();

    res.json({
      message: "Crops retrieved successfully",
      crops: crops,
      total: crops.length
    });
  } catch (error) {
    console.error("Error fetching crops:", error);
    res.status(500).json({ message: "Failed to fetch crops", error: error.message });
  }
};

/**
 * Aggregates farm statistics for the authenticated farmer (My Reports).
 * Calculates total acres, total points, and grouping crop varieties by size.
 * Also generates a 6-month harvest trend timeline.
 * 
 * @param {Object} req - Express request object (depends on auth middleware).
 * @param {Object} res - Express response object.
 */
export const getFarmerReport = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ message: "Unauthorized. Please log in again." });
    }

    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const farms = await Farm.find({ farmer: user._id });

    let totalAcres = 0;
    const cropMap = {};
    const harvestTrendMap = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize last 6 months to 0 to ensure timeline continuity
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      harvestTrendMap[monthNames[d.getMonth()]] = 0;
    }

    farms.forEach(farm => {
      totalAcres += farm.sizeInAcres;
      if (cropMap[farm.crop]) {
        cropMap[farm.crop] += farm.sizeInAcres;
      } else {
        cropMap[farm.crop] = farm.sizeInAcres;
      }

      // Aggregate harvests inside the 6-month window
      if (farm.harvests && farm.harvests.length > 0) {
        farm.harvests.forEach(harvest => {
          if (harvest.createdDate) {
            const harvestDate = new Date(harvest.createdDate);
            const diffMonths = (today.getFullYear() - harvestDate.getFullYear()) * 12 + today.getMonth() - harvestDate.getMonth();
            if (diffMonths >= 0 && diffMonths < 6) {
              const mName = monthNames[harvestDate.getMonth()];
              if (harvestTrendMap[mName] !== undefined) {
                harvestTrendMap[mName] += harvest.harvestQty;
              }
            }
          }
        });
      }
    });

    const cropVarieties = Object.keys(cropMap).map(crop => ({
      name: crop,
      acres: cropMap[crop],
      value: totalAcres > 0 ? parseFloat(((cropMap[crop] / totalAcres) * 100).toFixed(1)) : 0
    }));

    const harvestTrend = Object.keys(harvestTrendMap).map(month => ({
      month,
      qty: harvestTrendMap[month]
    }));

    res.json({
      message: "Report retrieved successfully",
      totalPoints: Math.round(user.points || 0),
      totalAcres: parseFloat(totalAcres.toFixed(1)),
      cropVarieties: cropVarieties,
      harvestTrend
    });
  } catch (error) {
    console.error("Error retrieving farmer report", error);
    res.status(500).json({ message: "Failed to retrieve report", error: error.message });
  }
};
