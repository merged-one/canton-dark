import type { VenueStatus } from "@canton-dark/query-models";

export type Tone = "accent" | "alert" | "muted" | "ok" | "warn";

export type CardOptions = {
  body: string;
  subtitle?: string;
  testId?: string;
  title: string;
};

export type KeyValueItem = {
  key: string;
  value: string;
};

export type MetricItem = {
  label: string;
  value: string;
};

export type TableColumn = {
  key: string;
  label: string;
  numeric?: boolean;
};

export type TableRow = {
  cells: Record<string, string>;
  id: string;
};

export const appChromeStyles = `
  :root {
    color-scheme: dark;
    --bg-0: #071118;
    --bg-1: #0c1a22;
    --bg-2: #112430;
    --panel: rgba(10, 24, 31, 0.88);
    --panel-border: rgba(215, 179, 101, 0.22);
    --panel-soft: rgba(255, 244, 222, 0.08);
    --ink: #f6f1e5;
    --ink-soft: #d9d2c5;
    --ink-dim: #9e9a91;
    --accent: #d7b365;
    --accent-soft: rgba(215, 179, 101, 0.18);
    --ok: #75c2a9;
    --warn: #e4b96d;
    --alert: #d97968;
    --grid-gap: 18px;
    --shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
    font-family: Georgia, "Times New Roman", serif;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at top right, rgba(215, 179, 101, 0.12), transparent 38%),
      radial-gradient(circle at bottom left, rgba(117, 194, 169, 0.12), transparent 34%),
      linear-gradient(180deg, var(--bg-1), var(--bg-0));
    color: var(--ink);
  }

  a {
    color: var(--accent);
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
  }

  .app-shell {
    width: min(1320px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 28px 0 40px;
  }

  .hero {
    border: 1px solid var(--panel-border);
    border-radius: 24px;
    padding: 24px;
    background:
      linear-gradient(135deg, rgba(17, 36, 48, 0.94), rgba(8, 18, 24, 0.92)),
      var(--panel);
    box-shadow: var(--shadow);
    margin-bottom: 22px;
  }

  .hero h1,
  .card h2,
  .card h3 {
    margin: 0 0 8px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .hero p,
  .card p,
  .muted {
    color: var(--ink-soft);
  }

  .session-line {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid transparent;
    font-size: 0.92rem;
    white-space: nowrap;
  }

  .pill::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: currentColor;
  }

  .tone-accent {
    color: var(--accent);
    background: var(--accent-soft);
    border-color: rgba(215, 179, 101, 0.32);
  }

  .tone-alert {
    color: #ffd2cb;
    background: rgba(217, 121, 104, 0.18);
    border-color: rgba(217, 121, 104, 0.32);
  }

  .tone-ok {
    color: #dcfff3;
    background: rgba(117, 194, 169, 0.18);
    border-color: rgba(117, 194, 169, 0.32);
  }

  .tone-muted {
    color: var(--ink-soft);
    background: rgba(255, 244, 222, 0.08);
    border-color: rgba(255, 244, 222, 0.14);
  }

  .tone-warn {
    color: #fff3d0;
    background: rgba(228, 185, 109, 0.16);
    border-color: rgba(228, 185, 109, 0.3);
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--grid-gap);
    align-items: start;
  }

  .card,
  .wide-card {
    border: 1px solid var(--panel-border);
    border-radius: 20px;
    padding: 18px;
    background: var(--panel);
    box-shadow: var(--shadow);
    animation: rise-in 180ms ease;
  }

  .wide-card {
    margin-top: var(--grid-gap);
  }

  .card-subtitle {
    margin: -2px 0 14px;
    color: var(--ink-dim);
    font-size: 0.96rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .field {
    display: grid;
    gap: 6px;
    font-size: 0.95rem;
  }

  .field label {
    color: var(--ink-soft);
  }

  .field input,
  .field select,
  .field textarea {
    width: 100%;
    border: 1px solid rgba(255, 244, 222, 0.14);
    border-radius: 12px;
    padding: 12px 13px;
    background: rgba(4, 11, 15, 0.82);
    color: var(--ink);
  }

  .field textarea {
    min-height: 90px;
    resize: vertical;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 0 15px;
    border-radius: 999px;
    border: 1px solid rgba(255, 244, 222, 0.14);
    background: rgba(255, 244, 222, 0.08);
    color: var(--ink);
    cursor: pointer;
    text-decoration: none;
  }

  .button-primary {
    background: linear-gradient(135deg, rgba(215, 179, 101, 0.24), rgba(117, 194, 169, 0.14));
    border-color: rgba(215, 179, 101, 0.36);
  }

  .button-danger {
    background: rgba(217, 121, 104, 0.14);
    border-color: rgba(217, 121, 104, 0.32);
  }

  .button:disabled {
    opacity: 0.58;
    cursor: default;
  }

  .notice {
    margin-top: 14px;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid transparent;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
    margin-top: 14px;
  }

  .metric {
    padding: 14px;
    border-radius: 16px;
    border: 1px solid rgba(255, 244, 222, 0.12);
    background: var(--panel-soft);
  }

  .metric-value {
    display: block;
    font-size: 1.3rem;
    font-weight: 700;
    margin-top: 6px;
  }

  .kv-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
  }

  .kv-item {
    padding: 12px;
    border-radius: 14px;
    background: var(--panel-soft);
    border: 1px solid rgba(255, 244, 222, 0.1);
  }

  .kv-key {
    display: block;
    color: var(--ink-dim);
    font-size: 0.83rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .kv-value {
    display: block;
    margin-top: 6px;
    font-size: 1rem;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.94rem;
  }

  caption {
    text-align: left;
    margin-bottom: 10px;
    color: var(--ink-soft);
  }

  th,
  td {
    padding: 12px 10px;
    border-bottom: 1px solid rgba(255, 244, 222, 0.1);
    text-align: left;
    vertical-align: top;
  }

  th {
    color: var(--ink-dim);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .numeric {
    text-align: right;
  }

  .code,
  code {
    font-family: "SFMono-Regular", "Menlo", "Consolas", monospace;
    font-size: 0.9em;
  }

  .empty {
    margin: 0;
    color: var(--ink-dim);
  }

  .launch-list {
    display: grid;
    gap: 8px;
    margin: 14px 0 0;
    padding: 0;
    list-style: none;
  }

  .launch-list a {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
  }

  @media (max-width: 720px) {
    .app-shell {
      width: min(100vw - 24px, 1320px);
      padding-top: 18px;
    }

    .hero,
    .card,
    .wide-card {
      padding: 16px;
      border-radius: 18px;
    }
  }

  @keyframes rise-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const joinList = (values: readonly string[]): string =>
  values.length === 0 ? "none" : values.join(", ");

export const statusToneClass = (status: VenueStatus): "tone-alert" | "tone-ok" | "tone-warn" => {
  switch (status) {
    case "healthy":
      return "tone-ok";
    case "paused":
      return "tone-warn";
    case "rejected":
      return "tone-alert";
  }
};

export const toneClass = (tone: Tone): string => `tone-${tone}`;

export const renderPill = (label: string, tone: Tone, testId?: string): string =>
  `<span class="pill ${toneClass(tone)}"${testId === undefined ? "" : ` data-testid="${escapeHtml(testId)}"`}>${escapeHtml(label)}</span>`;

export const renderNotice = (message: string, tone: Tone, testId?: string): string =>
  `<div class="notice ${toneClass(tone)}"${testId === undefined ? "" : ` data-testid="${escapeHtml(testId)}"`}>${escapeHtml(message)}</div>`;

export const renderCard = ({ body, subtitle, testId, title }: CardOptions): string => `
  <section class="card"${testId === undefined ? "" : ` data-testid="${escapeHtml(testId)}"`}>
    <h2>${escapeHtml(title)}</h2>
    ${subtitle === undefined ? "" : `<p class="card-subtitle">${escapeHtml(subtitle)}</p>`}
    ${body}
  </section>
