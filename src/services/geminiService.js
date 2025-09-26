const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
    throw new Error("FATAL ERROR: GEMINI_API_KEY is not set in the .env file or environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// List of models to try in order of preference (updated for AI Studio)
const MODEL_NAMES = [
    "gemini-1.5-flash",
    "gemini-1.5-pro", 
    "gemini-pro",
    "gemini-1.0-pro-latest",
    "gemini-1.0-pro",
    "models/gemini-pro",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro"
];

async function extractDataWithGemini(text) {
    const prompt = `You are an elite resume data extraction engine. Convert the following resume text into a perfect JSON object with this exact structure:

{
  "firstname": "",
  "lastname": "",
  "email": "",
  "phone": "",
  "location": "",
  "headline": "",
  "linkedin": "",
  "github": "",
  "portfolio": "",
  "leetcode": "",
  "youtube": "",
  "summary": "",
  "skills": {
    "languages": [],
    "frameworks_libraries": [],
    "databases": [],
    "cloud_devops": [],
    "tools": []
  },
  "workExperience": [
    {
      "title": "",
      "company": "",
      "dates": "",
      "description": ""
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "dates": ""
    }
  ],
  "projects": [
    {
      "name": "",
      "description": ""
    }
  ],
  "certifications": [
    {
      "name": "",
      "issuingOrganization": "",
      "date": ""
    }
  ]
}

Your response MUST be only the clean JSON object, starting with { and ending with }, with no extra text, comments, or markdown.

---BEGIN RESUME---
${text}
---END RESUME---`;

    let lastError = null;

    // Try each model until one works
    for (const modelName of MODEL_NAMES) {
        try {
            console.log(`Attempting to use model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            
            // Clean up the response text
            let cleanedText = responseText.trim();
            
            // Remove markdown code blocks if present
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            const startIndex = cleanedText.indexOf('{');
            const endIndex = cleanedText.lastIndexOf('}');

            if (startIndex === -1 || endIndex === -1) {
                console.error("Invalid AI Response Text:", responseText);
                throw new Error("Could not find a valid JSON object in the AI response.");
            }

            const jsonString = cleanedText.substring(startIndex, endIndex + 1);
            const parsedData = JSON.parse(jsonString);
            
            console.log(`✅ Successfully used model: ${modelName}`);
            return parsedData;

        } catch (error) {
            console.log(`❌ Model ${modelName} failed:`, error.message);
            lastError = error;
            
            // If it's not a model availability error, break and throw immediately
            if (!error.message.includes('404') && 
                !error.message.includes('not found') && 
                !error.message.includes('not supported')) {
                break;
            }
            
            // Continue to next model if this was a model availability issue
            continue;
        }
    }

    // If we get here, all models failed
    console.error("All models failed. Last error:", lastError?.message);
    
    if (lastError?.message.includes('403')) {
        throw new Error("Access denied. Please ensure the Generative Language API is enabled in your Google Cloud project: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=247319662655");
    } else if (lastError?.message.includes('API key')) {
        throw new Error("Invalid API key. Please check your GEMINI_API_KEY configuration.");
    } else {
        throw new Error("All available AI models failed. Please check your API key and try again later.");
    }
}

module.exports = { extractDataWithGemini };