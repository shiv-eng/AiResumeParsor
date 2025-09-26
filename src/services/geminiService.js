const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
    throw new Error("FATAL ERROR: GEMINI_API_KEY is not set in the .env file or environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use the 'gemini-1.5-flash-latest' model, which your API key has access to.
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
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
        console.error("Detailed error during Gemini API call:", error);
        throw new Error(`The AI model could not be reached. Error: ${error.message}`);
    }
}

module.exports = { extractDataWithGemini };