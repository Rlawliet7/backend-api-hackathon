import env from '../config/env.js';

const basePath = env.API_BASE_PATH;

export function getFirstpage(){
    return `
    <!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Backend API Hackathon</title>
        <style>
          :root {
            --primary: #0ea5e9;
            --primary-dark: #0284c7;
            --accent: #a78bfa;
            --accent-dark: #8b5cf6;
            --bg: #0f172a;
            --card-bg: #1e293b;
            --border: #334155;
            --text: #e2e8f0;
            --text-muted: #94a3b8;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            color: var(--text);
            background: radial-gradient(1200px 600px ellipse at 50% -10%, #1e3a8a33 0%, var(--bg) 60%);
          }
          .hero {
            width: min(92vw, 640px);
            padding: 40px 44px 48px;
            border-radius: 20px;
            background: linear-gradient(135deg, var(--card-bg) 0%, #283548 100%);
            border: 1px solid var(--border);
            box-shadow: 0 20px 60px rgba(15, 23, 42, 0.5), inset 0 1px 0 rgba(255,255,255,0.06);
            backdrop-filter: blur(12px);
          }
          .hero-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
          }
          .icon {
            width: 48px;
            height: 48px;
            flex-shrink: 0;
            display: grid;
            place-items: center;
            font-size: 26px;
            border-radius: 14px;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            box-shadow: 0 8px 20px rgba(14, 165, 233, 0.4);
            animation: pulse 3s infinite ease-in-out;
          }
          @keyframes pulse {
            0%, 100% { box-shadow: 0 8px 20px rgba(14,165,233,0.4); }
            50% { box-shadow: 0 12px 28px rgba(167,139,250,0.5); }
          }
          h1 {
            font-size: clamp(24px, 3vw, 28px);
            font-weight: 700;
            color: #f8fafc;
          }
          .subtitle {
            color: var(--text-muted);
            font-size: 15px;
            margin-bottom: 28px;
            line-height: 1.6;
          }
          .endpoints {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 28px;
          }
          .endpoint {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            border-radius: 10px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--border);
            transition: all 0.2s ease;
          }
          .endpoint:hover {
            border-color: var(--primary);
            background: rgba(14, 165, 233, 0.08);
            transform: translateX(4px);
          }
          .method {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 3px 8px;
            border-radius: 6px;
            flex-shrink: 0;
          }
          .m-get { background: rgba(74, 222, 128, 0.18); color: #4ade80; border: 1px solid #4ade80; }
          .m-post { background: rgba(253, 187, 27, 0.18); color: #fbbf24; border: 1px solid #fbbf24; }
          .m-put { background: rgba(96, 181, 255, 0.18); color: #60a5ff; border: 1px solid #60a5ff; }
          .m-delete { background: rgba(252, 96, 108, 0.18); color: #fc606c; border: 1px solid #fc606c; }
          .endpoint code {
            font-family: 'JetBrains Mono', ui-monospace, monospace;
            font-size: 13px;
            color: #cbd5e1;
          }
          .tags {
            display: flex;
            gap: 8px;
            margin-top: 8px;
          }
          .tag {
            font-size: 12px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(255,255,255,0.05);
            color: var(--text-muted);
            border: 1px solid rgba(255,255,255,0.08);
          }
          .footer {
            text-align: center;
            font-size: 13px;
            color: var(--text-muted);
            padding-top: 16px;
            border-top: 1px solid rgba(255,255,255,0.08);
          }
          .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #4ade80;
            margin-right: 6px;
            animation: blink 2s infinite;
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        </style>
      </head>
      <body>
        <main class="hero">
          <div class="hero-header">
            <div class="icon" aria-label="logo">🚀</div>
            <h1>Backend API Hackathon</h1>
          </div>
          <p class="subtitle">
            <span class="status-dot"></span>
            Server Express <strong style="color:var(--primary);">berjalan dengan baik</strong>.
            API ready to serve.
          </p>
          <div class="endpoints">
            <div class="endpoint">
              <span class="method m-get">GET</span>
              <code>/health</code>
            </div>
            <div class="endpoint">
              <span class="method m-get">GET</span>
              <code>/check-db</code>
            </div>
          </div>
          <div class="tags">
            <span class="tag">API Base Path: <code style="color:var(--accent); font-weight:600;">${basePath}</code></span>
            <span class="tag">Express + Mongoose</span>
            <span class="tag">RESTful</span>
          </div>
          <div class="footer">
            Built with <span style="color:#f87171;">♥</span> for the Hackathon
          </div>
        </main>
      </body>
    </html>
  `
}