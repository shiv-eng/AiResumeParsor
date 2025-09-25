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

// --- PROFESSIONAL-GRADE SCHEMA ---
// This schema is more granular, providing structured data that is easier
// for clients to store and query in a database.
const professionalSchema = {
    type: "OBJECT",
    properties: {
        firstname: { type: "STRING" },
        lastname: { type: "STRING" },
        email: { type: "STRING" },
        phone: { type: "STRING" },
        headline: { type: "STRING" },
        location: { type: "STRING" },
        linkedin: { type: "STRING" },
        github: { type: "STRING" },
        portfolio: { type: "STRING" },
        leetcode: { type: "STRING" },
        youtube: { type: "STRING" },
        summary: { type: "STRING" },
        skills: {
            type: "OBJECT",
            description: "Categorized skills for better filtering and search.",
            properties: {
                languages: { type: "ARRAY", items: { type: "STRING" } },
                frameworks_libraries: { type: "ARRAY", items: { type: "STRING" } },
                databases: { type: "ARRAY", items: { type: "STRING" } },
                cloud_devops: { type: "ARRAY", items: { type: "STRING" } },
                tools: { type: "ARRAY", items: { type: "STRING" } },
            }
        },
        workExperience: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    company: { type: "STRING" },
                    title: { type: "STRING" },
                    startDate: { type: "STRING", description: "The start date in YYYY-MM format" },
                    endDate: { type: "STRING", description: "The end date in YYYY-MM format, or 'Present'" },
                    description: { type: "STRING" },
                },
                required: ["company", "title", "startDate"]
            }
        },
        education: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    institution: { type: "STRING" },
                    degree: { type: "STRING" },
                    startDate: { type: "STRING", description: "The start date in YYYY-MM format" },
                    endDate: { type: "STRING", description: "The end date in YYYY-MM format or graduation year (YYYY)" },
                },
                required: ["institution", "degree"]
            }
        },
        projects: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING" },
                    description: { type: "STRING" },
                },
                required: ["name"]
            }
        },
        certifications: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING" },
                    issuingOrganization: { type: "STRING" },
                    date: { type: "STRING", description: "The date of issue in YYYY-MM format" },
                },
                required: ["name"]
            }
        },
    },
};

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro-latest",
    safetySettings,
    systemInstruction: `You are an elite resume data extraction engine. Your task is to convert unstructured resume text into a perfect JSON object based on the provided schema. You will follow a strict three-stage process: Analyze, Extract, and Verify.

    **Stage 1: Analyze the Document Structure**
    - First, mentally map out the resume. Identify the key sections: contact info, summary, work experience, skills, education, and projects. Understand the layout before you begin extracting.

    **Stage 2: Extract Data with High Precision**
    - **Contact Info:** Find the candidate's Full Name (split into \`firstname\` and \`lastname\`), Email, Phone, and URLs for LinkedIn and GitHub.
    - **Skills:** Find the skills section. Do not just list them; you MUST categorize them into the appropriate fields: \`languages\`, \`frameworks_libraries\`, \`databases\`, \`cloud_devops\`, and \`tools\`.
    - **Work Experience & Education:** For EACH entry, create a separate object. Extract the \`company\`/\`institution\`, \`title\`/\`degree\`, and the dates. You MUST format dates as "YYYY-MM". If only a year is given, use YYYY-01. For the current job, the endDate should be "Present".
    
    **Stage 3: Verify Your Own Work (Self-Correction)**
    - Before you output the JSON, you MUST perform a self-correction check. Ask yourself:
        - "Is the \`firstname\` or \`email\` field empty?" If so, I have failed. I must re-scan the text to find it.
        - "Is my final output a single, clean JSON object starting with \`{\` and ending with \`}\`?" Yes, it must be. I will not add any extra text, comments, or markdown.

    Your final output MUST be only the JSON object, adhering strictly to the schema. Your reputation for 100% accuracy depends on it.`,
});

const generationConfig = {
    responseMimeType: "application/json",
    temperature: 0.0,
    responseSchema: professionalSchema,
};

function extractJsonFromText(text) {
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
        const parsedJson = extractJsonFromText(responseText);
        console.log("Successfully parsed JSON from response.");
        return parsedJson;
    } catch (e) {
        console.error("CRITICAL: Failed to extract and parse JSON from Gemini response.", "Error:", e.message, "Raw Response:", responseText);
        throw new Error("The AI model returned a response that could not be read. Please try again.");
    }
}

module.exports = { extractDataWithGemini };