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
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apikey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {role: "system", content: prompt},
              {role: "user", content: text}
            ],
            max_tokens: 2048,
            temperature: 0.2,
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