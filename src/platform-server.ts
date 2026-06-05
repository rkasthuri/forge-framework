/**
 * platform-server.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 3.8 – No-Code Authoring UI (Capstone)
 * RYQ AI-Augmented E2E Testing Framework
 *
 * Architecture: Static HTML + REST API (no template literal injection)
 * All dynamic data loaded via fetch() calls to clean JSON endpoints.
 *
 * Run:  npx tsx src/platform-server.ts
 *       Opens at http://localhost:4280
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as http   from 'http';
import * as fs     from 'fs';
import * as dotenv from 'dotenv';
import { execSync, spawn } from 'child_process';
dotenv.config();

const PORT    = 4280;
const API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

// ── Data loaders ──────────────────────────────────────────────────────────────

function load<T>(filePath: string, fallback: T): T {
  try {
    return fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      : fallback;
  } catch { return fallback; }
}

// ── Static HTML (no dynamic injection) ───────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>RYQ Quality Platform</title>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --bg:#080b11; --surface:#0d1117; --card:#111823; --border:#1c2333;
      --text:#cdd5e0; --muted:#4a5568; --accent:#38bdf8; --accent2:#818cf8;
      --green:#22c55e; --amber:#f59e0b; --red:#ef4444; --radius:10px;
    }
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Space Grotesk',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column;}

    /* Topbar */
    .topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 2rem;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;z-index:100;}
    .logo{display:flex;align-items:center;gap:10px;}
    .logo-mark{width:28px;height:28px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#000;font-family:'JetBrains Mono',monospace;}
    .logo-text{font-size:15px;font-weight:600;}
    .logo-text span{color:var(--accent);}
    .topbar-right{display:flex;align-items:center;gap:1rem;}
    .health-pill{display:flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--border);border-radius:100px;padding:4px 12px;font-size:12px;font-family:'JetBrains Mono',monospace;}
    .health-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s infinite;}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
    #topbar-stats{font-family:monospace;font-size:11px;color:var(--muted);}

    /* Tab Nav */
    .tabnav{background:var(--surface);border-bottom:1px solid var(--border);padding:0 2rem;display:flex;align-items:center;}
    .tab{padding:12px 20px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;transition:all 0.15s;display:flex;align-items:center;gap:7px;white-space:nowrap;user-select:none;}
    .tab:hover{color:var(--text);}
    .tab.active{color:var(--accent);border-bottom-color:var(--accent);}
    .refresh-btn{margin-left:auto;background:var(--card);border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:5px 14px;font-size:12px;cursor:pointer;font-family:'Space Grotesk',sans-serif;transition:all 0.15s;}
    .refresh-btn:hover{border-color:var(--accent);color:var(--accent);}

    /* Layout */
    .main{flex:1;padding:2rem;max-width:1400px;width:100%;margin:0 auto;}
    .panel{display:none;}
    .panel.active{display:block;}

    /* Cards */
    .card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;margin-bottom:1rem;}
    .card-title{font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:var(--muted);margin-bottom:1rem;font-weight:600;}

    /* KPI */
    .kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;}
    .kpi{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem 1.5rem;}
    .kpi-label{font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--muted);margin-bottom:0.4rem;}
    .kpi-value{font-size:2rem;font-weight:700;font-family:'JetBrains Mono',monospace;line-height:1;}
    .kpi-sub{font-size:11px;color:var(--muted);margin-top:0.3rem;}

    /* Grid */
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;}
    .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;}

    /* Table */
    table{width:100%;border-collapse:collapse;font-size:13px;}
    th{text-align:left;padding:8px 12px;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:500;border-bottom:1px solid var(--border);}
    td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:middle;}
    tr:last-child td{border-bottom:none;}
    tr.clickable{cursor:pointer;}
    tr.clickable:hover td{background:rgba(56,189,248,0.04);}

    /* Buttons */
    .btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:7px;font-size:13px;font-weight:600;font-family:'Space Grotesk',sans-serif;cursor:pointer;border:none;transition:all 0.15s;}
    .btn-primary{background:var(--accent);color:#000;}
    .btn-primary:hover{background:#7dd3fc;}
    .btn-primary:disabled{background:var(--muted);cursor:not-allowed;}
    .btn-secondary{background:var(--card);color:var(--text);border:1px solid var(--border);}
    .btn-secondary:hover{border-color:var(--accent);color:var(--accent);}

    /* Forms */
    .form-group{margin-bottom:1.2rem;}
    .form-label{font-size:12px;font-weight:600;color:var(--text);margin-bottom:6px;display:block;}
    .form-input,.form-select,.form-textarea{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:10px 14px;color:var(--text);font-size:13px;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color 0.15s;}
    .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--accent);}
    .form-textarea{min-height:120px;resize:vertical;}
    .form-select option{background:var(--card);}

    /* Terminal */
    .terminal{background:#020408;border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.7;color:#a5f3fc;min-height:200px;max-height:400px;overflow-y:auto;white-space:pre-wrap;word-break:break-word;}
    .terminal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:0.8rem;}
    .terminal-dots{display:flex;gap:6px;}
    .terminal-dot{width:10px;height:10px;border-radius:50%;}

    /* Progress */
    .progress-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-top:0.5rem;}
    .progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:2px;transition:width 0.3s;width:0%;}

    /* Suite cards */
    .suite-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem;margin-bottom:1.5rem;}
    .suite-card{background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius);padding:1rem;cursor:pointer;transition:all 0.15s;text-align:center;user-select:none;}
    .suite-card:hover{border-color:var(--accent);}
    .suite-card.selected{border-color:var(--accent);background:rgba(56,189,248,0.06);}
    .suite-card-icon{font-size:24px;margin-bottom:6px;}
    .suite-card-name{font-size:13px;font-weight:600;}
    .suite-card-desc{font-size:11px;color:var(--muted);margin-top:3px;}

    /* Code preview */
    .code-preview{background:#020408;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}
    .code-preview-header{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:var(--card);border-bottom:1px solid var(--border);}
    .code-preview pre{padding:1rem 1.2rem;overflow-x:auto;max-height:350px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6;color:#a5f3fc;}

    /* Badges */
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;}
    .prio{padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;}
    .prio-p0{background:rgba(239,68,68,0.15);color:#ef4444;}
    .prio-p1{background:rgba(245,158,11,0.15);color:#f59e0b;}
    .prio-p2{background:rgba(59,130,246,0.15);color:#3b82f6;}

    /* Section header */
    .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;}
    .section-title{font-size:15px;font-weight:600;}

    /* Notes body */
    .notes-body{font-size:13px;line-height:1.7;}
    .notes-body h3{color:#38bdf8;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;margin:1.5rem 0 0.5rem;}
    .notes-body h4{color:#94a3b8;font-size:13px;margin:1rem 0 0.4rem;}

    /* Empty */
    .empty{text-align:center;padding:3rem 2rem;color:var(--muted);}
    .empty-icon{font-size:2.5rem;margin-bottom:0.8rem;}
    .empty-title{font-size:15px;font-weight:600;color:var(--text);margin-bottom:0.4rem;}

    /* Modal */
    .modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;align-items:center;justify-content:center;}
    .modal.open{display:flex;}
    .modal-inner{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:2rem;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;}

    /* Scrollbar */
    ::-webkit-scrollbar{width:6px;height:6px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}

    @media(max-width:900px){
      .kpi-strip,.suite-grid{grid-template-columns:repeat(2,1fr);}
      .grid-2,.grid-3{grid-template-columns:1fr;}
    }
  </style>
</head>
<body>

<!-- Topbar -->
<div class="topbar">
  <div class="logo">
    <div class="logo-mark">R</div>
    <div class="logo-text">RYQ <span>Quality Platform</span></div>
  </div>
  <div class="topbar-right">
    <div class="health-pill">
      <div class="health-dot"></div>
      <span id="health-label">Health —/100</span>
    </div>
    <div id="topbar-stats">Loading...</div>
  </div>
</div>

<!-- Tab Nav -->
<div class="tabnav">
  <div class="tab active" id="tab-run" onclick="switchTab('run')">&#9654; Run Tests</div>
  <div class="tab" id="tab-generate" onclick="switchTab('generate')">&#10022; Generate Test</div>
  <div class="tab" id="tab-dashboard" onclick="switchTab('dashboard')">&#9672; Dashboard</div>
  <div class="tab" id="tab-coverage" onclick="switchTab('coverage')">&#9678; Coverage Gaps</div>
  <div class="tab" id="tab-notes" onclick="switchTab('notes')">&#9673; Release Notes</div>
  <button class="refresh-btn" onclick="softRefresh(this)">&#8635; Refresh</button>
</div>

<!-- Main -->
<div class="main">

  <!-- TAB 1: RUN TESTS -->
  <div class="panel active" id="panel-run">
    <div class="section-header">
      <div class="section-title">Run Tests</div>
      <div style="font-size:12px;color:var(--muted)">Select a suite and execute against SauceDemo</div>
    </div>
    <div class="suite-grid">
      <div class="suite-card selected" id="suite-stable" onclick="selectSuite('stable')">
        <div class="suite-card-icon">&#9889;</div>
        <div class="suite-card-name">Stable Suite</div>
        <div class="suite-card-desc">Excludes @slow @flaky</div>
      </div>
      <div class="suite-card" id="suite-full" onclick="selectSuite('full')">
        <div class="suite-card-icon">&#127758;</div>
        <div class="suite-card-name">Full Suite</div>
        <div class="suite-card-desc">All tests including flaky</div>
      </div>
      <div class="suite-card" id="suite-smoke" onclick="selectSuite('smoke')">
        <div class="suite-card-icon">&#128168;</div>
        <div class="suite-card-name">Smoke Suite</div>
        <div class="suite-card-desc">Login + E2E journey only</div>
      </div>
      <div class="suite-card" id="suite-api" onclick="selectSuite('api')">
        <div class="suite-card-icon">&#128268;</div>
        <div class="suite-card-name">API Suite</div>
        <div class="suite-card-desc">Restful Booker AB001-AB012</div>
      </div>
    </div>
    <div class="card" style="margin-bottom:1rem">
      <div class="card-title">Browser &amp; Options</div>
      <div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
          <input type="checkbox" id="opt-chromium" checked style="accent-color:var(--accent)"> Chromium
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
          <input type="checkbox" id="opt-webkit" style="accent-color:var(--accent)"> WebKit
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
          <input type="checkbox" id="opt-pipeline" style="accent-color:var(--accent)"> Full pipeline (triage + store + notes)
        </label>
      </div>
    </div>
    <div style="display:flex;gap:1rem;margin-bottom:1.5rem">
      <button class="btn btn-primary" id="run-btn" onclick="runTests()">&#9654; &nbsp;Run Suite</button>
      <button class="btn btn-secondary" onclick="clearTerminal()">Clear</button>
    </div>
    <div class="card">
      <div class="terminal-header">
        <div class="card-title" style="margin:0">Output</div>
        <div class="terminal-dots">
          <div class="terminal-dot" style="background:#ef4444"></div>
          <div class="terminal-dot" style="background:#f59e0b"></div>
          <div class="terminal-dot" style="background:#22c55e"></div>
        </div>
      </div>
      <div class="terminal" id="run-terminal">Waiting for test run...\n</div>
      <div class="progress-bar"><div class="progress-fill" id="run-progress-fill"></div></div>
    </div>
    <div class="card" id="last-run-card" style="margin-top:1rem;display:none">
      <div class="card-title" id="last-run-title">Last Run</div>
      <div style="display:flex;gap:2rem;flex-wrap:wrap" id="last-run-stats"></div>
    </div>
  </div>

  <!-- TAB 2: GENERATE TEST -->
  <div class="panel" id="panel-generate">
    <div class="section-header">
      <div class="section-title">Generate Test</div>
      <div style="font-size:12px;color:var(--muted)">Describe a scenario in plain English</div>
    </div>
    <div class="grid-2" style="align-items:start">
      <div>
        <div class="card" style="margin-bottom:1rem">
          <div class="card-title">Describe Your Test Scenario</div>
          <div class="form-group">
            <label class="form-label">What should this test verify?</label>
            <textarea class="form-textarea" id="gen-prompt" placeholder="e.g. Test that a logged-out user cannot access the inventory page directly"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Functional Area</label>
            <select class="form-select" id="gen-area">
              <option value="Login">Login</option>
              <option value="Inventory">Inventory</option>
              <option value="Cart">Cart</option>
              <option value="Checkout">Checkout</option>
              <option value="API">API</option>
              <option value="Edge Cases">Edge Cases</option>
              <option value="E2E Journey">E2E Journey</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select class="form-select" id="gen-priority">
              <option value="P0">P0 — Critical</option>
              <option value="P1" selected>P1 — High</option>
              <option value="P2">P2 — Medium</option>
            </select>
          </div>
          <button class="btn btn-primary" id="gen-btn" onclick="generateTest()" style="width:100%">&#10022; &nbsp;Generate Test</button>
        </div>
        <div class="card" id="gap-shortcuts" style="display:none">
          <div class="card-title">Generate from Coverage Gap</div>
          <div id="gap-list" style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto"></div>
        </div>
      </div>
      <div>
        <div class="card-title" style="margin-bottom:0.5rem">Generated Code</div>
        <div class="code-preview">
          <div class="code-preview-header">
            <span style="font-family:monospace;font-size:12px;color:var(--muted)">generated-test.spec.ts</span>
            <button class="btn btn-secondary" style="padding:4px 10px;font-size:11px" onclick="copyGenerated()">Copy</button>
          </div>
          <pre id="gen-code" style="color:var(--muted);padding:2rem;text-align:center">Generated test will appear here...</pre>
        </div>
        <div id="gen-status" style="margin-top:0.8rem"></div>
      </div>
    </div>
  </div>

  <!-- TAB 3: DASHBOARD -->
  <div class="panel" id="panel-dashboard">
    <div class="section-header">
      <div class="section-title">Dashboard</div>
      <div style="font-size:11px;color:var(--muted)" id="dashboard-updated">—</div>
    </div>
    <div class="kpi-strip" id="dashboard-kpis">
      <div class="kpi"><div class="kpi-label">Health Score</div><div class="kpi-value" id="kpi-health">—</div><div class="kpi-sub">out of 100</div></div>
      <div class="kpi"><div class="kpi-label">Pass Rate</div><div class="kpi-value" id="kpi-passrate" style="color:var(--green)">—</div><div class="kpi-sub">latest run</div></div>
      <div class="kpi"><div class="kpi-label">Total Runs</div><div class="kpi-value" id="kpi-runs">—</div><div class="kpi-sub">in history</div></div>
      <div class="kpi"><div class="kpi-label">Trend</div><div class="kpi-value" id="kpi-trend" style="font-size:1.2rem">—</div><div class="kpi-sub">pass rate direction</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Pass Rate Trend</div>
        <div style="position:relative;height:200px"><canvas id="pass-chart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">Recent Runs</div>
        <table>
          <thead><tr><th>Run ID</th><th>Pass Rate</th><th>Total</th><th>Failed</th><th>Duration</th></tr></thead>
          <tbody id="runs-table-body"><tr><td colspan="5" style="text-align:center;color:var(--muted);padding:2rem">Loading...</td></tr></tbody>
        </table>
      </div>
    </div>
    <div class="card" id="flaky-card" style="display:none">
      <div class="card-title">Flaky Test Predictor — At-Risk Tests</div>
      <table>
        <thead><tr><th>Test</th><th>Browser</th><th>Score</th><th>Category</th></tr></thead>
        <tbody id="flaky-table-body"></tbody>
      </table>
    </div>
  </div>

  <!-- TAB 4: COVERAGE GAPS -->
  <div class="panel" id="panel-coverage">
    <div class="section-header">
      <div class="section-title">Coverage Gap Analysis</div>
      <div style="display:flex;gap:0.75rem">
        <button class="btn btn-secondary" id="coverage-btn" onclick="runCommand('coverage')">&#9678; &nbsp;Analyse Gaps</button>
        <button class="btn btn-primary" id="generate-gaps-btn" onclick="runCommand('generate-gaps')">&#10022; &nbsp;Generate Tests</button>
      </div>
    </div>
    <div class="grid-3" id="coverage-scores" style="display:none"></div>
    <div class="card" id="coverage-gaps-card">
      <div class="card-title">Priority Gaps</div>
      <div id="coverage-empty" class="empty">
        <div class="empty-icon">&#9678;</div>
        <div class="empty-title">No coverage data yet</div>
        <div>Click "Analyse Gaps" to scan your test suite</div>
      </div>
      <table id="coverage-gaps-table" style="display:none">
        <thead><tr><th>ID</th><th>Priority</th><th>Area</th><th>Missing Scenario</th></tr></thead>
        <tbody id="coverage-gaps-body"></tbody>
      </table>
    </div>
    <div class="card" style="margin-top:1rem">
      <div class="card-title">Command Output</div>
      <div class="terminal" id="coverage-terminal">Ready...</div>
    </div>
  </div>

  <!-- TAB 5: RELEASE NOTES -->
  <div class="panel" id="panel-notes">
    <div class="section-header">
      <div class="section-title">Release Notes</div>
      <div style="display:flex;gap:0.75rem">
        <button class="btn btn-secondary" id="notes-btn" onclick="runCommand('release-notes')">&#9673; &nbsp;Generate Notes</button>
        <button class="btn btn-secondary" onclick="runCommand('release-notes-sprint')">Sprint Summary</button>
      </div>
    </div>
    <div class="kpi-strip" id="notes-kpis" style="display:none">
      <div class="kpi"><div class="kpi-label">Health Score</div><div class="kpi-value" id="notes-health" style="color:var(--green)">—</div><div class="kpi-sub">out of 100</div></div>
      <div class="kpi"><div class="kpi-label">Trend</div><div class="kpi-value" id="notes-trend" style="font-size:1.2rem">—</div><div class="kpi-sub">direction</div></div>
      <div class="kpi"><div class="kpi-label">Runs Analysed</div><div class="kpi-value" id="notes-runs">—</div><div class="kpi-sub">in report</div></div>
      <div class="kpi"><div class="kpi-label">Generated</div><div class="kpi-value" id="notes-date" style="font-size:1rem">—</div><div class="kpi-sub" id="notes-time">—</div></div>
    </div>
    <div class="card">
      <div class="notes-body" id="notes-body">
        <div class="empty">
          <div class="empty-icon">&#9673;</div>
          <div class="empty-title">No release notes yet</div>
          <div>Click "Generate Notes" to create your first report</div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:1rem">
      <div class="card-title">Command Output</div>
      <div class="terminal" id="notes-terminal">Ready...</div>
    </div>
  </div>

</div><!-- /main -->

<!-- Modal -->
<div class="modal" id="run-modal">
  <div class="modal-inner">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <div style="font-weight:600">Run Details</div>
      <button onclick="closeModal()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px">&#x2715;</button>
    </div>
    <div id="run-modal-content"></div>
  </div>
</div>

<script>
/* RYQ Platform */

// ── State ──────────────────────────────────────────────
var selectedSuite = 'stable';
var chartInstance = null;
var dashboardData = null;

// ── Tab switching ──────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('panel-' + name).classList.add('active');
  if (name === 'dashboard') renderChart();
}

// ── Suite selection ────────────────────────────────────
function selectSuite(suite) {
  ['stable','full','smoke','api'].forEach(function(s) {
    document.getElementById('suite-' + s).classList.remove('selected');
  });
  document.getElementById('suite-' + suite).classList.add('selected');
  selectedSuite = suite;
}

// ── Load all data from APIs ────────────────────────────
function loadAllData() {
  loadDashboard();
  loadCoverage();
  loadNotes();
}

function loadDashboard() {
  fetch('/api/data').then(function(r) { return r.json(); }).then(function(d) {
    dashboardData = d;

    // Topbar
    document.getElementById('health-label').textContent = 'Health ' + d.healthScore + '/100';
    document.getElementById('topbar-stats').textContent = d.totalRuns + ' runs \u00b7 ' + d.passRate + ' pass rate';

    // Dashboard KPIs
    var hEl = document.getElementById('kpi-health');
    hEl.textContent = d.healthScore;
    hEl.style.color = d.healthScore >= 90 ? 'var(--green)' : d.healthScore >= 70 ? 'var(--amber)' : 'var(--red)';
    document.getElementById('kpi-passrate').textContent = d.passRate;
    document.getElementById('kpi-runs').textContent = d.totalRuns;
    var tEl = document.getElementById('kpi-trend');
    tEl.textContent = (d.trend === 'Improving' ? '\u2191 ' : d.trend === 'Degrading' ? '\u2193 ' : '\u2192 ') + d.trend;
    tEl.style.color = d.trend === 'Improving' ? 'var(--green)' : d.trend === 'Degrading' ? 'var(--red)' : 'var(--accent)';
    document.getElementById('dashboard-updated').textContent = 'Updated: ' + new Date().toLocaleTimeString();

    // Last run card
    if (d.lastRun) {
      var card = document.getElementById('last-run-card');
      card.style.display = 'block';
      document.getElementById('last-run-title').textContent = 'Last Run \u2014 ' + (d.lastRun.runId || '').slice(0,16);
      var stats = d.lastRun.stats || {};
      document.getElementById('last-run-stats').innerHTML =
        stat(stats.passRate, 'Pass Rate', 'var(--green)') +
        stat(stats.total, 'Total') +
        stat(stats.passed, 'Passed', 'var(--green)') +
        stat(stats.failed, 'Failed', stats.failed > 0 ? 'var(--red)' : 'var(--green)') +
        stat(Math.round((d.lastRun.durationMs || 0)/1000) + 's', 'Duration');
    }

    // Runs table
    var tbody = document.getElementById('runs-table-body');
    if (!d.recentRuns || d.recentRuns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:2rem">No runs yet</td></tr>';
    } else {
      tbody.innerHTML = d.recentRuns.map(function(r, idx) {
        var pass = parseFloat(r.stats && r.stats.passRate ? r.stats.passRate : '0');
        var color = pass === 100 ? 'var(--green)' : pass >= 90 ? '#84cc16' : pass >= 75 ? 'var(--amber)' : 'var(--red)';
        return '<tr class="clickable" onclick="showRunDetail(' + idx + ')">' +
          '<td style="font-family:monospace;font-size:12px;color:#94a3b8">' + (r.runId || '').slice(0,16) + '</td>' +
          '<td><span style="color:' + color + ';font-weight:700">' + (r.stats && r.stats.passRate ? r.stats.passRate : '—') + '</span></td>' +
          '<td style="color:var(--muted)">' + (r.stats && r.stats.total ? r.stats.total : 0) + '</td>' +
          '<td style="color:' + ((r.stats && r.stats.failed > 0) ? 'var(--red)' : 'var(--green)') + '">' + (r.stats && r.stats.failed ? r.stats.failed : 0) + '</td>' +
          '<td style="color:var(--muted);font-size:12px">' + Math.round((r.durationMs || 0)/1000) + 's</td>' +
          '</tr>';
      }).join('');
    }

    // Flaky tests
    if (d.flaky && d.flaky.length > 0) {
      var fcard = document.getElementById('flaky-card');
      fcard.style.display = 'block';
      document.getElementById('flaky-table-body').innerHTML = d.flaky.slice(0,6).map(function(f) {
        return '<tr>' +
          '<td style="font-size:12px">' + safeText((f.testTitle || '').slice(0,50)) + '</td>' +
          '<td style="color:var(--muted)">' + safeText(f.browser || '') + '</td>' +
          '<td><span style="font-family:monospace;font-weight:700;color:' +
            (f.flakinesScore >= 65 ? 'var(--red)' : f.flakinesScore >= 45 ? 'var(--amber)' : 'var(--green)') +
          '">' + (f.flakinesScore || 0) + '</span></td>' +
          '<td><span class="badge" style="background:rgba(239,68,68,0.15);color:var(--red)">' + safeText(f.riskCategory || '') + '</span></td>' +
          '</tr>';
      }).join('');
    }

    if (document.getElementById('panel-dashboard').classList.contains('active')) renderChart();
  }).catch(function(e) {
    console.error('loadDashboard error:', e);
  });
}

function loadCoverage() {
  fetch('/api/coverage').then(function(r) { return r.json(); }).then(function(d) {
    if (!d || !d.areas) return;

    // Score cards
    var scoresEl = document.getElementById('coverage-scores');
    scoresEl.style.display = 'grid';
    scoresEl.innerHTML = d.areas.slice(0,6).map(function(a) {
      var color = a.coverageScore >= 80 ? 'var(--green)' : a.coverageScore >= 60 ? 'var(--amber)' : 'var(--red)';
      return '<div class="kpi">' +
        '<div class="kpi-label">' + safeText(a.area) + '</div>' +
        '<div class="kpi-value" style="font-size:1.6rem;color:' + color + '">' + a.coverageScore + '<span style="font-size:1rem;color:var(--muted)">/100</span></div>' +
        '<div class="kpi-sub">' + (a.gaps ? a.gaps.length : 0) + ' gaps \u00b7 ' + (a.tests ? a.tests.length : 0) + ' tests</div>' +
        '<div class="progress-bar" style="margin-top:0.5rem"><div class="progress-fill" style="width:' + a.coverageScore + '%;background:' + color + '"></div></div>' +
        '</div>';
    }).join('');

    // Gaps table
    var allGaps = d.areas.flatMap(function(a) {
      return (a.gaps || []).map(function(g) { return Object.assign({}, g, {area: a.area}); });
    });

    if (allGaps.length > 0) {
      document.getElementById('coverage-empty').style.display = 'none';
      var table = document.getElementById('coverage-gaps-table');
      table.style.display = 'table';
      document.getElementById('coverage-gaps-body').innerHTML = allGaps.map(function(g) {
        return '<tr>' +
          '<td><span style="font-family:monospace;font-size:12px;color:var(--accent)">' + safeText(g.suggestedId) + '</span></td>' +
          '<td><span class="prio prio-' + (g.priority || '').toLowerCase() + '">' + safeText(g.priority) + '</span></td>' +
          '<td style="color:var(--muted);font-size:12px">' + safeText(g.area) + '</td>' +
          '<td style="font-size:13px">' + safeText((g.scenario || '').slice(0,80)) + '</td>' +
          '</tr>';
      }).join('');
    }

    // Gap shortcuts for Generate tab - use DOM methods, no innerHTML onclick
    if (allGaps.length > 0) {
      window._allGaps = allGaps;
      document.getElementById('gap-shortcuts').style.display = 'block';
      var gapList = document.getElementById('gap-list');
      gapList.innerHTML = '';
      allGaps.slice(0,8).forEach(function(g) {
        var div = document.createElement('div');
        div.style.cssText = 'padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;margin-bottom:4px;transition:border-color 0.15s';
        var id = document.createElement('span');
        id.style.cssText = 'font-family:monospace;color:var(--accent)';
        id.textContent = g.suggestedId || '';
        var sep = document.createElement('span');
        sep.style.cssText = 'color:var(--muted);margin:0 6px';
        sep.textContent = '·';
        var txt = document.createTextNode((g.scenario || '').slice(0, 55) + '...');
        div.appendChild(id);
        div.appendChild(sep);
        div.appendChild(txt);
        div.addEventListener('mouseover', function() { this.style.borderColor = 'var(--accent)'; });
        div.addEventListener('mouseout',  function() { this.style.borderColor = 'var(--border)'; });
        (function(scenario, area) {
          div.addEventListener('click', function() {
            document.getElementById('gen-prompt').value = scenario;
            document.getElementById('gen-area').value = area;
          });
        })(g.scenario || '', g.area || '');
        gapList.appendChild(div);
      });
        }
  }).catch(function(e) { console.error('loadCoverage error:', e); });
}

function loadNotes() {
  fetch('/api/notes').then(function(r) { return r.json(); }).then(function(d) {
    if (!d) return;
    var kpis = document.getElementById('notes-kpis');
    kpis.style.display = 'grid';
    document.getElementById('notes-health').textContent = d.healthScore || '—';
    document.getElementById('notes-trend').textContent = d.trend || '—';
    document.getElementById('notes-runs').textContent = d.runsAnalysed || '—';
    var dt = d.generatedAt || '';
    document.getElementById('notes-date').textContent = dt.slice(0,10) || '—';
    document.getElementById('notes-time').textContent = dt.slice(11,16) || '';

    if (d.rawMarkdown) {
      var html = d.rawMarkdown
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/^## (.*)/gm,'<h3>$1</h3>')
        .replace(/^### (.*)/gm,'<h4>$1</h4>')
        .replace(/\*\*(.*?)\*\*/g,'<strong style="color:#f1f5f9">$1</strong>')
        .replace(/^- (.*)/gm,'<div style="display:flex;gap:8px;margin:3px 0"><span style="color:#38bdf8">&#9656;</span><span>$1</span></div>');
      document.getElementById('notes-body').innerHTML = html;
    }
  }).catch(function(e) { console.error('loadNotes error:', e); });
}

// ── Helpers ────────────────────────────────────────────
function safeText(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stat(val, label, color) {
  return '<div><span style="' + (color ? 'color:' + color + ';' : '') + 'font-size:1.4rem;font-weight:700;font-family:monospace">' + (val || '—') + '</span><div style="font-size:11px;color:var(--muted)">' + label + '</div></div>';
}

// ── Chart ──────────────────────────────────────────────
function renderChart() {
  if (!dashboardData) return;
  var ctx = document.getElementById('pass-chart');
  if (!ctx) return;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  var runs = dashboardData.recentRuns || [];
  var labels = runs.map(function(_, i) { return 'R' + (i + 1); });
  var data = runs.map(function(r) { return parseFloat(r.stats && r.stats.passRate ? r.stats.passRate : '0'); }).reverse();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: [{
      label: 'Pass %', data: data,
      borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.06)',
      fill: true, tension: 0.3, pointRadius: 5, pointHoverRadius: 8,
      pointBackgroundColor: data.map(function(v) { return v === 100 ? '#22c55e' : v < 80 ? '#ef4444' : '#f59e0b'; })
    }]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 110, ticks: { callback: function(v) { return v + '%'; }, color: '#4a5568', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { ticks: { color: '#4a5568', font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

// ── Run detail modal ───────────────────────────────────
function showRunDetail(idx) {
  if (!dashboardData || !dashboardData.recentRuns) return;
  var run = dashboardData.recentRuns[idx];
  if (!run) return;
  var failHTML = run.failures && run.failures.length > 0
    ? run.failures.map(function(f) {
        return '<div style="padding:8px;background:var(--bg);border-radius:6px;margin-bottom:6px;font-size:12px">' +
          '<strong style="color:#ef4444">' + safeText(f.testTitle) + '</strong><br>' +
          '<span style="color:var(--muted)">' + safeText(f.verdict) + ' &middot; ' + safeText(f.browser) + '</span></div>';
      }).join('')
    : '<div style="color:var(--green);font-size:13px">&#10003; All tests passed</div>';

  var stats = run.stats || {};
  document.getElementById('run-modal-content').innerHTML =
    '<div style="font-family:monospace;font-size:12px;color:var(--muted);margin-bottom:1rem">' + safeText(run.runId) + '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1rem">' +
    '<div><div style="color:var(--green);font-size:1.4rem;font-weight:700">' + safeText(stats.passRate) + '</div><div style="font-size:11px;color:var(--muted)">Pass Rate</div></div>' +
    '<div><div style="font-size:1.4rem;font-weight:700">' + (stats.total || 0) + '</div><div style="font-size:11px;color:var(--muted)">Total Tests</div></div>' +
    '<div><div style="font-size:1.4rem;font-weight:700">' + Math.round((run.durationMs || 0)/1000) + 's</div><div style="font-size:11px;color:var(--muted)">Duration</div></div>' +
    '</div><div style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Failures</div>' + failHTML;

  document.getElementById('run-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('run-modal').classList.remove('open');
}

// ── Run Tests ──────────────────────────────────────────
async function runTests() {
  var btn = document.getElementById('run-btn');
  var term = document.getElementById('run-terminal');
  var fill = document.getElementById('run-progress-fill');
  btn.disabled = true;
  btn.textContent = 'Running...';
  term.textContent = '';
  fill.style.width = '0%';

  var chromium = document.getElementById('opt-chromium').checked;
  var webkit = document.getElementById('opt-webkit').checked;
  var pipeline = document.getElementById('opt-pipeline').checked;

  try {
    var resp = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suite: selectedSuite, chromium: chromium, webkit: webkit, pipeline: pipeline })
    });
    var reader = resp.body.getReader();
    var decoder = new TextDecoder();
    var progress = 10;
    while (true) {
      var result = await reader.read();
      if (result.done) break;
      term.textContent += decoder.decode(result.value);
      term.scrollTop = term.scrollHeight;
      progress = Math.min(progress + 3, 95);
      fill.style.width = progress + '%';
    }
    fill.style.width = '100%';
    // Parse stats from terminal output
    var lines = term.textContent.split('\n');
    var passedLine = lines.find(function(l) { return l.match(/\d+ passed/); });
    if (passedLine) {
      var match = passedLine.match(/(\d+) passed/);
      var failMatch = passedLine.match(/(\d+) failed/);
      if (match) {
        var passed = parseInt(match[1]);
        var failed = failMatch ? parseInt(failMatch[1]) : 0;
        var total = passed + failed;
        var rate = total > 0 ? ((passed/total)*100).toFixed(1) + '%' : '100%';
        // Update last run display directly
        document.getElementById('last-run-card').style.display = 'block';
        document.getElementById('last-run-title').textContent = 'Last Run (Live)';
        document.getElementById('last-run-stats').innerHTML =
          '<div><span style="color:var(--green);font-size:1.4rem;font-weight:700;font-family:monospace">' + rate + '</span><div style="font-size:11px;color:var(--muted)">Pass Rate</div></div>' +
          '<div><span style="font-size:1.4rem;font-weight:700;font-family:monospace">' + total + '</span><div style="font-size:11px;color:var(--muted)">Total</div></div>' +
          '<div><span style="color:var(--green);font-size:1.4rem;font-weight:700;font-family:monospace">' + passed + '</span><div style="font-size:11px;color:var(--muted)">Passed</div></div>' +
          '<div><span style="color:' + (failed > 0 ? 'var(--red)' : 'var(--green)') + ';font-size:1.4rem;font-weight:700;font-family:monospace">' + failed + '</span><div style="font-size:11px;color:var(--muted)">Failed</div></div>';
      }
    }
    term.textContent += '\\n\\n\u2705 Run complete.';
    setTimeout(function() { fill.style.width = '0%'; }, 2000);
    setTimeout(function() { softRefresh(null); }, 500);
  } catch (e) {
    term.textContent += '\\nError: ' + e.message;
  }
  btn.disabled = false;
  btn.innerHTML = '&#9654; &nbsp;Run Suite';
}

function clearTerminal() {
  document.getElementById('run-terminal').textContent = 'Waiting for test run...\\n';
}

// ── Generate Test ──────────────────────────────────────
async function generateTest() {
  var prompt = document.getElementById('gen-prompt').value.trim();
  var area = document.getElementById('gen-area').value;
  var priority = document.getElementById('gen-priority').value;
  var btn = document.getElementById('gen-btn');
  var output = document.getElementById('gen-code');
  var status = document.getElementById('gen-status');
  if (!prompt) { alert('Please describe the test scenario first'); return; }
  btn.disabled = true;
  btn.textContent = 'Generating...';
  output.textContent = 'Generating with Claude AI...';
  status.innerHTML = '';
  try {
    var resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt, area: area, priority: priority })
    });
    var data = await resp.json();
    if (data.error) {
      output.textContent = 'Error: ' + data.error;
    } else {
      output.textContent = data.code;
      status.innerHTML = '<div style="color:var(--green);font-size:13px">\u2705 Test generated \u2014 copy and save to src/tests/</div>';
    }
  } catch (e) {
    output.textContent = 'Error: ' + e.message;
  }
  btn.disabled = false;
  btn.innerHTML = '&#10022; &nbsp;Generate Test';
}

function fillFromGap(scenario, area) {
  document.getElementById('gen-prompt').value = scenario;
  document.getElementById('gen-area').value = area;
}

function copyGenerated() {
  var code = document.getElementById('gen-code').textContent;
  navigator.clipboard.writeText(code).then(function() {
    var btn = event.target;
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = 'Copy'; }, 2000);
  });
}

