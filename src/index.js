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
Selalu tambahkan comment untuk menjelaskan logika kompleks.
Ikuti best practices dan modern coding standards.`;

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

// Handler untuk redesign website
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
      }
    });

    if (!scrapeResponse.ok) {
      throw new Error(`Failed to scrape: ${scrapeResponse.statusText}`);
    }

    const websiteContent = await scrapeResponse.text();

    // Style guidelines
    const styleGuides = {
      modern: 'desain modern dengan gradient, shadow, rounded corners, dan animasi smooth',
      minimalist: 'desain minimalis clean dengan whitespace banyak, typography fokus, warna netral',
      glassmorphism: 'desain glassmorphism dengan backdrop-blur, transparency, dan efek glass',
      neumorphism: 'desain neumorphic dengan soft shadows dan 3D effect subtle',
      cyberpunk: 'desain cyberpunk dengan neon colors, glitch effects, dan futuristic vibes',
      corporate: 'desain corporate professional dengan warna solid dan layout terstruktur'
    };

    // Framework templates
    const frameworkGuides = {
      html: 'Pure HTML dengan Tailwind CSS inline classes',
      react: 'React component dengan Tailwind CSS',
      vue: 'Vue 3 component dengan Tailwind CSS',
      svelte: 'Svelte component dengan Tailwind CSS'
    };

    const systemPrompt = `Kamu adalah expert UI/UX designer dan frontend developer.

TUGAS:
Redesign website berikut dengan style ${style} menggunakan ${framework}.

STYLE GUIDE:
${styleGuides[style] || styleGuides.modern}

FRAMEWORK:
${frameworkGuides[framework] || frameworkGuides.html}

REQUIREMENTS:
1. Gunakan HANYA Tailwind CSS utility classes (no custom CSS)
2. Buat design yang responsive (mobile-first)
3. Implementasi dark mode support
4. Gunakan color palette yang cohesive
5. Tambahkan micro-interactions dan hover effects
6. Optimasi untuk performance dan accessibility
${includeJS ? '7. Tambahkan JavaScript untuk interactivity\n' : '7. No JavaScript, pure CSS animations\n'}
8. Buat code yang production-ready dan clean

KONTEN WEBSITE ORIGINAL:
${websiteContent.slice(0, 4000)}

OUTPUT FORMAT:
Berikan full working code yang bisa langsung dipakai. Jangan pakai placeholder atau comment "add more here".`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Redesign website ini dengan style ${style}. Buat semenarik dan secanggih mungkin!` 
      }
    ];

    const aiResponse = await env.AI.run('@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', {
      messages,
      temperature: 0.8, // Higher creativity untuk design
      max_tokens: 4096
    });

    return Response.json({
      success: true,
      original_url: url,
      style,
      framework,
      code: aiResponse.response,
      preview_note: 'Copy code ke file .html atau component file dan jalankan',
      scraped_content_length: websiteContent.length
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json(
      { error: `Gagal redesign website: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
}
