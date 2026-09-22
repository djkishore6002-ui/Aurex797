export interface RetrievedChunk {
  content: string;
  title: string;
  source_type: string;
  source_id: number;
  score: number;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIContext {
  type: 'lesson' | 'workshop' | 'vocabulary' | 'page' | 'scenario' | 'general';
  id?: number;
  label: string;
  text?: string; // pre-extracted context text from the current page
}

export interface AIRequest {
  question: string;
  history: ChatTurn[];
  context?: AIContext;
  language?: string; // learner's preferred explanation language
  purpose?: 'tutor' | 'scenario' | 'question_prelim' | 'quiz_help';
}

export interface AIResponse {
  answer: string;
  provider: 'openrouter' | 'local';
  model: string;
  usedKnowledge: boolean;
  citations: { title: string; source_type: string }[];
  cached?: boolean;
  tokensIn: number;
  tokensOut: number;
}

export interface AIProviderOptions {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  model: string;
  knowledge: RetrievedChunk[];
  language?: string;
}

export interface AIProvider {
  readonly name: string;
  complete(req: AIRequest, opts: AIProviderOptions): Promise<AIResponse>;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Rough per-1k-token cost estimate in micro-dollars for admin reporting. */
export function estimateCostMicroUsd(tokensIn: number, tokensOut: number): number {
  return Math.round(tokensIn * 0.15 + tokensOut * 0.6); // ~$0.15/$0.60 per 1M tokens (order-of-magnitude)
}
