const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
    throw new Error("FATAL ERROR: GEMINI_API_KEY is not set in the .env file or environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Updated to use the current stable model
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // Updated model name
});

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

    try {
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
        
        console.log("Successfully parsed JSON from Gemini response");
        return parsedData;

    } catch (error) {
        console.error("Detailed error during Gemini API call:", error.message);
        console.error("Error details:", error);
        
        if (error.message.includes('404')) {
            throw new Error("The AI model is not available. Please check if you're using the correct model name.");
        } else if (error.message.includes('403')) {
            throw new Error("Access denied. Please ensure the Generative Language API is enabled in your Google Cloud project.");
        } else if (error.message.includes('API key')) {
            throw new Error("Invalid API key. Please check your GEMINI_API_KEY configuration.");
        } else {
            throw new Error("The AI model could not be reached. Please try again later.");
        }
    }
}

module.exports = { extractDataWithGemini };