import express from 'express';

const router = express.Router();

const sections = [
  {
    key: 'health',
    title: 'System Health',
    endpoint: '/health',
    fields: ['status', 'service', 'mode', 'version']
  },
  {
    key: 'whatsapp',
    title: 'WhatsApp Status',
    endpoint: '/whatsapp/status',
    fields: ['status', 'apiVersion', 'phoneNumberId', 'accessToken']
  },
  {
    key: 'analytics',
    title: 'Analytics Snapshot',
    endpoint: '/api/analytics/stats',
    fields: []
  }
];

router.get('/', (req, res) => {
  const sectionCards = sections
    .map(
      section => `
        <section class="card" data-section="${section.key}">
          <header>
            <div>
              <p class="label">${section.title}</p>
              <p class="status" aria-live="polite">Loading…</p>
            </div>
            <span class="endpoint">${section.endpoint}</span>
          </header>
          <div class="details">
            <ul class="fields"></ul>
            <pre class="payload" aria-live="polite"></pre>
          </div>
        </section>`
    )
    .join('');

  res.type('html').send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Befitting Funeral Service – Monitoring</title>
        <style>
          :root {
            font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #0f172a;
            color: #e2e8f0;
          }
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          header {
            padding: 1rem 1.25rem;
            background: #111827;
            border-bottom: 1px solid #1f2937;
          }
          header h1 {
            margin: 0;
            font-size: 1.25rem;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1rem;
            padding: 1.25rem;
          }
          .card {
            background: #1f2937;
            border: 1px solid #374151;
            border-radius: 0.75rem;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .card header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.5rem;
          }
          .label {
            margin: 0;
            font-size: 1rem;
            font-weight: 600;
          }
          .status {
            margin: 0;
            font-size: 0.9rem;
            color: #a5b4fc;
          }
          .endpoint {
            font-size: 0.75rem;
            color: #94a3b8;
            font-family: "JetBrains Mono", Consolas, monospace;
          }
          .details {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          .fields {
            list-style: none;
            margin: 0;
            padding: 0;
            display: grid;
            gap: 0.25rem;
          }
          .fields li {
            font-size: 0.85rem;
            display: flex;
            justify-content: space-between;
            gap: 0.5rem;
          }
          .fields span:last-child {
            color: #fbbf24;
          }
          .payload {
            margin: 0;
            background: #111827;
            border: 1px solid #374151;
            border-radius: 0.5rem;
            padding: 0.75rem;
            font-size: 0.75rem;
            white-space: pre-wrap;
            max-height: 160px;
            overflow: auto;
            color: #d1d5db;
          }
          footer {
            margin-top: auto;
            padding: 1rem 1.25rem;
            text-align: center;
            font-size: 0.8rem;
            background: #0f172a;
            border-top: 1px solid #1f2937;
          }
          .badge {
            padding: 0.2rem 0.5rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
          }
          .badge.online {
            background: #10b981;
            color: #ffffff;
          }
          .badge.offline {
            background: #f87171;
            color: #0f172a;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>Befitting Funeral Service · Monitoring</h1>
        </header>
        <div class="grid">
          ${sectionCards}
        </div>
        <footer>
          <span>Last refresh: <span id="last-refresh">—</span></span>
        </footer>
        <script>
          const sections = ${JSON.stringify(sections)};
          const origin = window.location.origin;

          async function updateSection(section) {
            const card = document.querySelector(\`[data-section="\${section.key}"]\`);
            const statusEl = card.querySelector('.status');
            const fieldsEl = card.querySelector('.fields');
            const payloadEl = card.querySelector('.payload');

            try {
              const response = await fetch(origin + section.endpoint, {
                headers: { 'Accept': 'application/json' }
              });
              if (!response.ok) throw new Error(response.statusText);
              const data = await response.json();

              statusEl.textContent = 'Connected';
              statusEl.classList.remove('offline');
              statusEl.classList.add('online');

              if (section.fields.length > 0) {
                fieldsEl.innerHTML = section.fields
                  .map(field => {
                    const value = data[field] ?? 'n/a';
                    return '<li><strong>' + field + '</strong><span>' + value + '</span></li>';
                  })
                  .join('');
              } else {
                fieldsEl.innerHTML = '<li>No key metrics defined</li>';
              }

              payloadEl.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
              statusEl.textContent = 'Offline';
              statusEl.classList.remove('online');
              statusEl.classList.add('offline');
              fieldsEl.innerHTML = '<li>Unable to reach endpoint</li>';
              payloadEl.textContent = error.message;
            }
          }

          async function refreshAll() {
            await Promise.all(sections.map(updateSection));
            document.getElementById('last-refresh').textContent = new Date().toLocaleTimeString();
          }

          refreshAll();
          setInterval(refreshAll, 15000);
        </script>
      </body>
    </html>
  `);
});

export default router;





