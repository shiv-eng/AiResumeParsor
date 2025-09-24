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
    model: "gemini-2.5-flash-preview-05-20",
    safetySettings,
    // --- DEFINITIVE FIX: A NEW, MORE ROBUST SYSTEM INSTRUCTION ---
    systemInstruction: `You are a highly intelligent and meticulous resume parsing engine. Your primary function is to receive raw text and convert it into a structured JSON object with the highest possible accuracy. Failure to find findable data is not an option.

    **Core Analysis Protocol:**
    1.  **Prioritize the Header Block:** The most critical information (name, email, phone, location, links) is almost always in the top 20% of the document. Analyze this "Header Block" first and with the most scrutiny.
    2.  **Aggressive Link Detection:** Do not wait for explicit labels like "GitHub:". Your task is to scan the ENTIRE document for any string that is a URL. Once found, you MUST classify it based on its domain.
        - A URL containing 'linkedin.com/in/' IS the \`linkedin\` profile.
        - A URL containing 'github.com' IS the \`github\` profile.
        - A URL containing 'leetcode.com' IS the \`leetcode\` profile.
        - Any other personal website URL IS the \`portfolio\`.
    3.  **Context is Key:** You must infer data from context.
        - The \`name\` is the largest, most prominent text at the top of the resume.
        - The \`headline\` is the professional title or short description directly beneath the name (e.g., "Senior Software Engineer"). It is NOT the longer "Summary" paragraph.
    4.  **Mandatory Self-Correction:** Before finalizing your JSON output, you must perform a self-correction pass. If critical fields like 'firstname', 'email', or 'phone' are empty, you must re-scan the Header Block to find them. They are there.`,
});

const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: {
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
            skills: { type: "ARRAY", items: { type: "STRING" } },
            workExperience: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        company: { type: "STRING" },
                        title: { type: "STRING" },
                        dates: { type: "STRING" },
                        description: { type: "STRING" },
                    },
                    required: ["company", "title", "dates", "description"]
                }
            },
            education: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        institution: { type: "STRING" },
                        degree: { type: "STRING" },
                        dates: { type: "STRING" },
                    },
                    required: ["institution", "degree", "dates"]
                }
            },
        },
    },
};

async function extractDataWithGemini(text) {
    const prompt = `Please perform a forensic analysis and parse the following resume text:\n---BEGIN RESUME---\n${text}\n---END RESUME---`;

    console.log("Sending prompt to Gemini...");
    const result = await model.generateContent(prompt, generationConfig);
    const response = await result.response;

    if (!response.text()) {
        console.error("Gemini response is empty. Checking for safety feedback...");
        if (response.promptFeedback && response.promptFeedback.blockReason) {
            const blockReason = response.promptFeedback.blockReason;
            console.error(`Request was blocked by Gemini's safety filters. Reason: ${blockReason}`);
            throw new Error(`The resume content was blocked by the AI's safety filters (Reason: ${blockReason}).`);
        } else {
             console.error("Unknown error: Gemini returned an an empty response without a specific block reason.", response);
             throw new Error("The AI model returned an empty response.");
        }
    }
    
    const responseText = response.text();
    console.log("Received response from Gemini.");

    try {
        let cleanJsonText = responseText;
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch && jsonMatch[1]) {
            console.log("Extracted JSON from markdown block.");
            cleanJsonText = jsonMatch[1];
        } else {
            const firstBracket = responseText.indexOf('{');
            const lastBracket = responseText.lastIndexOf('}');
            if (firstBracket !== -1 && lastBracket > firstBracket) {
                console.log("Extracted JSON by finding first and last brackets.");
                cleanJsonText = responseText.substring(firstBracket, lastBracket + 1);
            }
        }
        return JSON.parse(cleanJsonText);
    } catch (e) {
        console.error("Error parsing JSON from Gemini:", e, "Raw response:", responseText);
        throw new Error("Failed to parse AI model response. The model may have returned invalid JSON.");
    }
}

module.exports = { extractDataWithGemini };

