const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
    throw new Error("FATAL ERROR: GEMINI_API_KEY is not set in the .env file or environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-pro", // Use the universally available model
});

async function extractDataWithGemini(text) {
    const prompt = `You are an elite resume data extraction engine. Convert the following resume text into a perfect JSON object. Your response MUST be only the clean JSON object, with no extra text or markdown. \n---BEGIN RESUME---\n${text}\n---END RESUME---`;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    
    // Helper function to find and parse JSON from the response
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) {
        throw new Error("Could not find a valid JSON object in the AI response.");
    }
    const jsonString = responseText.substring(startIndex, endIndex + 1);
    return JSON.parse(jsonString);
}

module.exports = { extractDataWithGemini };