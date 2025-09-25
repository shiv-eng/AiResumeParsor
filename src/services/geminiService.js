const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Please ensure a .env file exists in the project root and the server is restarted.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro-latest",
    safetySettings,
    // --- THE DEFINITIVE FIX: "Analyze, Extract, and Verify" System Instruction ---
    // This multi-stage process dramatically improves reliability and accuracy.
    systemInstruction: `You are an elite resume data extraction engine. Your task is to convert unstructured resume text into a perfect JSON object. You will follow a strict three-stage process: Analyze, Extract, and Verify.

    **Stage 1: Analyze the Document Structure**
    - First, mentally map out the resume. Identify the key sections: the header with contact info, the summary, the work experience, skills, education, and projects. Understand the layout before you begin extracting. Some resumes are multi-column; be aware of this.

    **Stage 2: Extract Data with High Precision**
    - **Header Information (Top Priority):**
        - Find the candidate's **Full Name**. It's almost always the most prominent text. Split it into \`firstname\` and \`lastname\`.
        - Find the **Email Address**. It will contain an "@" symbol.
        - Find the **Phone Number**. It's a series of digits, possibly with dashes, spaces, or parentheses.
        - Scan aggressively for URLs. Find **LinkedIn** ("linkedin.com") and **GitHub** ("github.com") links. These are critical.
    - **Body Information:**
        - **Work Experience:** This is the most important section. For EACH job, create a separate object. Extract the \`company\`, \`title\`, \`dates\` of employment, and the \`description\` of responsibilities. Do NOT merge different jobs into one description.
        - **Skills:** Find the section listing technologies, languages, or tools and extract every single one into the \`skills\` array.
        - **Education & Projects:** Methodically extract each entry into its respective array of objects.

    **Stage 3: Verify Your Own Work (Self-Correction)**
    - Before you output the JSON, you MUST perform a self-correction check. Ask yourself:
        - "Is the \`firstname\` or \`email\` field empty?" If so, I have failed. I must re-scan the text to find it. It is there.
        - "Does a 'Senior Developer' resume have an empty \`workExperience\` array?" This is a logical contradiction. I must find the work history.
        - "Is my final output a single, clean JSON object starting with \`{\` and ending with \`}\`?" Yes, it must be. I will not add any extra text or markdown.

    Your final output MUST be only the JSON object, adhering strictly to the schema. Your reputation for 100% accuracy depends on it.`,
});

const generationConfig = {
    responseMimeType: "application/json",
    temperature: 0.0, // Set to 0 for maximum determinism and consistency
    responseSchema: {
        type: "OBJECT",
        properties: {
            firstname: { type: "STRING" }, lastname: { type: "STRING" },
            email: { type: "STRING" }, phone: { type: "STRING" },
            headline: { type: "STRING" }, location: { type: "STRING" },
            linkedin: { type: "STRING" }, github: { type: "STRING" },
            portfolio: { type: "STRING" }, leetcode: { type: "STRING" },
            youtube: { type: "STRING" }, summary: { type: "STRING" },
            skills: { type: "ARRAY", items: { type: "STRING" } },
            workExperience: {
                type: "ARRAY", items: { type: "OBJECT", properties: {
                        company: { type: "STRING" }, title: { type: "STRING" },
                        dates: { type: "STRING" }, description: { type: "STRING" },
                    }, required: ["company", "title", "dates"] } },
            education: {
                type: "ARRAY", items: { type: "OBJECT", properties: {
                        institution: { type: "STRING" }, degree: { type: "STRING" }, dates: { type: "STRING" },
                    }, required: ["institution", "degree"] } },
            projects: {
                type: "ARRAY", items: { type: "OBJECT", properties: {
                        name: { type: "STRING" }, description: { type: "STRING" },
                    }, required: ["name"] } },
            certifications: {
                type: "ARRAY", items: { type: "OBJECT", properties: {
                        name: { type: "STRING" }, issuingOrganization: { type: "STRING" }, date: { type: "STRING" },
                    }, required: ["name"] } },
        },
    },
};

/**
 * --- BULLETPROOF PARSING FUNCTION V2 ---
 * Finds and parses a JSON object from a string, no matter what extra text or markdown surrounds it.
 * @param {string} text The raw response text from the AI model.
 * @returns {object} The parsed JSON object.
 */
function extractJsonFromText(text) {
    // Find the first '{' and the last '}' to isolate the JSON object
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        console.error("No valid JSON object found in the response string.");
        throw new Error("Could not find a valid JSON object in the AI response.");
    }

    const jsonString = text.substring(startIndex, endIndex + 1);
    
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Failed to parse the extracted JSON string:", error);
        throw new Error("The extracted text could not be parsed as JSON.");
    }
}

async function extractDataWithGemini(text) {
    const prompt = `Please parse this resume text. Follow your internal "Analyze, Extract, and Verify" protocol to ensure 100% accuracy. The final output must be a perfect JSON object.\n---BEGIN RESUME---\n${text}\n---END RESUME---`;

    console.log("Sending prompt to Gemini 1.5 Pro with AEV protocol...");
    const result = await model.generateContent(prompt, generationConfig);
    const response = await result.response;
    
    const responseText = response.text();
    console.log("Received raw response from Gemini.");

    try {
        // Use the robust parsing function to guarantee a valid JSON object
        const parsedJson = extractJsonFromText(responseText);
        console.log("Successfully parsed JSON from response.");
        return parsedJson;
    } catch (e) {
        console.error("CRITICAL: Failed to extract and parse JSON from Gemini response.", "Error:", e.message, "Raw Response:", responseText);
        // Provide a clear error message to the frontend
        throw new Error("The AI model returned a response that could not be read. Please try again.");
    }
}

module.exports = { extractDataWithGemini };