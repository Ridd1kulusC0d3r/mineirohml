import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { buildAnalystCopilotPrompt, COPILOT_RESPONSE_SCHEMA, sanitizeCopilotOutput } from '../../src/ai/analystCopilot';
import { PUBLIC_MODE } from '../security/middleware';
import { APP_VERSION } from '../version';

// Initialize GoogleGenAI client lazily or safely with User-Agent telemetry
function getGenAiClient(customApiKey?: string): { client: GoogleGenAI; isCustom: boolean } | null {
  const apiKey = (customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 10)
    ? customApiKey.trim()
    : (PUBLIC_MODE ? undefined : process.env.GEMINI_API_KEY);

  if (!apiKey) return null;
  return {
    client: new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': `mineiro-username-intelligence/${APP_VERSION}`,
        },
      },
    }),
    isCustom: Boolean(customApiKey && customApiKey.trim().length > 10),
  };
}

const COPILOT_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
] as const;

function normalizeCopilotModel(model?: unknown): string {
  const requested = typeof model === 'string' ? model.trim() : '';
  return requested || COPILOT_MODELS[0];
}

function classifyGeminiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(message)) return 'rate_limited';
  if (/401|403|API key|permission|unauth/i.test(message)) return 'authentication';
  if (/404|not found|model.*available/i.test(message)) return 'model_unavailable';
  if (/503|UNAVAILABLE|high demand|timeout|timed out/i.test(message)) return 'temporary_unavailable';
  return 'provider_error';
}

async function generateCopilotWithFallback(
  client: GoogleGenAI,
  prompt: string,
  preferredModel?: unknown
): Promise<{ parsed: any; modelUsed: string; attemptedModels: string[] }> {
  const preferred = normalizeCopilotModel(preferredModel);
  const candidates = [preferred, ...COPILOT_MODELS].filter((value, index, array) => array.indexOf(value) === index);
  const attemptedModels: string[] = [];
  const errors: string[] = [];

  for (const modelName of candidates) {
    attemptedModels.push(modelName);
    try {
      const response: any = await withTimeout(
        client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: COPILOT_RESPONSE_SCHEMA,
            temperature: 0.2,
          },
        }),
        15000
      );

      const parsed = parseCleanJson(response.text || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Provider returned an invalid JSON object.');
      }

      return { parsed, modelUsed: modelName, attemptedModels };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const kind = classifyGeminiError(error);
      errors.push(`${modelName}: ${kind}: ${message}`);

      // Invalid credentials will fail identically for every model, so stop early.
      if (kind === 'authentication') break;
    }
  }

  throw new Error(`Gemini Copilot unavailable after ${attemptedModels.length} attempt(s). ${errors.join(' | ')}`);
}

// Helper function to extract and parse JSON cleanly
function parseCleanJson(text: string): any {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(clean);
}

// Timeout helper to avoid uncomfortably long blocking calls on model backend spikes
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Model request timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export function copilotRouter(): Router {
  const router = Router();

  router.get('/api/intelligence/copilot/status', (req, res) => {
    const personalKey = typeof req.headers['x-gemini-api-key'] === 'string'
      ? req.headers['x-gemini-api-key']
      : '';
    const personalConfigured = personalKey.trim().length > 10;
    const serverConfigured = !PUBLIC_MODE && Boolean(process.env.GEMINI_API_KEY);

    res.json({
      configured: personalConfigured || serverConfigured,
      source: personalConfigured ? 'personal' : serverConfigured ? 'server' : 'none',
      defaultModel: COPILOT_MODELS[0],
      supportedModels: [...COPILOT_MODELS],
      provider: 'Google Gemini',
    });
  });

  // Endpoint to validate a personal Gemini API key or check system key status
  router.post('/api/osint/gemini-validate', async (req, res) => {
    const customKey = req.body.apiKey || (req.headers['x-gemini-api-key'] as string);
    const selectedModel = normalizeCopilotModel(req.body.model);

    const clientInfo = getGenAiClient(customKey);
    if (!clientInfo) {
      return res.json({
        valid: false,
        isConfigured: false,
        message: 'No API key provided or found in environment.',
        supportedModels: [...COPILOT_MODELS],
      });
    }

    try {
      const response = await withTimeout(
        clientInfo.client.models.generateContent({
          model: selectedModel,
          contents: 'Respond with JSON: {"status":"ok","service":"gemini"}',
          config: { responseMimeType: 'application/json', temperature: 0 },
        }),
        8000
      );

      const parsed = parseCleanJson(response.text || '{}');
      return res.json({
        valid: parsed?.status === 'ok',
        isConfigured: true,
        isCustom: clientInfo.isCustom,
        modelTested: selectedModel,
        message: 'Gemini is configured and responding.',
        supportedModels: [...COPILOT_MODELS],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(400).json({
        valid: false,
        isConfigured: true,
        isCustom: clientInfo.isCustom,
        modelTested: selectedModel,
        errorType: classifyGeminiError(error),
        error: error instanceof Error ? error.message : 'Failed to validate Gemini connection',
        supportedModels: [...COPILOT_MODELS],
      });
    }
  });

  // Evidence-bounded AI analyst copilot. This endpoint summarizes the local assessment;
  // it does not collect new target data and cannot raise factual confidence on its own.
  router.post('/api/intelligence/copilot', async (req, res) => {
    const { targetLabel = 'target', assessment, analystQuestion, model, customApiKey } = req.body || {};
    const headerKey = (req.headers['x-gemini-api-key'] as string) || customApiKey;

    if (!assessment || typeof assessment !== 'object') {
      return res.status(400).json({ error: 'A local intelligence assessment is required.' });
    }

    const evidenceCount = Array.isArray(assessment.evidence) ? assessment.evidence.length : 0;
    if (evidenceCount > 100) {
      return res.status(400).json({ error: 'Copilot accepts at most 100 prioritized evidence records per request.' });
    }

    const clientInfo = getGenAiClient(headerKey);
    if (!clientInfo) {
      return res.status(503).json({
        error: 'Gemini is not configured. Add a personal API key in AI settings or configure GEMINI_API_KEY on the server.',
        errorType: 'not_configured',
        provenance: { type: 'AI_SYNTHESIZED', factualConfidenceRaised: false },
      });
    }

    const prompt = buildAnalystCopilotPrompt({
      targetLabel: String(targetLabel).slice(0, 200),
      assessment,
      analystQuestion: typeof analystQuestion === 'string' ? analystQuestion.slice(0, 1000) : undefined,
    });

    try {
      const generated = await generateCopilotWithFallback(clientInfo.client, prompt, model);
      const evidenceIds = (Array.isArray(assessment.evidence) ? assessment.evidence : []).map((e: any) => String(e?.id));
      const { output, droppedEvidenceIds } = sanitizeCopilotOutput(generated.parsed, evidenceIds);
      return res.json({
        ...output,
        droppedEvidenceIds,
        modelUsed: generated.modelUsed,
        attemptedModels: generated.attemptedModels,
        generatedAt: new Date().toISOString(),
        provenance: {
          type: 'AI_SYNTHESIZED',
          factualConfidenceRaised: false,
        },
      });
    } catch (error) {
      return res.status(502).json({
        error: error instanceof Error ? error.message : 'AI analyst request failed',
        errorType: classifyGeminiError(error),
        requestedModel: normalizeCopilotModel(model),
        provenance: {
          type: 'AI_SYNTHESIZED',
          factualConfidenceRaised: false,
        },
      });
    }
  });

  return router;
}
