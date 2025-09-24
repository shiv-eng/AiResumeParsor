document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Cache ---
    const elements = {
        dropZone: document.getElementById('drop-zone'),
        fileInput: document.getElementById('resumeFile'),
        uploadIcon: document.getElementById('upload-icon'),
        uploadText: document.getElementById('upload-text'),
        fileInfo: document.getElementById('file-info'),
        fileNameDisplay: document.getElementById('file-name-display'),
        changeFileBtn: document.getElementById('change-file-btn'),
        feedbackContainer: document.getElementById('feedback-container'),
        loaderContainer: document.getElementById('loader-container'),
        processingStep: document.getElementById('processing-step'),
        successMessage: document.getElementById('success-message'),
        errorMessage: document.getElementById('error-message'),
        errorText: document.getElementById('error-text'),
        formSection: document.getElementById('form-section'),
        jobForm: document.getElementById('job-application-form'),
        clearFormBtn: document.getElementById('clear-form-btn'),
        formFields: {
            firstname: document.getElementById('form-firstname'),
            lastname: document.getElementById('form-lastname'),
            email: document.getElementById('form-email'),
            phone: document.getElementById('form-phone'),
            headline: document.getElementById('form-headline'),
            location: document.getElementById('form-location'),
            linkedin: document.getElementById('form-linkedin'),
            github: document.getElementById('form-github'),
            portfolio: document.getElementById('form-portfolio'),
            leetcode: document.getElementById('form-leetcode'),
            youtube: document.getElementById('form-youtube'),
            summary: document.getElementById('form-summary'),
            skills: document.getElementById('form-skills'),
            workExperience: document.getElementById('form-experience'),
            education: document.getElementById('form-education'),
        }
    };

    // --- Event Listeners ---
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.changeFileBtn.addEventListener('click', () => {
        elements.fileInput.value = ''; // Reset file input
        elements.uploadIcon.classList.remove('hidden');
        elements.uploadText.classList.remove('hidden');
        elements.fileInfo.classList.add('hidden');
        hideAllMessages();
    });
    elements.clearFormBtn.addEventListener('click', clearForm);
    elements.jobForm.addEventListener('submit', handleSubmit);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        elements.dropZone.addEventListener(eventName, preventDefaults);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        elements.dropZone.addEventListener(eventName, () => elements.dropZone.classList.add('drag-over'));
    });
    ['dragleave', 'drop'].forEach(eventName => {
        elements.dropZone.addEventListener(eventName, () => elements.dropZone.classList.remove('drag-over'));
    });
    
    elements.dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length) {
            elements.fileInput.files = files;
            handleFileSelect();
        }
    });

    // --- Functions ---
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleFileSelect() {
        if (elements.fileInput.files.length > 0) {
            const file = elements.fileInput.files[0];
            showFileInfo(file.name);
            uploadAndProcess(file);
        }
    }

    function showFileInfo(fileName) {
        elements.fileNameDisplay.textContent = fileName;
        elements.uploadIcon.classList.add('hidden');
        elements.uploadText.classList.add('hidden');
        elements.fileInfo.classList.remove('hidden');
    }
    
    async function uploadAndProcess(file) {
        // --- UI State Management (FIXED) ---
        // This ensures the UI correctly shows the loader and hides other elements.
        hideAllMessages();
        elements.loaderContainer.classList.remove('hidden');
        elements.formSection.classList.add('hidden');
        clearForm();

        const formData = new FormData();
        formData.append('resume', file);
        
        const steps = [
            'Uploading file...',
            'Extracting text content...',
            'Analyzing with AI...',
            'Parsing structured data...',
            'Finalizing results...'
        ];
        let stepIndex = 0;
        elements.processingStep.textContent = steps[stepIndex];
        const stepInterval = setInterval(() => {
            if (stepIndex < steps.length - 1) {
                stepIndex++;
                elements.processingStep.textContent = steps[stepIndex];
            }
        }, 900);

        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server Error: ${response.status}`);
            }

            const data = await response.json();
            showSuccess(data);
            autofillForm(data);

        } catch (error) {
            console.error('Upload Failed:', error);
            showError(error.message);
        } finally {
            // This 'finally' block GUARANTEES the loader is hidden.
            clearInterval(stepInterval);
            elements.loaderContainer.classList.add('hidden');
        }
    }

    function autofillForm(data) {
        for (const [key, field] of Object.entries(elements.formFields)) {
            if (!field || !data[key]) continue;

            let value = data[key];
            if (Array.isArray(value)) {
                if (key === 'skills') {
                    value = value.join(', ');
                } else if (key === 'workExperience') {
                    value = value.map(job => 
                        `Title: ${job.title || 'N/A'}\nCompany: ${job.company || 'N/A'}\nDates: ${job.dates || 'N/A'}\nDescription: ${job.description || 'N/A'}`
                    ).join('\n\n---\n\n');
                } else if (key === 'education') {
                    value = value.map(edu => 
                        `Institution: ${edu.institution || 'N/A'}\nDegree: ${edu.degree || 'N/A'}\nDates: ${edu.dates || 'N/A'}`
                    ).join('\n\n---\n\n');
                }
            }
            
            if (value && String(value).trim() !== '') {
                field.value = value;
                field.classList.add('autofilled');
            }
        }
    }

    function clearForm() {
        elements.jobForm.reset();
        document.querySelectorAll('.autofilled').forEach(el => el.classList.remove('autofilled'));
    }

    function showSuccess(data) {
        const confidence = data.confidence || 0;
        let confidenceColor = 'text-red-600';
        if (confidence >= 80) confidenceColor = 'text-green-600';
        else if (confidence >= 50) confidenceColor = 'text-yellow-600';
        
        const scoreElement = document.getElementById('confidence-score');
        scoreElement.textContent = `${confidence}%`;
        scoreElement.className = `font-bold ${confidenceColor}`;
        
        elements.successMessage.classList.remove('hidden');
        elements.formSection.classList.remove('hidden');
    }

    function showError(message) {
        elements.errorText.textContent = message;
        elements.errorMessage.classList.remove('hidden');
    }

    function hideAllMessages() {
        elements.successMessage.classList.add('hidden');
        elements.errorMessage.classList.add('hidden');
    }

    function handleSubmit(e) {
        e.preventDefault();
        alert('🎉 Application Submitted Successfully! (This is a demo)');
    }
});

