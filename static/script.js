let mediaRecorder;
let audioChunks = [];

// Start mic recording
async function startRecording() {
      try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);

            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                  if (event.data.size > 0) {
                  audioChunks.push(event.data);
                  }
            };

            mediaRecorder.onstop = async () => {
                  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                  const audioFile = new File([audioBlob], "voice.webm");

                  const formData = new FormData();
                  formData.append("file", audioFile);
                  formData.append("sourceLang", document.getElementById("sourceLang").value);
                  formData.append("targetLang", document.getElementById("targetLang").value);

                  try {
                  const response = await fetch("/translate", {
                        method: "POST",
                        body: formData
                  });

                  const data = await response.json();
                  displayResponse(data);
                  } catch (err) {
                  console.error("Translation error:", err);
                  }
            };

            mediaRecorder.start();
            document.getElementById("status").innerText = "🎤 Recording...";
      } catch (error) {
            alert("Microphone access denied or not available.");
            console.error(error);
      }
}

// Stop mic recording
function stopRecording() {
      if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            document.getElementById("status").innerText = "⏳ Processing...";
      }
}

// Display chat UI with translation result
function displayResponse(data) {
      const chat = document.getElementById("chatbox");
      chat.innerHTML += `<p><strong>You:</strong> ${data.original}</p>`;
      chat.innerHTML += `<p><strong>Translated:</strong> ${data.translated_query}</p>`;
      chat.innerHTML += `<p><strong>Agent Response:</strong> ${data.agent_response}</p>`;
      chat.innerHTML += `<p><strong>Back to Source:</strong> ${data.translated_response}</p>`;
      chat.scrollTop = chat.scrollHeight;

      document.getElementById("status").innerText = "✅ Done!";
}

// Optional: swap source and target languages
function swapLanguages() {
      const source = document.getElementById("sourceLang");
      const target = document.getElementById("targetLang");

      const temp = source.value;
      source.value = target.value;
      target.value = temp;
}
