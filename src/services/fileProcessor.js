const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Tesseract = require("tesseract.js");

async function processFile(file) {
    const { buffer, mimetype } = file;
    let text = "";
    
    console.log(`Processing file of type: ${mimetype}`);

    if (mimetype === 'application/pdf') {
        const data = await pdfParse(buffer);
        text = data.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const { value } = await mammoth.extractRawText({ buffer });
        text = value;
    } else if (mimetype === 'text/plain') {
        text = buffer.toString("utf8");
    } else if (['image/png', 'image/jpeg'].includes(mimetype)) {
        console.log("Starting OCR process...");
        const { data: { text: ocrText } } = await Tesseract.recognize(buffer, "eng");
        text = ocrText;
        console.log("OCR process finished.");
    } else {
        throw new Error("Unsupported file type provided.");
    }

    return text;
}

module.exports = { processFile };

