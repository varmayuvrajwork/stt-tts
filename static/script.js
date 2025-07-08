let isRunning = false;

function start() {
      if (isRunning) return;
      isRunning = true;
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
                  const chat = document.getElementById("chatbox");

                  if (data.original) {
                  chat.innerHTML += `<p><b>You (${source}):</b> ${data.original}</p>`;
                  chat.innerHTML += `<p><b>Translated to ${target}:</b> ${data.translated_query}</p>`;
                  chat.innerHTML += `<p><b>Agent Response (${target}):</b> ${data.agent_response}</p>`;
                  chat.innerHTML += `<p><b>Back to ${source}:</b> ${data.translated_response}</p>`;
                  } else {
                  chat.innerHTML += `<p><i>(No voice detected, retrying...)</i></p>`;
                  }

                  chat.scrollTop = chat.scrollHeight;

                  if (isRunning) runTranslationLoop();
            })
            .catch(err => {
                  console.error("Error during loop:", err);
                  stop();
            });
      }
