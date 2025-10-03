export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Router
      if (path === '/chat' && request.method === 'POST') {
        return await handleChat(request, env, corsHeaders);
      }
      
      if (path === '/code' && request.method === 'POST') {
        return await handleCodeGeneration(request, env, corsHeaders);
      }
      
      if (path === '/analyze' && request.method === 'POST') {
        return await handleAnalysis(request, env, corsHeaders);
      }
      
      if (path === '/summarize' && request.method === 'POST') {
        return await handleSummarize(request, env, corsHeaders);
      }

      if (path === '/stream' && request.method === 'POST') {
        return await handleStreamChat(request, env, corsHeaders);
      }

      if (path === '/redesign' && request.method === 'POST') {
        return await handleRedesign(request, env, corsHeaders);
      }

      if (path === '/scrape' && request.method === 'POST') {
        return await handleScrape(request, env, corsHeaders);
      }
      
      // Root endpoint - info
      if (path === '/' && request.method === 'GET') {
        return Response.json({
          name: 'Smart AI Backend',
          version: '1.0.0',
          endpoints: {
            '/chat': 'POST - Chat dengan AI',
            '/code': 'POST - Generate kode',
            '/analyze': 'POST - Analisis teks/data',
            '/summarize': 'POST - Ringkas teks panjang',
            '/stream': 'POST - Chat dengan streaming response',
            '/redesign': 'POST - Redesign website dari URL',
            '/scrape': 'POST - Scrape konten website'
          },
          models: {
            chat: '@cf/meta/llama-3.1-8b-instruct',
            // PENTING: Menggunakan DeepSeek Coder untuk kode
            code: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', 
            analysis: '@cf/meta/llama-3.1-8b-instruct'
          }
        }, { headers: corsHeaders });
      }

      return Response.json(
        { error: 'Endpoint tidak ditemukan' },
        { status: 404, headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }
  }
};

// Handler untuk chat biasa
async function handleChat(request, env, corsHeaders) {
  const { messages, temperature = 0.7, max_tokens = 2048 } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return Response.json(
      { error: 'Format messages salah. Harus array of objects.' },
      { status: 400, headers: corsHeaders }
    );
  }

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    temperature,
    max_tokens
  });

  return Response.json({
    success: true,
    response: response.response,
    usage: response.usage || null
  }, { headers: corsHeaders });
}

// Handler untuk code generation
async function handleCodeGeneration(request, env, corsHeaders) {
  const { prompt, language = 'javascript' } = await request.json();

  if (!prompt) {
    return Response.json(
      { error: 'Prompt wajib diisi' },
      { status: 400, headers: corsHeaders }
    );
  }

  const systemPrompt = `Kamu adalah expert programmer yang sangat pintar. 
Tugas kamu adalah generate kode ${language} yang clean, efisien, dan well-documented.
Selalu tambahkan comment untuk menjelaskan logika kompleks di dalam kode.
Ikuti best practices dan modern coding standards.
HANYA JAWAB DENGAN BLOK KODE MARKDOWN (contoh: \`\`\`${language}...\`\`\`). JANGAN ada teks atau penjelasan lain di luar blok kode!`; // <--- PENTING: Tambahkan batasan ini

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ];

  // MODEL YANG DIUBAH: Menggunakan DeepSeek Coder untuk performa kode yang lebih baik
  const CODE_MODEL = '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b';

  const response = await env.AI.run(CODE_MODEL, { 
    messages,
    temperature: 0.3, // Lower temp untuk code generation lebih konsisten
    max_tokens: 3000
  });

  return Response.json({
    success: true,
    code: response.response,
    language
  }, { headers: corsHeaders });
}

// Handler untuk analisis
async function handleAnalysis(request, env, corsHeaders) {
  const { text, type = 'general' } = await request.json();

  if (!text) {
    return Response.json(
      { error: 'Text wajib diisi' },
      { status: 400, headers: corsHeaders }
    );
  }

  let systemPrompt = '';
  
  switch(type) {
    case 'sentiment':
      systemPrompt = 'Analisis sentimen dari teks berikut. Tentukan apakah positif, negatif, atau netral, dan berikan alasannya.';
      break;
    case 'code-review':
      systemPrompt = 'Review kode berikut. Cari bug, masalah performa, security issues, dan berikan saran improvement.';
      break;
    case 'seo':
      systemPrompt = 'Analisis teks dari perspektif SEO. Berikan saran untuk keyword, readability, dan optimization.';
      break;
    default:
      systemPrompt = 'Analisis teks berikut secara mendalam dan berikan insight yang berguna.';
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text }
  ];

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    temperature: 0.5,
    max_tokens: 2048
  });

  return Response.json({
    success: true,
    analysis: response.response,
    type
  }, { headers: corsHeaders });
}

