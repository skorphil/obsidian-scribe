import OpenAI from 'openai';

export function initOpenAiClient(apiKey: string) {
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });
}
