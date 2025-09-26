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
    model: "gemini-pro", // <-- THIS IS THE ONLY CHANGE
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

// NOTE: The rest of your geminiService.js file remains exactly the same.
// The "professionalSchema", "generationConfig", "extractJsonFromText", 
// and "extractDataWithGemini" functions do not need to be changed.