// ── Commands ───────────────────────────────────────────
async function runCommand(cmd) {
  var termIds = { coverage: 'coverage-terminal', 'generate-gaps': 'coverage-terminal', 'release-notes': 'notes-terminal', 'release-notes-sprint': 'notes-terminal' };
  var btnIds  = { coverage: 'coverage-btn', 'generate-gaps': 'generate-gaps-btn', 'release-notes': 'notes-btn' };
  var term = document.getElementById(termIds[cmd]);
  var btn = btnIds[cmd] ? document.getElementById(btnIds[cmd]) : null;
  if (btn) { btn.disabled = true; btn.textContent = 'Running...'; }
  term.textContent = 'Running ' + cmd + '...\\n';
  try {
    var resp = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    });
    var reader = resp.body.getReader();
    var decoder = new TextDecoder();
    while (true) {
      var result = await reader.read();
      if (result.done) break;
      term.textContent += decoder.decode(result.value);
      term.scrollTop = term.scrollHeight;
    }
  } catch (e) {
    term.textContent += '\\nError: ' + e.message;
  }
  if (btn) {
    btn.disabled = false;
    if (btn.id === 'coverage-btn') btn.innerHTML = '&#9678; &nbsp;Analyse Gaps';
    else if (btn.id === 'notes-btn') btn.innerHTML = '&#9673; &nbsp;Generate Notes';
    else btn.innerHTML = '&#10022; &nbsp;Generate Tests';
  }
  setTimeout(function() { loadAllData(); }, 1000);
}

