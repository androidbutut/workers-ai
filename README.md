# workers-ai

🎯 Fitur Utama:\n
/chat - Chat biasa dengan AI, bisa atur temperature & max_tokens\n
/code - Generate kode dalam berbagai bahasa programming\n
/analyze - Analisis teks (sentiment, code review, SEO, dll)\n
/summarize - Ringkas teks panjang (short/medium/long)
/stream - Streaming response real-time\n
📝 Cara Pakai:\n
// Chat biasa
```
fetch('https://your-worker.workers.dev/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: 'Kamu adalah asisten pintar' },
      { role: 'user', content: 'Jelasin apa itu async/await' }
    ],
    temperature: 0.7
  })
})

// Generate code
fetch('https://your-worker.workers.dev/code', {
  method: 'POST',
  body: JSON.stringify({
    prompt: 'Buatin function untuk sorting array dengan bubble sort',
    language: 'javascript'
  })
})
```

⚙️ Setup di Cloudflare:
Buat Workers baru di dashboard Cloudflare
Copy paste kode di atas
Tambahkan AI binding di wrangler.toml:

```
name = "ai-backend"
main = "src/index.js"

[ai]
binding = "AI"
```
Udah support CORS juga, jadi bisa dipanggil dari frontend manapun! 🔥
