let isRunning = false;

function start() {
    if (isRunning) return;
    isRunning = true;

    // ✅ Unlock audio context for mobile/safari autoplay restrictions
    try {
        const unlock = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(unlock);
    } catch (e) {
        console.warn("Audio context unlock failed", e);
    }

    runTranslationLoop();
}

function stop() {
    isRunning = false;
    alert("Stopped listening.");
}

function runTranslationLoop() {
    if (!isRunning) return;

    const source = document.getElementById("sourceLang").value;
    const target = document.getElementById("targetLang").value;

    fetch('/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceLang: source, targetLang: target })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Server error");
        }
        return response.json();
    })
    .then(data => {
        const chat = document.getElementById("chatbox");

        if (data.original) {
            chat.innerHTML += `<p><b>You (${source.toUpperCase()}):</b> ${data.original}</p>`;
            chat.innerHTML += `<p><b>Translated (${target.toUpperCase()}):</b> ${data.translated_query}</p>`;
            chat.innerHTML += `<p><b>Agent Response (${target.toUpperCase()}):</b> ${data.agent_response}</p>`;
            chat.innerHTML += `<p><b>Back to ${source.toUpperCase()}:</b> ${data.translated_response}</p>`;

            // ✅ Speak both translations — ensure order
            speakText(data.translated_query, target, () => {
                speakText(data.translated_response, source, () => {
                    if (isRunning) runTranslationLoop();
                });
            });

        } else {
            chat.innerHTML += `<p><i>(No voice detected, retrying...)</i></p>`;
            if (isRunning) runTranslationLoop();
        }

        chat.scrollTop = chat.scrollHeight;
    })
    .catch(err => {
        console.error("Error during loop:", err);
        stop();
    });
}

function speakText(text, langCode, callback) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = langCodeMap(langCode);
    utter.onend = callback;
    window.speechSynthesis.speak(utter);
}

function langCodeMap(code) {
    return {
        "en": "en-US",
        "hi": "hi-IN",
        "ko": "ko-KR",
        "ja": "ja-JP",
        "zh": "zh-CN"
    }[code] || "en-US";
}
