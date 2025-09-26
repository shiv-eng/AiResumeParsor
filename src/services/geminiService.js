const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
    throw new Error("FATAL ERROR: GEMINI_API_KEY is not set in the .env file or environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use the stable and universally available 'gemini-pro' model.
// This is the most reliable choice for standard API keys.
const model = genAI.getGenerativeModel({
    model: "gemini-pro",
});

async function extractDataWithGemini(text) {
    const prompt = `You are an elite resume data extraction engine. Convert the following resume text into a perfect JSON object. Your response MUST be only the clean JSON object, starting with { and ending with }, with no extra text, comments, or markdown. \n---BEGIN RESUME---\n${text}\n---END RESUME---`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();
        
        const startIndex = responseText.indexOf('{');
        const endIndex = responseText.lastIndexOf('}');

        if (startIndex === -1 || endIndex === -1) {
            console.error("Invalid AI Response Text:", responseText);
            throw new Error("Could not find a valid JSON object in the AI response.");
        }

        const jsonString = responseText.substring(startIndex, endIndex + 1);
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Detailed error during Gemini API call:", error.message);
        throw new Error("The AI model could not be reached. Please check your API key and Google Cloud Project permissions.");
    }
}

module.exports = { extractDataWithGemini };