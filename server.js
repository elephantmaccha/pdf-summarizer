const serve = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    // OpenAI API要約専用エンドポイント
    if (url.pathname === "/api/summary" && req.method === "POST") {
      try {
        const {apikey, prompt, text} = await req.json();

        if (!apikey || !text || !prompt) {
          return new Response("必須情報が不足しています", { status: 400 });
        }

        // OpenAI Chat API呼び出し
        // 2025年現在主流model: gpt-3.5-turbo もしくは gpt-4o.  各社無料・有料キーがあります
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apikey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo", // 最新の軽量・低コストなら"gpt-3.5-turbo"。高精度は"gpt-4o"等
            messages: [
              {role: "system", content: prompt},
              {role: "user", content: text}
            ],
            max_tokens: 2048,
            temperature: 0.2, // なるべく事実準拠にしたい場合
          }),
        });

        if (!openaiRes.ok) {
          const errMsg = await openaiRes.text();
          return new Response("OpenAI APIエラー: " + errMsg, { status: 500 });
        }

        const resJson = await openaiRes.json();
        const summary = resJson.choices?.[0]?.message?.content || '(要約結果を取得できませんでした)';
        return Response.json({summary});

      } catch(err) {
        return new Response("サーバーエラー: " + String(err), { status: 500 });
      }
    }

    // 静的ファイルサーブ
    let path = url.pathname;
    if (path === '/') path = '/index.html';
    try {
      const file = Bun.file('.' + path);
      if (await file.exists()) {
        let contentType = 'text/plain';
        if (path.endsWith('.html')) contentType = 'text/html';
        else if (path.endsWith('.css')) contentType = 'text/css';
        else if (path.endsWith('.js')) contentType = 'text/javascript';
        else if (path.endsWith('.txt')) contentType = 'text/plain';
        return new Response(file, { headers: { "Content-Type": contentType } });
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (e) {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
});

console.log("Server running at http://0.0.0.0:3001");
// スマホからは http://<PCのIPアドレス>:3001 でアクセス

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