import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../storage/db';
import { AiCallParams, AiResponse, AiUsageRecord } from '../types';

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

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
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

  const model      = process.env.AI_MODEL || 'claude-sonnet-4-5';
  const start      = Date.now();
  let success      = true;
  let inputTok     = 0;
  let outputTok    = 0;
  let content      = '';
  let durationMs   = 0;  // FIX TD-audit-3: captured before DB write so returned value === recorded value

  try {
    const response = await getClient().messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: messages as Anthropic.MessageParam[],
    });

    inputTok  = response.usage.input_tokens;
    outputTok = response.usage.output_tokens;
    content   = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

  } catch (err) {
    success = false;
    throw err;
  } finally {
    durationMs = Date.now() - start;  // FIX: captured here, before DB write
    const record: AiUsageRecord = {
      runId:            runId,
      appName,
      operation,
      model,
      inputTokens:      inputTok,
      outputTokens:     outputTok,
      totalTokens:      inputTok + outputTok,
      estimatedCostUsd: estimateCost(model, inputTok, outputTok),
      durationMs,
      triggeredBy:      process.env.TRIGGERED_BY || 'manual',
      success,
      recordedAt:       new Date().toISOString(),
    };
    try {
      await getDb().insertInto('ai_usage').values({
        run_id:             record.runId ?? null,
        app_name:           record.appName,
        operation:          record.operation,
        model:              record.model,
        input_tokens:       record.inputTokens,
        output_tokens:      record.outputTokens,
        total_tokens:       record.totalTokens,
        estimated_cost_usd: record.estimatedCostUsd,
        duration_ms:        record.durationMs,
        triggered_by:       record.triggeredBy,
        success:            record.success ? 1 : 0,
        recorded_at:        record.recordedAt,
      }).execute();
    } catch (dbErr) {
      console.warn('[AiClient] Failed to record ai_usage:', dbErr);
    }
  }

  return {
    content,
    inputTokens:  inputTok,
    outputTokens: outputTok,
    model,
    durationMs,   // FIX: same value as recorded — no longer recomputed after DB write
  };
}
