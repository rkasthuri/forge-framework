import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../storage/db';
import { AiCallParams, AiResponse } from '../types';

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5':          { input: 0.003,   output: 0.015   },
  'claude-sonnet-4-20250514':   { input: 0.003,   output: 0.015   },
  'claude-opus-4-5':            { input: 0.015,   output: 0.075   },
  'claude-haiku-4-5-20251001':  { input: 0.00025, output: 0.00125 },
};

function estimateCost(model: string, input: number, output: number): number {
  const p = PRICING[model] ?? PRICING['claude-sonnet-4-5'];
  return (input / 1000) * p.input + (output / 1000) * p.output;
}

// ── Retry config (TD-053) ──────────────────────────────────────────────────────
// The Anthropic SDK retries connection failures only up to the point it has a
// response's headers; a body-streaming drop ('Premature close' / FetchError) is
// thrown AFTER that envelope and is never retried by the SDK. This module wraps
// aiCall() in an app-level retry that covers exactly those transient drops.
const MAX_ATTEMPTS      = 3;        // initial + 2 retries
const CLIENT_TIMEOUT_MS = 90_000;   // 90s per attempt — set on the client, not per-call
const BACKOFF_BASE_MS   = 1000;
const JITTER_MAX_MS     = 500;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Retry only on transient connection / body-stream drops — never on a real
 * Anthropic APIError (4xx/5xx), which is a genuine error, not a dropped pipe.
 * `APIConnectionError` (incl. its timeout subclass) is the SDK's connection-layer
 * error; FetchError / 'Premature close' are the body-stream drops the SDK misses.
 */
function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionError) return true;
  const e = err as { name?: string; message?: string };
  if (e?.name === 'FetchError') return true;
  if (typeof e?.message === 'string' && /premature close/i.test(e.message)) return true;
  return false;
}

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    // timeout per attempt set here (not per-call). maxRetries: 0 so this module's
    // app-level wrapper is the single retry authority and "3 attempts maximum"
    // holds exactly — the SDK's own default of 2 retries would otherwise compound.
    _client = new Anthropic({
      apiKey:     process.env.ANTHROPIC_API_KEY,
      // SDK 0.32.1 bundles node-fetch (HTTP/1.1), which deterministically throws
      // "Premature close" on the CI bare ubuntu-latest runner (Node 24 / Linux),
      // while curl HTTP/2 and Node native fetch both return 200 there. Route the
      // SDK through native fetch. See TD-061 (diag branch diag/premature-close).
      // Remove this override if/when the SDK is upgraded (TD-062).
      fetch:      globalThis.fetch,
      timeout:    CLIENT_TIMEOUT_MS,
      maxRetries: 0,
    });
  }
  return _client;
}

interface UsageRow {
  runId?:       string;
  appName:      string;
  operation:    string;
  model:        string;
  inputTokens:  number;
  outputTokens: number;
  durationMs:   number;
  success:      boolean;
  retryAttempt: number;
}

async function recordUsage(r: UsageRow): Promise<void> {
  try {
    await getDb().insertInto('ai_usage').values({
      run_id:             r.runId ?? null,
      app_name:           r.appName,
      operation:          r.operation,
      model:              r.model,
      input_tokens:       r.inputTokens,
      output_tokens:      r.outputTokens,
      total_tokens:       r.inputTokens + r.outputTokens,
      estimated_cost_usd: estimateCost(r.model, r.inputTokens, r.outputTokens),
      duration_ms:        r.durationMs,
      triggered_by:       process.env.TRIGGERED_BY || 'manual',
      success:            r.success ? 1 : 0,
      recorded_at:        new Date().toISOString(),
      retry_attempt:      r.retryAttempt,
    }).execute();
  } catch (dbErr) {
    console.warn('[AiClient] Failed to record ai_usage:', dbErr);
  }
}

export async function aiCall(params: AiCallParams): Promise<AiResponse> {
  const {
    operation,
    messages,
    system,
    maxTokens = 2000,
    runId,
    appName,
  } = params;

  const model = process.env.AI_MODEL || 'claude-sonnet-4-5';

  let lastErr: unknown;
  // attempt is the 0-based attempt index, also recorded as retry_attempt.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const start = Date.now();
    try {
      const response = await getClient().messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: messages as Anthropic.MessageParam[],
      });

      const inputTok  = response.usage.input_tokens;
      const outputTok = response.usage.output_tokens;
      const content   = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');
      const durationMs = Date.now() - start;

      await recordUsage({
        runId, appName, operation, model,
        inputTokens: inputTok, outputTokens: outputTok,
        durationMs, success: true, retryAttempt: attempt,
      });

      return { content, inputTokens: inputTok, outputTokens: outputTok, model, durationMs };

    } catch (err) {
      const durationMs = Date.now() - start;
      lastErr = err;
      await recordUsage({
        runId, appName, operation, model,
        inputTokens: 0, outputTokens: 0,
        durationMs, success: false, retryAttempt: attempt,
      });

      const isLastAttempt = attempt === MAX_ATTEMPTS - 1;
      if (!isRetryable(err) || isLastAttempt) {
        throw err;
      }

      const backoff = BACKOFF_BASE_MS * 2 ** attempt + Math.floor(Math.random() * (JITTER_MAX_MS + 1));
      console.warn(`[AiClient] Retry attempt ${attempt + 1}/3 after ${err}`);
      await sleep(backoff);
    }
  }

  // Unreachable: the loop only exits via return (success) or throw (non-retryable
  // / final attempt). Present for type-safety / defensive clarity.
  throw lastErr;
}
