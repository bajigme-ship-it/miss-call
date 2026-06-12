document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    const phoneInput = document.getElementById('phoneNumber');
    const historyWrapper = document.getElementById('historyWrapper');
    const historyChips = document.getElementById('historyChips');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const pasteBtn = document.getElementById('pasteBtn');

    // Load initial history
    loadHistory();

    // Clipboard automatic fill helpers
    function isValidPhoneNumberFormat(text) {
        const clean = text.replace(/[^\d+]/g, '');
        if (clean.startsWith('0') && clean.length === 10) return true;
        if (clean.startsWith('+84') && clean.length === 12) return true;
        if (clean.startsWith('84') && clean.length === 11) return true;
        return false;
    }

    function flashInput() {
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) {
            inputContainer.style.borderColor = 'var(--success)';
            inputContainer.style.boxShadow = '0 0 16px rgba(16, 185, 129, 0.4)';
            setTimeout(() => {
                inputContainer.style.borderColor = '';
                inputContainer.style.boxShadow = '';
            }, 800);
        }
    }

    function autoFillFromClipboard() {
        // Only try to read if the input is empty to avoid overwriting user typing
        if (phoneInput.value.trim() !== '') return;

        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(text => {
                const cleanText = text.trim();
                if (isValidPhoneNumberFormat(cleanText)) {
                    phoneInput.value = cleanText;
                    flashInput();
                }
            }).catch(err => {
                // Silently fail for auto-read if permission is not granted
                console.log('Auto-read clipboard blocked:', err);
            });
        }
    }

    // Try auto-fill on page load and when tab/window gets focus
    setTimeout(autoFillFromClipboard, 500); // Small delay on load
    window.addEventListener('focus', autoFillFromClipboard);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            autoFillFromClipboard();
        }
    });

    // Paste button click listener (user-initiated always has access)
    if (pasteBtn) {
        pasteBtn.addEventListener('click', () => {
            if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard.readText().then(text => {
                    const cleanText = text.trim();
                    phoneInput.value = cleanText;
                    flashInput();
                    
                    // Check if it's a valid phone number, then run search immediately!
                    let sanitized = cleanText.replace(/\D/g, '');
                    if (sanitized.startsWith('84')) {
                        sanitized = '0' + sanitized.substring(2);
                    }
                    if (sanitized.length === 10 && sanitized.startsWith('0')) {
                        performGoogleOSINT(cleanText);
                    }
                }).catch(err => {
                    alert('Không thể truy cập Clipboard. Vui lòng cho phép quyền truy cập bộ nhớ tạm trên trình duyệt.');
                });
            } else {
                alert('Trình duyệt của bạn không hỗ trợ đọc Clipboard tự động.');
            }
        });
    }

    // Form submit listener
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawPhone = phoneInput.value.trim();
        performGoogleOSINT(rawPhone);
    });

    // Clear history listener
    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('cyberOsintGoogleHistory');
        loadHistory();
    });

    // Core logic: validate, build queries, open Google, and save to history
    function performGoogleOSINT(rawPhone) {
        // Clean non-digits
        let clean = rawPhone.replace(/\D/g, '');
        
        // Convert +84 / 84 to 0
        if (clean.startsWith('84')) {
            clean = '0' + clean.substring(2);
        }
        
        // Validation: Vietnam mobile number is 10 digits starting with 0
        const isValid = clean.length === 10 && clean.startsWith('0');
        
        if (!isValid) {
            alert('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số (ví dụ: 0912345678).');
            return;
        }

        // Generate different formats
        const spaced = `${clean.substring(0, 4)} ${clean.substring(4, 7)} ${clean.substring(7)}`;
        const dotted = `${clean.substring(0, 4)}.${clean.substring(4, 7)}.${clean.substring(7)}`;
        const dashed = `${clean.substring(0, 4)}-${clean.substring(4, 7)}-${clean.substring(7)}`;
        const intl = `+84${clean.substring(1)}`;

        // Build the powerful search term
        const queryTerm = `"${clean}" OR "${intl}" OR "${spaced}" OR "${dotted}" OR "${dashed}"`;
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(queryTerm)}`;

        // Save to local storage history
        saveToHistory(clean);

        // Instantly open search results in a new tab
        window.open(googleUrl, '_blank');
    }

    // Save search entry
    function saveToHistory(phone) {
        let history = JSON.parse(localStorage.getItem('cyberOsintGoogleHistory')) || [];
        
        // Remove duplicate
        history = history.filter(item => item !== phone);
        
        // Add to front
        history.unshift(phone);
        
        // Limit to 8 entries
        if (history.length > 8) {
            history.pop();
        }
        
        localStorage.setItem('cyberOsintGoogleHistory', JSON.stringify(history));
        loadHistory();
    }

    // Load history chips
    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('cyberOsintGoogleHistory')) || [];
        historyChips.innerHTML = '';
        
        if (history.length === 0) {
            historyWrapper.style.display = 'none';
            return;
        }
        
        historyWrapper.style.display = 'block';
        
        history.forEach(phone => {
            const formatted = `${phone.substring(0, 4)} ${phone.substring(4, 7)} ${phone.substring(7)}`;
            
            const chip = document.createElement('button');
            chip.className = 'history-chip';
            chip.type = 'button';
            chip.innerHTML = `<i class="fa-solid fa-phone"></i> ${formatted}`;
            
            chip.addEventListener('click', () => {
                phoneInput.value = phone;
                performGoogleOSINT(phone);
            });
            
            historyChips.appendChild(chip);
        });
    }
});