// ── Soft refresh (data only, preserves terminal output) ──
function softRefresh(btn) {
  if (btn) { btn.textContent = 'Refreshing...'; btn.disabled = true; }
  loadDashboard();
  loadCoverage();
  loadNotes();
  setTimeout(function() {
    if (btn) { btn.innerHTML = '&#8635; Refresh'; btn.disabled = false; }
  }, 1500);
}

// ── Init ───────────────────────────────────────────────
loadAllData();
</script>
</body>
</html>`;

// ── API Handlers ──────────────────────────────────────────────────────────────

async function handleData(res: http.ServerResponse): Promise<void> {
  const history = load<any>('reports/run-history.json', { runs: [] });
  const notes   = load<any>('reports/release-notes.json', null);
  const flaky   = load<any>('reports/flaky-predictions.json', []);
  const runs    = history.runs ?? [];

  // Also check test-results.json for the most recent run (may not be in history yet)
  const testResults = load<any>('reports/test-results.json', null);
  let lastRun = runs[runs.length - 1] ?? null;

  if (testResults?.stats) {
    const s = testResults.stats;
    const total   = (s.expected ?? 0) + (s.unexpected ?? 0) + (s.flaky ?? 0) + (s.skipped ?? 0);
    const passed  = s.expected ?? 0;
    const failed  = s.unexpected ?? 0;
    const passRate = total > 0 ? (((passed + (s.flaky ?? 0)) / total) * 100).toFixed(1) + '%' : '0%';
    const liveRun = {
      runId:      (s.startTime ?? new Date().toISOString()).replace(/[:.]/g,'-').slice(0,19),
      timestamp:  s.startTime ?? new Date().toISOString(),
      durationMs: Math.round(s.duration ?? 0),
      stats:      { total, passed, failed, flaky: s.flaky ?? 0, skipped: s.skipped ?? 0, passRate },
      failures:   [],
    };
    // Use live data if it's more recent than history
    if (!lastRun || liveRun.timestamp > (lastRun.timestamp ?? '')) {
      lastRun = liveRun;
    }
  }

  const data = {
    totalRuns:   runs.length,
    passRate:    lastRun?.stats?.passRate ?? '—',
    healthScore: notes?.healthScore ?? (lastRun ? 100 : 0),
    trend:       notes?.trend ?? 'Stable',
    lastRun,
    recentRuns:  runs.slice(-8).reverse(),
    flaky:       (flaky as any[]).slice(0, 6),
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function handleCoverage(res: http.ServerResponse): Promise<void> {
  const gaps = load<any>('reports/coverage-gaps.json', null);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(gaps));
}

async function handleNotes(res: http.ServerResponse): Promise<void> {
  const notes = load<any>('reports/release-notes.json', null);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(notes));
}

async function handleRun(body: string, res: http.ServerResponse): Promise<void> {
  let params: any = {};
  try { params = JSON.parse(body); } catch {}

  const { suite = 'stable', chromium = true, webkit = false, pipeline = false } = params;

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
  });

  const write = (s: string) => res.write(s);
    try { fs.unlinkSync('reports/test-results.json'); } catch(_) {}
  write(`Starting ${suite} suite...\n\n`);

  let cmd = 'npx playwright test';
  if (suite === 'stable') cmd += ' --grep-invert "@slow|@flaky"';
  if (suite === 'smoke')  cmd += ' src/tests/loginFast.spec.ts src/tests/e2e-journey.spec.ts';
  if (suite === 'api')    cmd += ' src/tests/api.spec.ts --project=api';

  if (suite !== 'api') {
    if (chromium) cmd += ' --project=chromium';
    if (webkit)   cmd += ' --project=webkit';
  }

  // Let playwright.config.ts handle json reporter, just add list for terminal output
  cmd += ' --reporter=list';

  try {
    const proc = spawn('cmd', ['/c', cmd], {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0' },
      shell: false,
    });
    proc.stdout.on('data', (d: Buffer) => write(d.toString()));
    proc.stderr.on('data', (d: Buffer) => write(d.toString()));

    await new Promise<void>(resolve => proc.on('close', (code: number) => {
      write(`\nTests completed (exit code ${code})\n`);
      resolve();
    }));

    write('\nStoring results...\n');
    try {
      const out = execSync('npx tsx src/results-store.ts --force', { encoding: 'utf8', stdio: 'pipe' });
      write(out);
    } catch (e: any) { write(e.stdout ?? e.message ?? 'Store error'); }

    if (pipeline) {
      for (const step of [
        { label: 'AI Triage',     cmd: 'npx tsx src/ai-triage.ts' },
        { label: 'Release Notes', cmd: 'npx tsx src/release-notes.ts' },
      ]) {
        write(`\n${step.label}...\n`);
        try { write(execSync(step.cmd, { encoding: 'utf8', stdio: 'pipe' })); }
        catch (e: any) { write(e.stdout ?? e.message ?? 'Error'); }
      }
    }
  } catch (e: any) {
    write(`\nError: ${e.message}\n`);
  }

  res.end();
}

async function handleGenerate(body: string, res: http.ServerResponse): Promise<void> {
  let params: any = {};
  try { params = JSON.parse(body); } catch {}

  res.writeHead(200, { 'Content-Type': 'application/json' });

  if (!API_KEY) { res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' })); return; }

  const { prompt, area = 'Login', priority = 'P1' } = params;

  const systemPrompt = `Generate a Playwright TypeScript test for SauceDemo (https://www.saucedemo.com).
Conventions:
- import { test, expect } from '@playwright/test'; import { LoginPage } from '../pages/LoginPage';
- Use LoginPage, InventoryPage, CartPage, CheckoutPage from '../pages/'
- Login: await loginPage.login('standard_user', 'secret_sauce')
- Console: console.log('✅ TCXXX - message')
- Complete spec file with describe block and beforeEach
Return ONLY TypeScript code, no markdown.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Generate a ${priority} ${area} test:\n\n${prompt}` }],
      }),
    });
    const data: any = await response.json();
    let code = data.content?.[0]?.text?.trim() ?? '';
    code = code.replace(/^```typescript\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    res.end(JSON.stringify({ code }));
  } catch (e: any) {
    res.end(JSON.stringify({ error: e.message }));
  }
}

