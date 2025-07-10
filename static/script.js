let isRunning = false;
let useWebSocket = true; // Set to false to fall back to polling
let ws = null;

function start() {
      if (isRunning) return;
      isRunning = true;

      if (useWebSocket) {
            startWebSocket();
      } else {
            startPolling();
      }
}

function stop() {
      isRunning = false;

      if (ws) {
            ws.close();
            ws = null;
      }

      alert("Stopped listening.");
}

function startPolling() {
      runTranslationLoop();
}

function runTranslationLoop() {
      if (!isRunning) return;

      const source = document.getElementById("sourceLang").value;
      const target = document.getElementById("targetLang").value;

      fetch('/translate', {
            method: 'POST',
            headers: {
                  'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sourceLang: source, targetLang: target })
      })
            .then(response => {
                  if (!response.ok) throw new Error("Server error");
                  return response.json();
            })
            .then(data => {
                  renderChat(data, source, target);
                  if (isRunning) runTranslationLoop();
            })
            .catch(err => {
                  console.error("Error during loop:", err);
                  stop();
            });
}

function startWebSocket() {
      const source = document.getElementById("sourceLang").value;
      const target = document.getElementById("targetLang").value;

      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${protocol}://${window.location.host}/ws/translate`);

      ws.onopen = () => {
            console.log("WebSocket connected");
            sendLangConfig(source, target);
      };

      ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) {
                  console.error("WebSocket error:", data.error);
                  renderError(data.error);
                  stop();
                  return;
            }

            renderChat(data, source, target);

            if (isRunning) {
                  setTimeout(() => {
                  sendLangConfig(source, target);
                  }, 1500); // Delay between each message loop
            }
      };

      ws.onclose = () => {
            console.log("WebSocket disconnected");
      };

      ws.onerror = (err) => {
            console.error("WebSocket failure:", err);
            stop();
      };
}

function sendLangConfig(source, target) {
      if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ sourceLang: source, targetLang: target }));
      }
}

function renderChat(data, source, target) {
      const chat = document.getElementById("chatbox");

      if (data.original) {
            chat.innerHTML += `<p><b>You (${source}):</b> ${data.original}</p>`;
            chat.innerHTML += `<p><b>Translated to ${target}:</b> ${data.translated_query}</p>`;
            chat.innerHTML += `<p><b>Agent Response (${target}):</b> ${data.agent_response}</p>`;
            chat.innerHTML += `<p><b>Back to ${source}:</b> ${data.translated_response}</p>`;
      } else {
            chat.innerHTML += `<p><i>(No voice detected or empty response)</i></p>`;
      }

      chat.scrollTop = chat.scrollHeight;
}

function renderError(message) {
      const chat = document.getElementById("chatbox");
      chat.innerHTML += `<p style="color:red;"><b>Error:</b> ${message}</p>`;
      chat.scrollTop = chat.scrollHeight;
}

function swapLanguages() {
      const sourceSelect = document.getElementById("sourceLang");
      const targetSelect = document.getElementById("targetLang");

      const temp = sourceSelect.value;
      sourceSelect.value = targetSelect.value;
      targetSelect.value = temp;
}
