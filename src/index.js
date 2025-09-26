const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const multer = require("multer");
const { processFile } = require('./services/fileProcessor');
const { extractDataWithGemini } = require('./services/geminiService');

const app = express();
const PORT = process.env.PORT || 5050;

// --- API Key Authentication Middleware ---
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("FATAL ERROR: API_KEY is not set in the .env file. The application cannot start.");
}

const authenticateKey = (req, res, next) => {
    const providedKey = req.headers['x-api-key'];
    if (providedKey && providedKey === API_KEY) {
        next(); // Key is valid, proceed
    } else {
        res.status(401).json({ error: 'Unauthorized: A valid x-api-key header is required.' });
    }
};

// --- CORS Configuration ---
// Only allow requests from your specific Netlify frontend
const allowedOrigins = ['https://magnificent-biscuit-2dcac7.netlify.app'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

// The /upload endpoint is now the core product and must be secured
app.use('/upload', authenticateKey); 

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [ 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/png', 'image/jpeg' ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOCX, TXT, PNG, and JPG are allowed."));
    }
  },
}).single("resume");

// --- UPDATED Sanitize Function for Professional Schema ---
function sanitizeData(data) {
    const schema = {
        firstname: "", lastname: "", email: "", phone: "", location: "", headline: "",
        linkedin: "", github: "", portfolio: "", leetcode: "", youtube: "", summary: "",
        skills: { languages: [], frameworks_libraries: [], databases: [], cloud_devops: [], tools: [] },
        workExperience: [], education: [], projects: [], certifications: [],
        confidence: 0
    };

    const sanitized = { ...schema };

    if (!data) return sanitized;

    for (const key in schema) {
        if (key === 'confidence' || data[key] === undefined || data[key] === null) continue;

        if (key === 'skills' && typeof data.skills === 'object' && data.skills !== null) {
            for (const category in schema.skills) {
                if (Array.isArray(data.skills[category])) {
                    sanitized.skills[category] = data.skills[category];
                }
            }
        } else if (Array.isArray(schema[key]) && Array.isArray(data[key])) {
            sanitized[key] = data[key];
        } else if (typeof data[key] === typeof schema[key]) {
            sanitized[key] = data[key];
        }
    }
    
    // --- Professional Confidence Score ---
    let score = 0;
    if (sanitized.firstname && sanitized.lastname) score += 25;
    if (sanitized.email) score += 25;
    if (sanitized.phone) score += 15;
    if (sanitized.workExperience.length > 0) score += 20;
    if (Object.values(sanitized.skills).some(arr => arr.length > 0)) score += 10;
    if (sanitized.education.length > 0) score += 5;
    
    sanitized.confidence = Math.min(100, score);
    
    return sanitized;
}

app.post("/upload", (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file was uploaded." });

    try {
      const processedText = await processFile(req.file);
      if (!processedText || processedText.trim().length < 50) {
          return res.status(422).json({ error: "Could not extract sufficient text from the document. It may be empty or unreadable." });
      }

      const rawExtractedData = await extractDataWithGemini(processedText);
      const extractedData = sanitizeData(rawExtractedData);

      console.log("\n--- ✅ Resume Extraction Successful ---\n");
      res.status(200).json(extractedData);

    } catch (error) {
        console.error("[Server Error]", error);
        res.status(500).json({ error: error.message || "An unknown error occurred on the server." });
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ AI Resume Parser API is running on http://localhost:${PORT}`);
  console.log(`🔒 The /upload endpoint is protected by an API key.`);
});