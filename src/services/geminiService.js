const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
    throw new Error("FATAL ERROR: GEMINI_API_KEY is not set in the .env file or environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

const professionalSchema = {
    type: "OBJECT",
    properties: {
        firstname: { type: "STRING" }, lastname: { type: "STRING" },
        email: { type: "STRING" }, phone: { type: "STRING" },
        headline: { type: "STRING" }, location: { type: "STRING" },
        linkedin: { type: "STRING" }, github: { type: "STRING" },
        portfolio: { type: "STRING" }, leetcode: { type: "STRING" },
        youtube: { type: "STRING" }, summary: { type: "STRING" },
        skills: {
            type: "OBJECT",
            properties: {
                languages: { type: "ARRAY", items: { type: "STRING" } },
                frameworks_libraries: { type: "ARRAY", items: { type: "STRING" } },
                databases: { type: "ARRAY", items: { type: "STRING" } },
                cloud_devops: { type: "ARRAY", items: { type: "STRING" } },
                tools: { type: "ARRAY", items: { type: "STRING" } },
            }
        },
        workExperience: {
            type: "ARRAY", items: { type: "OBJECT", properties: {
                    company: { type: "STRING" }, title: { type: "STRING" },
                    startDate: { type: "STRING" }, endDate: { type: "STRING" },
                    description: { type: "STRING" },
                }, required: ["company", "title", "startDate"] } },
        education: {
            type: "ARRAY", items: { type: "OBJECT", properties: {
                    institution: { type: "STRING" }, degree: { type: "STRING" },
                    startDate: { type: "STRING" }, endDate: { type: "STRING" },
                }, required: ["institution", "degree"] } },
    },
};

const model = genAI.getGenerativeModel({
    model: "gemini-pro", // Use the universally available model
    safetySettings,
});

const generationConfig = {
    responseMimeType: "application/json",
    temperature: 0.0,
    // Note: gemini-pro does not support forcing a response schema,
    // but the detailed system prompt handles this effectively.
};

function extractJsonFromText(text) {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("Could not find a valid JSON object in the AI response.");
    }
    const jsonString = text.substring(startIndex, endIndex + 1);
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        throw new Error("The extracted text could not be parsed as JSON.");
    }
}

async function extractDataWithGemini(text) {
    const prompt = `You are an elite resume data extraction engine. Convert the following resume text into a perfect JSON object based on this schema: ${JSON.stringify(professionalSchema)}. Your response MUST be only the clean JSON object, with no extra text or markdown. \n---BEGIN RESUME---\n${text}\n---END RESUME---`;

    const result = await model.generateContent(prompt, generationConfig);
    const responseText = await result.response.text();
    return extractJsonFromText(responseText);
}

// --- Correct Export Statement ---
module.exports = { extractDataWithGemini };