`;

export const renderWideCard = ({ body, subtitle, testId, title }: CardOptions): string => `
  <section class="wide-card"${testId === undefined ? "" : ` data-testid="${escapeHtml(testId)}"`}>
    <h2>${escapeHtml(title)}</h2>
    ${subtitle === undefined ? "" : `<p class="card-subtitle">${escapeHtml(subtitle)}</p>`}
    ${body}
  </section>
`;

export const renderMetricGrid = (items: readonly MetricItem[]): string =>
  items.length === 0
    ? ""
    : `<div class="metric-grid">${items
        .map(
          (item) => `<article class="metric">
            <span class="muted">${escapeHtml(item.label)}</span>
            <strong class="metric-value">${escapeHtml(item.value)}</strong>
          </article>`
        )
        .join("")}</div>`;

export const renderKeyValueGrid = (items: readonly KeyValueItem[]): string =>
  `<div class="kv-grid">${items
    .map(
      (item) => `<article class="kv-item">
        <span class="kv-key">${escapeHtml(item.key)}</span>
        <span class="kv-value">${escapeHtml(item.value)}</span>
      </article>`
    )
    .join("")}</div>`;

export const renderTable = (input: {
  caption?: string;
  columns: readonly TableColumn[];
  emptyMessage: string;
  rows: readonly TableRow[];
  testId?: string;
}): string =>
  input.rows.length === 0
    ? `<p class="empty"${input.testId === undefined ? "" : ` data-testid="${escapeHtml(input.testId)}"`}>${escapeHtml(input.emptyMessage)}</p>`
    : `<div class="table-wrap"${input.testId === undefined ? "" : ` data-testid="${escapeHtml(input.testId)}"`}>
        <table>
          ${input.caption === undefined ? "" : `<caption>${escapeHtml(input.caption)}</caption>`}
          <thead>
            <tr>${input.columns
              .map(
                (column) =>
                  `<th class="${column.numeric === true ? "numeric" : ""}">${escapeHtml(column.label)}</th>`
              )
              .join("")}</tr>
          </thead>
          <tbody>
            ${input.rows
              .map(
                (row) => `<tr data-row-id="${escapeHtml(row.id)}">
                  ${input.columns
                    .map((column) => {
                      const cell = row.cells[column.key] ?? "";

                      return `<td class="${column.numeric === true ? "numeric" : ""}">${cell}</td>`;
                    })
                    .join("")}
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;

export const renderAppShell = (input: {
  content: string;
  sessionBadges: readonly string[];
  strapline: string;
  title: string;
}): string => `
  <style>${appChromeStyles}</style>
  <main class="app-shell">
    <header class="hero">
      <h1>${escapeHtml(input.title)}</h1>
      <p>${escapeHtml(input.strapline)}</p>
      <div class="session-line">${input.sessionBadges.join("")}</div>
    </header>
    ${input.content}
  </main>
`;
