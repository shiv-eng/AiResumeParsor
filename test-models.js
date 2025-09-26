// test-models.js - Run this locally to test which models work
const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = "AIzaSyBx4cCMWb0ChSv6sy_tfHB7ym2qBTjBzzU"; // Your API key

const MODEL_NAMES = [
    "gemini-1.5-flash",
    "gemini-1.5-pro", 
    "gemini-1.0-pro",
    "gemini-pro",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest"
];

async function testAllModels() {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const workingModels = [];
    const failedModels = [];

    console.log("🧪 Testing Gemini models...\n");

    for (const modelName of MODEL_NAMES) {
        try {
            console.log(`Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            const result = await model.generateContent("Respond with just the word 'success' if you can read this.");
            const response = await result.response;
            const text = response.text();
            
            console.log(`✅ ${modelName} - Response: ${text.trim()}`);
            workingModels.push(modelName);
            
        } catch (error) {
            console.log(`❌ ${modelName} - Error: ${error.message}`);
            failedModels.push({ model: modelName, error: error.message });
        }
        
        console.log(""); // Empty line for readability
    }

    console.log("\n📊 RESULTS:");
    console.log("=".repeat(50));
    
    if (workingModels.length > 0) {
        console.log("✅ Working models:");
        workingModels.forEach(model => console.log(`   - ${model}`));
    } else {
        console.log("❌ No working models found!");
    }
    
    if (failedModels.length > 0) {
        console.log("\n❌ Failed models:");
        failedModels.forEach(({model, error}) => {
            console.log(`   - ${model}: ${error.substring(0, 100)}...`);
        });
    }

    // Recommendations
    console.log("\n💡 RECOMMENDATIONS:");
    if (workingModels.length === 0) {
        console.log("1. Check if the Generative Language API is enabled in your Google Cloud project");
        console.log("2. Verify your API key is correct and has proper permissions");
        console.log("3. Make sure billing is enabled on your Google Cloud project");
    } else {
        console.log(`1. Use the first working model: ${workingModels[0]}`);
        console.log("2. Update your geminiService.js to use the working model");
    }
}

testAllModels().catch(console.error);