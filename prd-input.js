// PRD Input Modal - Voice and Text Input for Requirements (feat-028)

let recognition = null;
let isRecording = false;

// Initialize speech recognition if supported
function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isRecording = true;
            updateVoiceUI(true);
            document.getElementById('voice-status').textContent = 'Listening...';
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            const textarea = document.getElementById('prd-requirement-text');
            if (finalTranscript) {
                textarea.value += finalTranscript;
            }

            // Show interim results in status
            if (interimTranscript) {
                document.getElementById('voice-status').textContent = `"${interimTranscript}"`;
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isRecording = false;
            updateVoiceUI(false);

            let errorMsg = 'Voice input error';
            if (event.error === 'not-allowed') {
                errorMsg = 'Microphone access denied. Please enable it in browser settings.';
            } else if (event.error === 'no-speech') {
                errorMsg = 'No speech detected. Please try again.';
            }

            document.getElementById('voice-status').textContent = errorMsg;
            document.getElementById('voice-status').style.color = 'var(--color-error)';
        };

        recognition.onend = () => {
            if (isRecording) {
                // Restart if still recording (for continuous mode)
                try {
                    recognition.start();
                } catch (e) {
                    isRecording = false;
                    updateVoiceUI(false);
                }
            } else {
                updateVoiceUI(false);
                document.getElementById('voice-status').textContent = 'Voice input stopped';
            }
        };
    }
}

// Update voice input UI
function updateVoiceUI(recording) {
    const voiceIcon = document.getElementById('voice-icon');
    const voiceLabel = document.getElementById('voice-label');
    const voiceBtn = document.getElementById('voice-input-btn');

    if (recording) {
        voiceIcon.textContent = '🔴';
        voiceLabel.textContent = 'Stop Voice Input';
        voiceBtn.classList.add('recording');
        voiceBtn.style.background = 'var(--color-error)';
    } else {
        voiceIcon.textContent = '🎤';
        voiceLabel.textContent = 'Start Voice Input';
        voiceBtn.classList.remove('recording');
        voiceBtn.style.background = '';
    }
}

// Toggle voice input
function toggleVoiceInput() {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
        return;
    }

    if (isRecording) {
        // Stop recording
        isRecording = false;
        recognition.stop();
        document.getElementById('voice-status').textContent = 'Voice input stopped';
        document.getElementById('voice-status').style.color = 'var(--color-text-secondary)';
    } else {
        // Start recording
        try {
            recognition.start();
            document.getElementById('voice-status').style.color = 'var(--color-success)';
        } catch (e) {
            console.error('Failed to start voice recognition:', e);
            document.getElementById('voice-status').textContent = 'Failed to start voice input';
            document.getElementById('voice-status').style.color = 'var(--color-error)';
        }
    }
}

// Open PRD Input Modal
function openPrdInputModal() {
    const modal = document.getElementById('prd-input-modal');
    modal.style.display = 'flex';

    // Initialize speech recognition on first open
    if (!recognition) {
        initializeSpeechRecognition();
    }

    // Reset form
    document.getElementById('prd-requirement-text').value = '';
    document.getElementById('voice-status').textContent = '';
    document.getElementById('prd-validation-message').style.display = 'none';

    // Reset acceptance criteria preview
    const preview = document.getElementById('acceptance-criteria-preview');
    preview.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic;">Acceptance criteria will be generated automatically based on your requirement...</p>';
}

// Close PRD Input Modal
function closePrdInputModal() {
    const modal = document.getElementById('prd-input-modal');
    modal.style.display = 'none';

    // Stop voice input if active
    if (isRecording) {
        toggleVoiceInput();
    }
}

// Save PRD Requirement
async function savePrdRequirement() {
    const requirement = document.getElementById('prd-requirement-text').value.trim();
    const appendToExisting = document.getElementById('append-to-existing').checked;
    const validationMsg = document.getElementById('prd-validation-message');
    const saveBtn = document.getElementById('save-prd-btn');

    // Validation
    if (!requirement) {
        validationMsg.textContent = 'Please enter a requirement description';
        validationMsg.style.display = 'block';
        return;
    }

    if (requirement.length < 10) {
        validationMsg.textContent = 'Requirement must be at least 10 characters';
        validationMsg.style.display = 'block';
        return;
    }

    // Hide validation message
    validationMsg.style.display = 'none';

    // Disable button during save
    saveBtn.disabled = true;
    saveBtn.textContent = 'Adding...';

    try {
        // Call backend API
        const response = await fetch('http://localhost:3434/api/prd/add-requirement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requirement,
                mode: isRecording ? 'voice-input' : 'text-input',
                appendToExisting
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Success!
            console.log('✅ Requirement added:', result.data);

            // Show success message
            validationMsg.textContent = `✅ Requirement added successfully! (${result.data.feature.id})`;
            validationMsg.style.display = 'block';
            validationMsg.style.color = 'var(--color-success)';

            // Update preview with generated acceptance criteria
            const preview = document.getElementById('acceptance-criteria-preview');
            preview.innerHTML = '<ul>' +
                result.data.feature.acceptance_criteria.map(c => `<li>${c}</li>`).join('') +
                '</ul>';

            // Close modal after 2 seconds
            setTimeout(() => {
                closePrdInputModal();

                // Reload feature data if on dashboard
                if (typeof loadFeatureData === 'function') {
                    loadFeatureData().then(() => {
                        updateProgressMetrics();
                        populateFeaturesTable();
                    });
                }
            }, 2000);
        } else {
            // Error from server
            validationMsg.textContent = '❌ ' + (result.error || 'Failed to add requirement');
            validationMsg.style.display = 'block';
            validationMsg.style.color = 'var(--color-error)';
        }
    } catch (error) {
        console.error('Failed to add requirement:', error);
        validationMsg.textContent = '❌ Network error. Make sure the backend server is running.';
        validationMsg.style.display = 'block';
        validationMsg.style.color = 'var(--color-error)';
    } finally {
        // Re-enable button
        saveBtn.disabled = false;
        saveBtn.textContent = 'Add Requirement';
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('prd-input-modal');
        if (modal && modal.style.display === 'flex') {
            closePrdInputModal();
        }
    }
});

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'prd-input-modal') {
        closePrdInputModal();
    }
});
