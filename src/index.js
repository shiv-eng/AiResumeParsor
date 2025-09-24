const path = require("path");
// Configure dotenv at the very top to ensure environment variables are available globally
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const multer = require("multer");
const { processFile } = require('./services/fileProcessor');
const { extractDataWithGemini } = require('./services/geminiService');


// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 5050;

// --- Middlewares ---
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "https://cdn.tailwindcss.com", "'unsafe-inline'"],
        "style-src": ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
      },
    },
  })
);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.static(path.join(__dirname, '../public')));

// --- File Upload Configuration ---
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [ 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/png', 'image/jpeg' ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOCX, TXT, PNG, and JPG are allowed."));
    }
  },
}).single("resume");

// --- Bulletproof Data Sanitization ---
function sanitizeData(data) {
    const schema = {
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        location: "",
        headline: "",
        linkedin: "",
        github: "",
        portfolio: "",
        leetcode: "",
        youtube: "",
        summary: "",
        skills: [],
        workExperience: [],
        education: [],
        confidence: 0
    };

    const sanitized = {};
    for (const key in schema) {
        const schemaDefault = schema[key];
        const aiValue = data ? data[key] : undefined;

        sanitized[key] = schemaDefault;

        if (aiValue !== undefined && aiValue !== null) {
            if (Array.isArray(schemaDefault)) {
                if (Array.isArray(aiValue)) {
                    sanitized[key] = aiValue;
                }
            } else if (typeof aiValue === typeof schemaDefault) {
                sanitized[key] = aiValue;
            }
        }
    }
    
    let score = 0;
    if (sanitized.firstname && sanitized.lastname) score += 20;
    if (sanitized.email) score += 15;
    if (sanitized.phone) score += 10;
    if (sanitized.headline) score += 10;
    if (sanitized.linkedin) score += 5;
    if (sanitized.github) score += 5;
    if (sanitized.portfolio) score += 5;
    if (sanitized.workExperience.length > 0) score += 15;
    if (sanitized.education.length > 0) score += 10;
    if (sanitized.skills.length > 0) score += 5;
    sanitized.confidence = Math.min(100, score);
    
    return sanitized;
}


// --- API Routes ---
app.post("/upload", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Upload Error:", err.message);
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }

    try {
      const processedText = await processFile(req.file);
      const rawExtractedData = await extractDataWithGemini(processedText);

      const extractedData = sanitizeData(rawExtractedData);

      // --- Detailed Terminal Logging (UPDATED) ---
      console.log("\n--- ✅ Resume Extraction Successful ---\n");
      console.log("Extracted Data for Terminal Review:");
      const displayData = {
          "First Name": extractedData.firstname || "Not Found",
          "Last Name": extractedData.lastname || "Not Found",
          "Email": extractedData.email || "Not Found",
          "Phone": extractedData.phone || "Not Found",
          "Location": extractedData.location || "Not Found",
          "Headline": extractedData.headline || "Not Found",
          "LinkedIn": extractedData.linkedin || "Not Found",
          "GitHub": extractedData.github || "Not Found",
          "Portfolio": extractedData.portfolio || "Not Found",
          "LeetCode": extractedData.leetcode || "Not Found",
          "YouTube": extractedData.youtube || "Not Found",
          "Summary": extractedData.summary ? `${extractedData.summary.substring(0, 50)}...` : "Not Found",
          "Skills": `${Array.isArray(extractedData.skills) ? extractedData.skills.length : 0} skills found`,
          "Work Experience": `${Array.isArray(extractedData.workExperience) ? extractedData.workExperience.length : 0} positions found`,
          "Education": `${Array.isArray(extractedData.education) ? extractedData.education.length : 0} institutions found`,
          "Confidence Score": `${extractedData.confidence}%`
      };
      console.table(displayData);
      console.log("\n---------------------------------------\n");

      res.status(200).json(extractedData);
    } catch (error) {
        console.error("[Server Error] during file processing or AI call:", error);
        res.status(500).json({
            error: error.message || "Failed to process the uploaded file."
        });
    }
  });
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});