// Handler untuk summarize
async function handleSummarize(request, env, corsHeaders) {
  const { text, length = 'medium' } = await request.json();

  if (!text) {
    return Response.json(
      { error: 'Text wajib diisi' },
      { status: 400, headers: corsHeaders }
    );
  }

  const lengthGuide = {
    short: 'dalam 2-3 kalimat singkat',
    medium: 'dalam 1 paragraf (5-7 kalimat)',
    long: 'dalam beberapa paragraf dengan detail penting'
  };

  const systemPrompt = `Ringkas teks berikut ${lengthGuide[length] || lengthGuide.medium}. 
Fokus pada poin-poin paling penting dan relevan.
Gunakan bahasa yang jelas dan mudah dipahami.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text }
  ];

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    temperature: 0.4,
    max_tokens: 1024
  });

  return Response.json({
    success: true,
    summary: response.response,
    original_length: text.length,
    summary_length: response.response.length
  }, { headers: corsHeaders });
}

// Handler untuk streaming chat
async function handleStreamChat(request, env, corsHeaders) {
  const { messages, temperature = 0.7 } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return Response.json(
      { error: 'Format messages salah' },
      { status: 400, headers: corsHeaders }
    );
  }

  const stream = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    temperature,
    stream: true
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'content-type': 'text/event-stream'
    }
  });
}

// Handler untuk scrape website
async function handleScrape(request, env, corsHeaders) {
  const { url } = await request.json();

  if (!url) {
    return Response.json(
      { error: 'URL wajib diisi' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // Scrape menggunakan Jina AI Reader
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to scrape: ${response.statusText}`);
    }

    const content = await response.text();

    return Response.json({
      success: true,
      url,
      content,
      length: content.length,
      scraped_at: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json(
      { error: `Gagal scrape website: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handler untuk redesign website (OPTIMIZED VERSION - No Timeout)
async function handleRedesign(request, env, corsHeaders) {
  const { 
    url, 
    style = 'modern',
    framework = 'html',
    includeJS = false 
  } = await request.json();

  if (!url) {
    return Response.json(
      { error: 'URL wajib diisi' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // Scrape website dulu
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    const scrapeResponse = await fetch(jinaUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown'
      },
      signal: AbortSignal.timeout(10000) // 10s timeout untuk scraping
    });

    if (!scrapeResponse.ok) {
      throw new Error(`Failed to scrape: ${scrapeResponse.statusText}`);
    }

    const websiteContent = await scrapeResponse.text();

    // Style guidelines (shortened)
    const styleGuides = {
      modern: 'gradient, shadow, rounded, smooth animations',
      minimalist: 'clean whitespace, typography focus, neutral colors',
      glassmorphism: 'backdrop-blur, transparency, glass effect',
      neumorphism: 'soft shadows, subtle 3D effect',
      cyberpunk: 'neon colors, glitch effects, futuristic',
      corporate: 'professional, solid colors, structured'
    };

    // OPTIMASI 1: Drastis kurangi konten untuk speed
    const contentLimit = 1500; // Dari 3000 ke 1500
    const truncatedContent = websiteContent.slice(0, contentLimit);

    // OPTIMASI 2: Simplified & shorter prompt
    const systemPrompt = `Expert UI/UX designer. Redesign website dengan style ${style}.

Style: ${styleGuides[style] || styleGuides.modern}

Rules:
- Pure Tailwind CSS (no custom CSS)
- Responsive design
- Dark mode ready
- ${includeJS ? 'Add JavaScript' : 'No JavaScript'}

Content:
${truncatedContent}

Output: ${framework} code ONLY. Start with code immediately.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create ${style} design now!` }
    ];

    // OPTIMASI 3: Gunakan model yang lebih cepat untuk redesign
    // Llama lebih cepat dari DeepSeek untuk task ini
    const MODEL = '@cf/meta/llama-3.1-8b-instruct';

    // OPTIMASI 4: Kurangi max_tokens untuk response lebih cepat
    const aiResponse = await env.AI.run(MODEL, {
      messages,
      temperature: 0.6, // Lower untuk speed
      max_tokens: 2048  // Turun dari 4096
    });

    let rawOutput = aiResponse.response;

    if (!rawOutput || rawOutput.trim() === '') {
      throw new Error('AI tidak menghasilkan output');
    }

    // Ekstraksi kode
    let generatedCode = '';
    let explanation = `${style} design dengan Tailwind CSS`;

    // Extract code block
    const codeBlockRegex = /```(?:html|jsx|vue|svelte|xml)?\s*\n([\s\S]*?)```/;
    const match = rawOutput.match(codeBlockRegex);

    if (match && match[1]) {
      generatedCode = match[1].trim();
    } else {
      // Fallback: cari HTML content
      const htmlMatch = rawOutput.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
      if (htmlMatch) {
        generatedCode = htmlMatch[0].trim();
      } else {
        // Last resort: gunakan semua output
        generatedCode = rawOutput.trim();
      }
    }

    // Clean up
    generatedCode = generatedCode
      .replace(/^```[\w\s]*\n?/g, '')
      .replace(/\n?```$/g, '')
      .trim();

    // Basic validation
    if (generatedCode.length < 50) {
      throw new Error('Generated code terlalu pendek');
    }

    return Response.json({
      success: true,
      original_url: url,
      style,
      framework,
      code: generatedCode,
      explanation: explanation,
      metadata: {
        code_length: generatedCode.length,
        model_used: MODEL,
        generated_at: new Date().toISOString()
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Redesign error:', error);
    
    // Fallback: Berikan template sederhana jika AI gagal
    if (error.message.includes('timeout') || error.message.includes('AI')) {
      const fallbackCode = generateFallbackTemplate(style, url);
      
      return Response.json({
        success: true,
        original_url: url,
        style,
        framework,
        code: fallbackCode,
        explanation: `Template ${style} (AI timeout, menggunakan fallback template)`,
        is_fallback: true,
        metadata: {
          code_length: fallbackCode.length,
          generated_at: new Date().toISOString()
        }
      }, { headers: corsHeaders });
    }
    
    return Response.json(
      { 
        error: `Gagal redesign: ${error.message}`,
        details: {
          url,
          style,
          framework,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// BONUS: Fallback template generator jika AI timeout
function generateFallbackTemplate(style, url) {
  const styles = {
    modern: {
      gradient: 'from-purple-600 via-pink-600 to-red-600',
      card: 'backdrop-blur-lg bg-white/10 border border-white/20',
      text: 'text-white'
    },
    minimalist: {
      gradient: 'from-gray-50 to-gray-100',
      card: 'bg-white border border-gray-200',
      text: 'text-gray-900'
    },
    glassmorphism: {
      gradient: 'from-blue-400 via-purple-400 to-pink-400',
      card: 'backdrop-blur-md bg-white/20 border border-white/30 shadow-xl',
      text: 'text-white'
    },
    cyberpunk: {
      gradient: 'from-cyan-500 via-purple-500 to-pink-500',
      card: 'bg-black/80 border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]',
      text: 'text-cyan-400'
    },
    corporate: {
      gradient: 'from-blue-600 to-blue-800',
      card: 'bg-white border border-gray-300 shadow-md',
      text: 'text-gray-900'
    },
    neumorphism: {
      gradient: 'from-gray-200 to-gray-300',
      card: 'bg-gray-200 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]',
      text: 'text-gray-800'
    }
  };

  const theme = styles[style] || styles.modern;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${style.charAt(0).toUpperCase() + style.slice(1)} Redesign</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br ${theme.gradient}">
    <div class="container mx-auto px-4 py-16">
        <!-- Header -->
        <header class="${theme.card} rounded-2xl p-8 mb-8">
            <h1 class="${theme.text} text-4xl md:text-6xl font-bold mb-4">Welcome</h1>
            <p class="${theme.text} text-lg opacity-90">Beautiful ${style} design</p>
        </header>

        <!-- Main Content -->
        <main class="grid md:grid-cols-2 gap-8">
            <div class="${theme.card} rounded-2xl p-8">
                <h2 class="${theme.text} text-2xl font-bold mb-4">About</h2>
                <p class="${theme.text} opacity-80">
                    This is a ${style} redesign template. Customize this content based on your needs.
                </p>
            </div>

            <div class="${theme.card} rounded-2xl p-8">
                <h2 class="${theme.text} text-2xl font-bold mb-4">Features</h2>
                <ul class="${theme.text} opacity-80 space-y-2">
                    <li>✨ Modern Design</li>
                    <li>📱 Fully Responsive</li>
                    <li>🎨 Tailwind CSS</li>
                    <li>⚡ Fast Loading</li>
                </ul>
            </div>
        </main>

        <!-- Footer -->
        <footer class="${theme.card} rounded-2xl p-6 mt-8 text-center">
            <p class="${theme.text} opacity-70 text-sm">
                Original: <a href="${url}" class="underline hover:opacity-100">${url}</a>
            </p>
        </footer>
    </div>
</body>
</html>`;
}
