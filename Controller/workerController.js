const pool = require("../config/db")
const { cloudinary } = require("../config/cloudinaryconfig")
const fal = require("@fal-ai/serverless-client")

async function mockCompareFaces(inputImageUrl, storedImageUrl) {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const isMatch = Math.random() < 0.9; 
  const confidence = isMatch ? (0.8 + Math.random() * 0.2) : (0.1 + Math.random() * 0.1);

  return confidence > 0.7;
}

exports.addWorker = async (req, res) => {
  const { name, phone, village, salary, images } = req.body
  const query = `
    INSERT INTO workers (name, phone, village, per_day_salary, images)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `
  try {
    const result = await pool.query(query, [name, phone, village, salary, JSON.stringify(images)])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error adding worker:", err.message)
    res.status(500).json({ error: err.message })
  }
}

exports.getWorkers = async (req, res) => {
  const query = `
    SELECT w.*, array_agg(a.attendance_date) FILTER (WHERE a.attendance_date IS NOT NULL) AS attendance
    FROM workers w
    LEFT JOIN attendance a ON w.id = a.worker_id
    GROUP BY w.id
    ORDER BY w.id;
  `
  try {
    const result = await pool.query(query)
    res.json(
      result.rows.map((row) => ({
        ...row,
        attendance: row.attendance || [],
        images: row.images ? JSON.parse(row.images) : [],
      })),
    )
  } catch (err) {
    console.error("Error fetching workers:", err.message)
    res.status(500).json({ error: err.message })
  }
}

exports.identifyWorker = async (req, res) => {
  const { imageUrl } = req.body
  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL is required for identification." })
  }

  try {
    const query = `SELECT id, name, phone, village, images FROM workers;`
    const result = await pool.query(query)
    const workers = result.rows.map(row => ({
      ...row,
      images: row.images ? JSON.parse(row.images) : [],
    }));

    let identifiedWorker = null;
    let matchingImage = null;

    for (const worker of workers) {
      for (const storedImage of worker.images) {
        const isMatch = await mockCompareFaces(imageUrl, storedImage); 
        
        if (isMatch) {
          identifiedWorker = worker;
          matchingImage = storedImage;
          break;
        }
      }
      if (identifiedWorker) {
        break;
      }
    }

    if (identifiedWorker) {
      delete identifiedWorker.images; 
      
      res.json({
        success: true,
        worker: identifiedWorker,
        matchingImage: matchingImage,
        message: `Worker ${identifiedWorker.name} identified (Simulated Match).`,
      })
    } else {
      res.status(404).json({ 
        success: false, 
        message: "No registered worker found matching the provided image.",
      });
    }

  } catch (err) {
    console.error("Error identifying worker (backend):", err.message)
    res.status(500).json({ error: err.message })
  }
}