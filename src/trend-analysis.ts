/**
 * trend-analysis.ts
 * ─────────────────────────────────────────────────────────────
 * Step 6 — Trend Analysis / Predictive Intelligence
 * Personal AI-Augmented Testing Framework
 *
 * Reads:   reports/run-history.json
 *          reports/trends.json
 * Writes:  reports/trend-dashboard.html  (interactive visual dashboard)
 *          reports/trend-report.md       (text summary)
 *
 * Run:  npx tsx src/trend-analysis.ts
 *       npx tsx src/trend-analysis.ts --open   (opens browser after generating)
 * ─────────────────────────────────────────────────────────────
 */

import * as fs   from 'fs';
import * as dotenv from 'dotenv';
import { RunRepository }   from './storage/repositories/RunRepository'
import { TrendRepository } from './storage/repositories/TrendRepository'
import { aiCall }          from './ai/AiClient'

dotenv.config();

// ── Types ────────────────────────────────────────────────────

interface RunFailure {
  testTitle: string; file: string; browser: string;
  priority: string; verdict: string; errorMessage: string;
}
interface RunStats {
  total: number; passed: number; failed: number;
  flaky: number; skipped: number; passRate: string;
}
interface RunRecord {
  runId: string; timestamp: string; durationMs: number;
  stats: RunStats; failures: RunFailure[];
  flakyTests: { testTitle: string; file: string; browser: string }[];
}
interface TrendEntry {
  testTitle: string; file: string; totalRuns: number;
  failureCount: number; flakyCount: number;
  lastVerdict: string; lastSeen: string;
  consecutiveFails: number; riskLevel: string;
}
interface RunHistory { created: string; runs: RunRecord[] }
interface TrendStore { lastUpdated: string; totalRuns: number; tests: Record<string, TrendEntry> }
interface AnalysisSummary {
  totalRuns: number; currentPassRate: string; avgPassRate: string;
  consecutiveCleanRuns: number; durationTrend: string;
  highRisk: TrendEntry[]; mediumRisk: TrendEntry[];
  stableTests: number; browserBias: string; aiNarrative: string;
}

// ── Config ───────────────────────────────────────────────────

const CONFIG = {
  runHistory:  'reports/run-history.json',
  trends:      'reports/trends.json',
  outputHtml:  'reports/trend-dashboard.html',
  outputMd:    'reports/trend-report.md',
  model:       'claude-sonnet-4-5' as const,
  openBrowser: process.argv.includes('--open'),
};


// ── Entry point ───────────────────────────────────────────────

async function main() {
  console.log('\n📈 Trend Analysis — building interactive dashboard...\n');

  const runRepo   = new RunRepository()
  const dbRuns    = await runRepo.findByApp('saucedemo', 100)
  const trendRepo = new TrendRepository()
  const trendRows = await trendRepo.findByApp('saucedemo', 30)

  if (!dbRuns.length) {
    console.error('❌ No run data in database. Run npm run test:all a few times first.\n');
    process.exit(1);
  }

  const history = { created: new Date().toISOString(), runs: dbRuns as any } as RunHistory
  const trends  = { lastUpdated: new Date().toISOString(), totalRuns: dbRuns.length, tests: {} } as any as TrendStore

  console.log(`  📊 Analyzing ${dbRuns.length} runs, ${trendRows.length} trend records tracked...`);

  const summary = await buildSummary(history, trends);
  const html    = buildDashboard(history, trends, summary);
  const md      = buildMarkdown(summary);

  fs.writeFileSync(CONFIG.outputHtml, html, 'utf-8');
  fs.writeFileSync(CONFIG.outputMd,   md,   'utf-8');

  printTerminal(summary);

  if (CONFIG.openBrowser) {
    const { execSync } = require('child_process');
    try { execSync(`start ${CONFIG.outputHtml}`); } catch {}
  }
}

// ── Build summary ─────────────────────────────────────────────

