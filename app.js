const form = document.getElementById('summary-form');
const txtInput = document.getElementById('txt-file');
const apiKeyInput = document.getElementById('apikey');
const summaryResult = document.getElementById('summary-result');
const loader = document.getElementById('loader');
const promptText = document.getElementById('system-prompt').innerText;

form.onsubmit = async (e) => {
  e.preventDefault();
  summaryResult.textContent = '';
  loader.style.display = 'block';

  const file = txtInput.files[0];
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    summaryResult.textContent = "OpenAI APIキーを入力してください";
    loader.style.display = 'none';
    return;
  }
  if (!file) {
    summaryResult.textContent = "ファイルが選択されていません";
    loader.style.display = 'none';
    return;
  }
  if (file.type !== "text/plain" && !file.name.endsWith('.txt')) {
    summaryResult.textContent = "テキストファイル（.txt）を選んでください";
    loader.style.display = 'none';
    return;
  }

  try {
    const reader = new FileReader();
    reader.onload = async function(ev) {
      const text = ev.target.result;
      // POSTでサーバーに送信
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          apikey: apiKey,
          prompt: promptText,
          text
        })
      });
      if (!res.ok) {
        const msg = await res.text();
        summaryResult.textContent = '要約（API）エラー: ' + msg;
      } else {
        const data = await res.json();
        summaryResult.textContent = data.summary;
      }
      loader.style.display = 'none';
    };
    reader.onerror = function() {
      summaryResult.textContent = "ファイルの読込中にエラーが発生しました";
      loader.style.display = 'none';
    };
    reader.readAsText(file, "utf-8");
  } catch (err) {
    summaryResult.textContent = 'クライアントエラー: ' + err;
    loader.style.display = 'none';
  }
};