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

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false })); // Simplified for local dev
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, '../public')));

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [ 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/png', 'image/jpeg' ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOCX, TXT, PNG, and JPG are allowed."));
    }
  },
}).single("resume");

function sanitizeData(data) {
    const schema = {
        firstname: "", lastname: "", email: "", phone: "", location: "", headline: "",
        linkedin: "", github: "", portfolio: "", leetcode: "", youtube: "", summary: "",
        skills: [], workExperience: [], education: [], projects: [], certifications: [],
        confidence: 0
    };

    const sanitized = {};
    for (const key in schema) {
        const schemaDefault = schema[key];
        const aiValue = data ? data[key] : undefined;
        sanitized[key] = schemaDefault;
        if (aiValue !== undefined && aiValue !== null) {
            if (Array.isArray(schemaDefault) && Array.isArray(aiValue)) {
                sanitized[key] = aiValue;
            } else if (typeof aiValue === typeof schemaDefault) {
                sanitized[key] = aiValue;
            }
        }
    }
    
    // --- Stricter Confidence Score ---
    let score = 0;
    if (sanitized.firstname && sanitized.lastname) score += 30; // Critical
    if (sanitized.email) score += 30; // Critical
    if (sanitized.phone) score += 20; // Critical
    if (sanitized.workExperience.length > 0) score += 10;
    if (sanitized.skills.length > 0) score += 5;
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
      const rawExtractedData = await extractDataWithGemini(processedText);
      const extractedData = sanitizeData(rawExtractedData);

      console.log("\n--- ✅ Resume Extraction Successful ---\n");
      const displayData = {
          "Name": `${extractedData.firstname || 'Not Found'} ${extractedData.lastname || ''}`,
          "Email": extractedData.email || "Not Found",
          "Phone": extractedData.phone || "Not Found",
          "LinkedIn": extractedData.linkedin || "Not Found",
          "GitHub": extractedData.github || "Not Found",
          "Work Experience": `${extractedData.workExperience.length} positions`,
          "Confidence Score": `${extractedData.confidence}%`
      };
      console.table(displayData);
      console.log("\n---------------------------------------\n");

      res.status(200).json(extractedData);
    } catch (error) {
        console.error("[Server Error]", error);
        res.status(500).json({ error: error.message || "An unknown error occurred on the server." });
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});