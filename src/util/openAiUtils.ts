/**
 * This was heavily inspired by
 * https://github.com/drewmcdonald/obsidian-magic-mic
 * Thank you for traversing this in such a clean way
 */
import OpenAI from 'openai';
import audioDataToChunkedFiles from './audioDataToChunkedFiles';
import type { FileLike } from 'openai/uploads';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

import { JsonOutputParser } from '@langchain/core/output_parsers';

export enum LLM_MODELS {
  'gpt-4o-mini' = 'gpt-4o-mini',
  'gpt-4o' = 'gpt-4o',
  'gpt-4-turbo' = 'gpt-4-turbo',
}

const MAX_CHUNK_SIZE = 25 * 1024 * 1024;

export function initOpenAiClient(apiKey: string) {
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });
}

export async function handleAudioTranscription(
  openAiClient: OpenAI,
  audioBuffer: ArrayBuffer,
) {
  const audioFiles = await audioDataToChunkedFiles(audioBuffer, MAX_CHUNK_SIZE);

  console.log('Chunked File', audioFiles);

  const transcript = transcribeAudio(openAiClient, {
    audioFiles,
    onChunkStart: (i, total) => {
      let message = 'Scribe: Beginning Transcript';
      if (total > 1) message += ` ${i + 1}/${total}`;
      console.log(message);
    },
  });

  console.log('Transcribed File', transcript);
  return transcript;
}

/**
 * Transcribe an audio file with OpenAI's Whisper model
 *
 * Handles splitting the file into chunks, processing each chunk, and
 * concatenating the results.
 */

export interface TranscriptionOptions {
  audioFiles: FileLike[];
  onChunkStart?: (i: number, totalChunks: number) => void;
}

export default async function transcribeAudio(
  client: OpenAI,
  { audioFiles, onChunkStart }: TranscriptionOptions,
): Promise<string> {
  let transcript = '';
  for (const [i, file] of audioFiles.entries()) {
    if (onChunkStart) onChunkStart(i, audioFiles.length);
    const res = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
    });
    const sep = i === 0 ? '' : ' ';
    transcript += sep + res.text.trim();
  }
  return transcript;
}

export interface LLMSummary {
  summary: string;
  title: string;
  insights: string;
  mermaidChart: string;
}
export async function handleTranscriptSummary(
  openAiKey: string,
  transcript: string,
  llmModel: LLM_MODELS = LLM_MODELS['gpt-4o'],
) {
  const systemPrompt = `
  You are an expert note-making AI for obsidian who specializes in the Linking Your Thinking (LYK) strategy.  
  The following is a transcription of recording of someone talking aloud or people in a conversation. 
  There may be a lot of random things said given fluidity of conversation or thought process and the microphone's ability to pick up all audio.  

  Give me notes in Markdown language on what was said, they should be
  - Easy to understand
  - Succinct
  - Clean
  - Logical
  - Insightful
  It will be nested under a h1 # tag, so have no other headers that are greater than or equal to a h2 ## 
  Rules:
  - You do not need to include escaped new line characters
  - Do not mention "the speaker" anywhere in your response.  
  - The notes your write should be written as if I were writting them. 

  The following is the transcribed audio:
  <transcript>
  ${transcript}
  </transcript>

  
  `;
  const model = new ChatOpenAI({
    model: llmModel,
    apiKey: openAiKey,
    temperature: 0.5,
  });
  const messages = [new SystemMessage(systemPrompt)];

  const noteSummary = z.object({
    summary: z.string().describe(
      `A summary of the transcript in Markdown.  It will be nested under a h1 # tag, so have no other headers that are greater than or equal to a h2 ## 
         Concise bullet points containing the primary points of the speaker
        `,
    ),
    insights: z.string().describe(
      `Insights that you gained from the transcript.
        A brief section, a paragraph or two on what insights and enhancements you think of
        Several bullet points on things you think would be an improvement
        `,
    ),
    mermaidChart: z
      .string()
      .describe(
        'A mermaid chart that shows a concept map consisting of both what insights you had along with what the speaker said for the mermaid chart, dont wrap it in anything, just output the mermaid chart',
      ),
    title: z
      .string()
      .describe(
        'A suggested title for the Obsidian Note. Ensure that it is in the proper format for a file on mac, windows and linux',
      ),
  });
  const structuredLlm = model.withStructuredOutput(noteSummary);
  const result = (await structuredLlm.invoke(messages)) as LLMSummary;

  return await result;
}