async function buildSummary(history: RunHistory, trends: TrendStore): Promise<AnalysisSummary> {
  const runs    = history.runs;
  const last    = runs[runs.length - 1];
  const rates   = runs.map(r => parseFloat(r.stats.passRate));
  const avg     = (rates.reduce((a,b) => a+b,0) / rates.length).toFixed(1) + '%';

  let streak = 0;
  for (let i = runs.length - 1; i >= 0; i--) {
    if (runs[i].stats.failed === 0 && runs[i].stats.flaky === 0) streak++;
    else break;
  }

  const recentAvg = runs.slice(-3).reduce((s,r) => s + r.durationMs, 0) / 3;
  const firstAvg  = runs.slice(0,  3).reduce((s,r) => s + r.durationMs, 0) / 3;
  const pct       = Math.round(((recentAvg - firstAvg) / firstAvg) * 100);
  const durTrend  = pct <= -10 ? `${Math.abs(pct)}% faster (${Math.round(recentAvg/1000)}s avg)`
                  : pct >=  10 ? `${pct}% slower (${Math.round(recentAvg/1000)}s avg)`
                  : `stable at ${Math.round(recentAvg/1000)}s avg`;

  const all        = Object.values(trends.tests);
  const highRisk   = all.filter(t => t.riskLevel === 'High');
  const mediumRisk = all.filter(t => t.riskLevel === 'Medium');
  const stableTests = all.filter(t => t.failureCount === 0 && t.flakyCount === 0).length;

  const wKeys = Object.keys(trends.tests).filter(k => k.includes('webkit')).length;
  const cKeys = Object.keys(trends.tests).filter(k => k.includes('chromium')).length;
  const browserBias = wKeys > cKeys
    ? `Webkit has ${wKeys - cKeys} more unstable entries than Chromium`
    : 'Both browsers showing similar stability profiles';

  const aiNarrative = await generateNarrative(runs, trends, { streak, avg, durTrend, highRisk: highRisk.length });

  return {
    totalRuns: runs.length, currentPassRate: last.stats.passRate,
    avgPassRate: avg, consecutiveCleanRuns: streak, durationTrend: durTrend,
    highRisk, mediumRisk, stableTests, browserBias, aiNarrative,
  };
}

// ── AI narrative ──────────────────────────────────────────────

async function generateNarrative(runs: RunRecord[], trends: TrendStore, meta: Record<string,any>): Promise<string> {
  try {
    const last5 = runs.slice(-5).map(r =>
      `${r.runId}: ${r.stats.passRate} (${r.stats.failed} failed)`).join('\n');
    const response = await aiCall({
      operation: 'trend-narrative',
      appName:   'saucedemo',
      messages:  [{ role: 'user', content: `Write a 2-sentence QA framework health summary. Be specific with numbers. No markdown.\n\nLast 5 runs:\n${last5}\nClean streak: ${meta.streak}\nAvg pass rate: ${meta.avg}\nDuration: ${meta.durTrend}\nHigh risk: ${meta.highRisk}` }],
      maxTokens: 150,
    })
    return response.content
  } catch {
    return `Framework has achieved ${meta.streak} consecutive clean runs with ${meta.avg} average pass rate. ${meta.highRisk} high-risk tests are isolated from the stable pipeline.`;
  }
}

// ── Build interactive HTML dashboard ─────────────────────────

