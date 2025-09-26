const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");

async function preprocessImage(buffer) {
    console.log("Pre-processing image for OCR...");
    return sharp(buffer).grayscale().sharpen().normalize().toBuffer();
}

async function processFile(file) {
    const { buffer, mimetype } = file;
    let text = "";
    
    console.log(`Processing file of type: ${mimetype}`);

    if (mimetype === 'application/pdf') {
        const data = await pdfParse(buffer);
        text = data.text;
        // If the PDF is a scanned image, pdf-parse will return very little text.
        // The service will still work, but the quality will depend on the PDF type.
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const { value } = await mammoth.extractRawText({ buffer });
        text = value;
    } else if (mimetype === 'text/plain') {
        text = buffer.toString("utf8");
    } else if (['image/png', 'image/jpeg'].includes(mimetype)) {
        const preprocessedImage = await preprocessImage(buffer);
        console.log("Starting OCR process on pre-processed image...");
        const { data: { text: ocrText } } = await Tesseract.recognize(preprocessedImage, "eng");
        text = ocrText;
        console.log("OCR process finished.");
    } else {
        throw new Error("Unsupported file type provided.");
    }

    return text.replace(/\n{3,}/g, '\n\n');
}

module.exports = { processFile };