async function handleCommand(body: string, res: http.ServerResponse): Promise<void> {
  let params: any = {};
  try { params = JSON.parse(body); } catch {}

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
  });

  const write = (s: string) => res.write(s);

  const cmdMap: Record<string, string> = {
    'coverage':             'npx tsx src/coverage-gap.ts',
    'generate-gaps':        'npx tsx src/gap-to-test.ts',
    'release-notes':        'npx tsx src/release-notes.ts',
    'release-notes-sprint': 'npx tsx src/release-notes.ts --sprint',
  };

  const cmd = cmdMap[params.command];
  if (!cmd) { write('Unknown command'); res.end(); return; }

  write(`Running: ${cmd}\n\n`);

  try {
    const proc = spawn('cmd', ['/c', cmd], {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0' },
      shell: false,
    });
    proc.stdout.on('data', (d: Buffer) => write(d.toString()));
    proc.stderr.on('data', (d: Buffer) => write(d.toString()));
    await new Promise<void>(resolve => proc.on('close', () => { write('\nDone\n'); resolve(); }));
  } catch (e: any) {
    write(`\nError: ${e.message}\n`);
  }

  res.end();
}

// ── Server ────────────────────────────────────────────────────────────────────

function main() {
  if (!API_KEY) {
    console.error('ANTHROPIC_API_KEY not set in .env');
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const url = req.url ?? '/';
    const method = req.method ?? 'GET';

    if (method === 'GET' && url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML);
    } else if (method === 'GET' && url === '/api/data') {
      await handleData(res);
    } else if (method === 'GET' && url === '/api/coverage') {
      await handleCoverage(res);
    } else if (method === 'GET' && url === '/api/notes') {
      await handleNotes(res);
    } else if (method === 'POST' && url === '/api/run') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => handleRun(body, res));
    } else if (method === 'POST' && url === '/api/generate') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => handleGenerate(body, res));
    } else if (method === 'POST' && url === '/api/command') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => handleCommand(body, res));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, () => {
    console.log('\n RYQ Quality Platform\n');
    console.log(`   http://localhost:${PORT}\n`);
    console.log('   Tabs: Run Tests | Generate Test | Dashboard | Coverage Gaps | Release Notes\n');
    console.log('   Press Ctrl+C to stop.\n');
    try { execSync(`start http://localhost:${PORT}`); } catch {}
  });
}

main();