function buildDashboard(history: RunHistory, trends: TrendStore, summary: AnalysisSummary): string {
  const runs     = history.runs;
  const all      = Object.values(trends.tests);
  const highCnt  = all.filter(t => t.riskLevel === 'High').length;
  const medCnt   = all.filter(t => t.riskLevel === 'Medium').length;
  const lowCnt   = all.filter(t => t.riskLevel === 'Low').length;

  // Serialize run data for JS — strip long error messages for size
  const runData = runs.map(r => ({
    id:   r.runId.slice(0,20),
    pass: parseFloat(r.stats.passRate),
    failed: r.stats.failed,
    flaky:  r.stats.flaky,
    dur:    Math.round(r.durationMs / 1000),
    failures: r.failures.slice(0, 15).map(f => ({
      t: f.testTitle.slice(0, 50),
      b: f.browser,
      v: f.verdict,
      e: f.errorMessage.slice(0, 80).replace(/\n/g, ' '),
    })),
  }));

  // Build risk test data grouped by tier
  const riskData: Record<string, {t:string;f:number;fl:number;v:string}[]> = { High:[], Medium:[], Low:[] };
  for (const [key, entry] of Object.entries(trends.tests)) {
    const browser = key.includes('webkit') ? 'webkit' : key.includes('chromium') ? 'chromium' : '';
    const tier = entry.riskLevel as 'High'|'Medium'|'Low';
    if (!riskData[tier]) continue;
    riskData[tier].push({
      t: entry.testTitle.slice(0, 45) + (browser ? ` (${browser})` : ''),
      f: entry.failureCount,
      fl: entry.flakyCount,
      v: entry.lastVerdict,
    });
  }

  // Build unstable test rows with per-run history
  const unstable = Object.entries(trends.tests)
    .filter(([,e]) => e.failureCount > 0 || e.flakyCount > 0)
    .map(([key, entry]) => {
      const browser = key.includes('webkit') ? 'webkit' : key.includes('chromium') ? 'chromium' : '';
      const history = runs.map(r => {
        const inFail  = r.failures.some(f => f.testTitle === entry.testTitle && f.browser === browser);
        const inFlaky = r.flakyTests.some(f => f.testTitle === entry.testTitle && f.browser === browser);
        return inFail ? 2 : inFlaky ? 1 : 0;
      });
      const status = entry.consecutiveFails > 0 ? 'Active'
                   : entry.lastVerdict === 'Bug' ? 'Fixed' : 'Isolated';
      return {
        id:   key.replace(/[^a-z0-9]/gi,'_').slice(0,30),
        t:    entry.testTitle.slice(0, 42),
        b:    browser,
        suite: entry.file.replace('.spec.ts',''),
        f:    entry.failureCount,
        fl:   entry.flakyCount,
        risk: entry.riskLevel,
        v:    entry.lastVerdict,
        status,
        history,
      };
    })
    .sort((a,b) => (b.f + b.fl) - (a.f + a.fl))
    .slice(0, 10);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Trend Dashboard — E2E AI Testing Framework</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;color:#1a1a1a;padding:2rem}
h1{font-size:22px;font-weight:500;margin-bottom:4px}
.sub{font-size:13px;color:#888;margin-bottom:1.5rem}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:1.5rem}
.metric{background:#fff;border:1px solid #e8e8e8;border-radius:8px;padding:1rem}
.mlabel{font-size:12px;color:#888;margin-bottom:4px}
.mval{font-size:22px;font-weight:500}
.mval.g{color:#059669}.mval.r{color:#dc2626}.mval.a{color:#d97706}
.card{background:#fff;border:1px solid #e8e8e8;border-radius:12px;padding:1.25rem;margin-bottom:1rem}
.ctitle{font-size:13px;color:#888;margin-bottom:6px}
.hint{font-size:11px;color:#aaa;margin-bottom:8px}
.legend{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
.li{display:flex;align-items:center;gap:5px;font-size:12px;color:#666}
.ld{width:10px;height:10px;border-radius:2px;flex-shrink:0}
.drill{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:1rem;margin-top:10px;display:none}
.dtitle{font-size:13px;font-weight:500;color:#1d4ed8;margin-bottom:8px}
.drow{display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-top:1px solid #e0e7ff;font-size:12px;color:#1e40af}
.pill{font-size:11px;padding:2px 8px;border-radius:4px;white-space:nowrap;flex-shrink:0}
.pf{background:#fee2e2;color:#991b1b}.pb{background:#fef3c7;color:#92400e}.pe{background:#dbeafe;color:#1e40af}.pp{background:#d1fae5;color:#065f46}
.two{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.tbl{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}
.tbl th{text-align:left;padding:7px 10px;color:#888;font-weight:500;background:#f8f9fa;font-size:11px}
.tbl td{padding:7px 10px;border-top:1px solid #f0f0f0;vertical-align:middle}
.tbl tr.clickable{cursor:pointer}.tbl tr.clickable:hover{background:#f0f7ff}
.narrative{background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:1rem 1.25rem;margin-bottom:1.5rem}
.nlabel{font-size:12px;color:#1d4ed8;font-weight:500;margin-bottom:6px}
.ntext{font-size:13px;color:#1e40af;line-height:1.6}
footer{margin-top:2rem;font-size:12px;color:#aaa;text-align:center}
</style>
</head>
<body>
<h1>Trend Dashboard</h1>
<p class="sub">Generated ${new Date().toLocaleString()} &nbsp;·&nbsp; ${runs.length} runs &nbsp;·&nbsp; ${Object.keys(trends.tests).length} tests tracked &nbsp;·&nbsp; Click any chart element to drill down</p>

<div class="metrics">
  <div class="metric"><div class="mlabel">Total runs</div><div class="mval">${summary.totalRuns}</div></div>
  <div class="metric"><div class="mlabel">Current pass rate</div><div class="mval g">${summary.currentPassRate}</div></div>
  <div class="metric"><div class="mlabel">Average pass rate</div><div class="mval ${parseFloat(summary.avgPassRate)>=95?'g':'a'}">${summary.avgPassRate}</div></div>
  <div class="metric"><div class="mlabel">Clean streak</div><div class="mval g">${summary.consecutiveCleanRuns} runs</div></div>
</div>

<div class="narrative">
  <div class="nlabel">AI analysis</div>
  <div class="ntext">${summary.aiNarrative}</div>
</div>

<div class="card">
  <div class="ctitle">Pass rate &amp; failures per run</div>
  <div class="hint">Click any data point to see that run's failure details</div>
  <div class="legend">
    <div class="li"><div class="ld" style="background:#059669"></div>Pass rate %</div>
    <div class="li"><div class="ld" style="background:#dc2626;height:3px;margin-top:3px"></div>Failures</div>
  </div>
  <div style="position:relative;height:240px"><canvas id="c1" role="img" aria-label="Pass rate trend across ${runs.length} runs">Pass rate trend from first to last run.</canvas></div>
  <div class="drill" id="d1"></div>
</div>

<div class="two">
  <div class="card">
    <div class="ctitle">Risk breakdown — ${all.length} tests tracked</div>
    <div class="hint">Click a segment to list tests in that tier</div>
    <div class="legend">
      <div class="li"><div class="ld" style="background:#dc2626"></div>High (${highCnt})</div>
      <div class="li"><div class="ld" style="background:#d97706"></div>Medium (${medCnt})</div>
      <div class="li"><div class="ld" style="background:#059669"></div>Low (${lowCnt})</div>
    </div>
    <div style="position:relative;height:190px"><canvas id="c2" role="img" aria-label="Risk donut: ${highCnt} high, ${medCnt} medium, ${lowCnt} low">${highCnt} high, ${medCnt} medium, ${lowCnt} low risk.</canvas></div>
    <div class="drill" id="d2"></div>
  </div>
  <div class="card">
    <div class="ctitle">Duration per run (seconds)</div>
    <div class="hint">Click a bar to compare with previous run</div>
    <div class="legend">
      <div class="li"><div class="ld" style="background:#7c3aed"></div>Duration (s) — ${summary.durationTrend}</div>
    </div>
    <div style="position:relative;height:190px"><canvas id="c3" role="img" aria-label="Duration bar chart across ${runs.length} runs">Duration trend across runs.</canvas></div>
    <div class="drill" id="d3"></div>
  </div>
</div>

<div class="card">
  <div class="ctitle">Unstable tests — click any row for full history</div>
  <table class="tbl" id="ttbl"></table>
  <div class="drill" id="d4"></div>
</div>

<footer>RYQ AI Testing Framework &nbsp;·&nbsp; Step 6 Trend Analysis &nbsp;·&nbsp; rkasthuri/e2e-ai-testing-framework</footer>

<script>
const RD=${JSON.stringify(runData)};
const RISK=${JSON.stringify(riskData)};
const UT=${JSON.stringify(unstable)};

function pc(v){
  const s=String(v).toLowerCase();
  if(s.includes('bug')) return 'pb';
  if(s.includes('flaky')) return 'pf';
  if(s.includes('env')) return 'pe';
  return 'pp';
}
function sc(s){return s==='Fixed'||s==='Isolated'?'#059669':s==='Monitor'?'#d97706':'#dc2626'}

const labels=RD.map((_,i)=>'R'+(i+1));
const rates =RD.map(r=>r.pass);
const fails =RD.map(r=>r.failed);
const durs  =RD.map(r=>r.dur);

function show(id,html){const d=document.getElementById(id);d.style.display='block';d.innerHTML=html}
function hide(id){document.getElementById(id).style.display='none'}

new Chart(document.getElementById('c1'),{
  type:'line',
  data:{labels,datasets:[
    {label:'Pass %',data:rates,borderColor:'#059669',backgroundColor:'rgba(5,150,105,0.06)',fill:true,tension:0.3,yAxisID:'y',
     pointRadius:6,pointHoverRadius:9,pointBackgroundColor:rates.map(v=>v===100?'#059669':v<80?'#dc2626':'#d97706')},
    {label:'Fails',data:fails,borderColor:'#dc2626',borderDash:[4,3],tension:0.3,yAxisID:'y2',
     pointRadius:4,pointHoverRadius:7,pointBackgroundColor:'#dc2626'}
  ]},
  options:{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false},tooltip:{callbacks:{title:i=>'Run R'+(i[0].index+1)+' ('+RD[i[0].index].id+')'}}},
    onClick:(_,els)=>{
      if(!els.length){hide('d1');return}
      const r=RD[els[0].index];
      if(!r.failures.length){
        show('d1','<div class="dtitle">R'+(els[0].index+1)+' — all tests passed</div><div style="font-size:12px;color:#1e40af">Pass rate: '+r.pass+'%  ·  Duration: '+r.dur+'s  ·  Zero failures</div>');
        return;
      }
      let h='<div class="dtitle">R'+(els[0].index+1)+' ('+r.id+') — '+r.failed+' failure(s)  ·  '+r.pass+'% pass  ·  '+r.dur+'s</div>';
      r.failures.forEach(f=>{
        h+='<div class="drow"><span class="pill '+pc(f.v)+'">'+f.v+'</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+f.t+'</span><span style="flex-shrink:0;color:#93c5fd;font-size:11px;margin-left:6px">'+f.b+'</span></div>';
      });
      show('d1',h);
    },
    scales:{
      y:{min:0,max:110,ticks:{callback:v=>v+'%',font:{size:11}},grid:{color:'rgba(0,0,0,0.05)'}},
      y2:{min:0,max:Math.max(...fails)+3,position:'right',ticks:{font:{size:11}},grid:{display:false}},
      x:{ticks:{font:{size:10},autoSkip:false,maxRotation:0},grid:{display:false}}
    }
  }
});

new Chart(document.getElementById('c2'),{
  type:'doughnut',
  data:{labels:['High','Medium','Low'],datasets:[{data:[${highCnt},${medCnt},${lowCnt}],backgroundColor:['#dc2626','#d97706','#059669'],borderWidth:0,hoverOffset:5}]},
  options:{responsive:true,maintainAspectRatio:false,cutout:'60%',
    plugins:{legend:{display:false}},
    onClick:(_,els)=>{
      if(!els.length){hide('d2');return}
      const tier=['High','Medium','Low'][els[0].index];
      const tests=RISK[tier]||[];
      let h='<div class="dtitle">'+tier+' risk — '+tests.length+' test(s)</div>';
      tests.forEach(t=>{
        h+='<div class="drow"><span class="pill '+pc(t.v)+'">'+t.v+'</span><span style="flex:1">'+t.t+'</span><span style="flex-shrink:0;color:#93c5fd;font-size:11px">'+t.f+' fail · '+t.fl+' flaky</span></div>';
      });
      show('d2',h);
    }
  }
});

new Chart(document.getElementById('c3'),{
  type:'bar',
  data:{labels,datasets:[{label:'Duration',data:durs,
    backgroundColor:durs.map(v=>v>200?'#d97706':v<100?'#059669':'#7c3aed'),borderRadius:3}]},
  options:{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    onClick:(_,els)=>{
      if(!els.length){hide('d3');return}
      const i=els[0].index;const r=RD[i];
      const prev=i>0?RD[i-1]:null;
      const chg=prev?Math.round(((r.dur-prev.dur)/prev.dur)*100):0;
      const arrow=chg>0?'↑':'↓';
      show('d3','<div class="dtitle">R'+(i+1)+' — '+r.dur+'s'+(prev?' ('+arrow+Math.abs(chg)+'% vs R'+i+')':'')+'</div><div style="font-size:12px;color:#1e40af">Pass rate: '+r.pass+'%  ·  Failures: '+r.failed+'  ·  Flaky: '+r.flaky+'</div>');
    },
    scales:{
      y:{ticks:{callback:v=>v+'s',font:{size:11}},grid:{color:'rgba(0,0,0,0.05)'}},
      x:{ticks:{font:{size:10},autoSkip:false,maxRotation:0},grid:{display:false}}
    }
  }
});

const tbl=document.getElementById('ttbl');
let th='<thead><tr>';
['Test','Suite','Browser','Fails','Flaky','Verdict','Risk','Status','History'].forEach((h,i)=>{
  const w=['24%','9%','9%','6%','6%','9%','8%','8%','21%'][i];
  th+='<th style="width:'+w+'">'+h+'</th>';
});
th+='</tr></thead><tbody>';

const tb=UT.map((t,idx)=>{
  const bars=t.history.map(v=>'<span style="display:inline-block;width:8px;height:14px;border-radius:2px;background:'+(v===2?'#dc2626':v===1?'#d97706':'#059669')+';margin-right:1px"></span>').join('');
  const riskStyle=t.risk==='High'?'background:#fee2e2;color:#991b1b':t.risk==='Medium'?'background:#fef3c7;color:#92400e':'background:#d1fae5;color:#065f46';
  return '<tr class="clickable" onclick="showTest('+idx+')"><td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+t.t+'</td><td style="color:#666">'+t.suite+'</td><td style="color:#666">'+t.b+'</td><td>'+t.f+'</td><td>'+t.fl+'</td><td><span class="pill '+pc(t.v)+'">'+t.v+'</span></td><td><span style="'+riskStyle+';padding:2px 8px;border-radius:4px;font-size:11px">'+t.risk+'</span></td><td style="color:'+sc(t.status)+';font-size:11px">'+t.status+'</td><td>'+bars+'</td></tr>';
}).join('');

tbl.innerHTML=th+tb+'</tbody>';

function showTest(i){
  const t=UT[i];
  const total=t.history.length;
  const failOn=t.history.map((v,i)=>v?'R'+(i+1):null).filter(Boolean).join(', ')||'none';
  const stability=Math.round(((total-t.f-t.fl)/total)*100);
  show('d4','<div class="dtitle">'+t.t+' ('+t.b+')</div><div style="font-size:12px;color:#1e40af;line-height:1.8">Suite: '+t.suite+'.spec.ts  ·  Risk level: '+t.risk+'  ·  Status: '+t.status+'<br>Stability score: '+stability+'% across '+total+' runs<br>Failed on runs: '+failOn+'<br>Last verdict: '+t.v+'</div>');
}
window.showTest=showTest;
</script>
</body>
</html>`;
}

// ── Markdown ──────────────────────────────────────────────────

function buildMarkdown(s: AnalysisSummary): string {
  return [
    '# Trend Report',
    `**Generated:** ${new Date().toLocaleString()}`,
    '',
    '## Summary',
    `- Total runs: ${s.totalRuns}`,
    `- Current pass rate: ${s.currentPassRate}`,
    `- Average pass rate: ${s.avgPassRate}`,
    `- Clean streak: ${s.consecutiveCleanRuns} runs`,
    `- Duration: ${s.durationTrend}`,
    `- Browser: ${s.browserBias}`,
    '',
    '## AI Analysis',
    s.aiNarrative,
    '',
    '## High Risk Tests',
    ...s.highRisk.map(t => `- **${t.testTitle}** — ${t.failureCount} failures, ${t.flakyCount} flaky`),
    '',
    '## Medium Risk Tests',
    ...s.mediumRisk.slice(0,6).map(t => `- ${t.testTitle} — ${t.failureCount} failures, verdict: ${t.lastVerdict}`),
  ].join('\n');
}

// ── Terminal ──────────────────────────────────────────────────

function printTerminal(s: AnalysisSummary) {
  console.log('\n──────────────────────────────────────');
  console.log('  TREND ANALYSIS COMPLETE');
  console.log('──────────────────────────────────────');
  console.log(`  📊 Runs:         ${s.totalRuns}`);
  console.log(`  ✅ Pass rate:    ${s.currentPassRate} (avg ${s.avgPassRate})`);
  console.log(`  🏆 Clean streak: ${s.consecutiveCleanRuns} runs`);
  console.log(`  ⏱️  Duration:     ${s.durationTrend}`);
  if (s.highRisk.length) {
    console.log(`  🔴 High risk:    ${s.highRisk.length} tests`);
    s.highRisk.slice(0,2).forEach(t => console.log(`       • ${t.testTitle.slice(0,45)}`));
  }
  console.log('──────────────────────────────────────');
  console.log(`  🌐 ${CONFIG.outputHtml}`);
  console.log(`  📝 ${CONFIG.outputMd}`);
  console.log('──────────────────────────────────────\n');
  console.log(`  AI: ${s.aiNarrative.slice(0,120)}...\n`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
