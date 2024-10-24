/**
 * This was heavily inspired by
 * https://github.com/drewmcdonald/obsidian-magic-mic
 * Thank you for traversing this in such a clean way
 */
import OpenAI from 'openai';
import audioDataToChunkedFiles from './audioDataToChunkedFiles';
import type { FileLike } from 'openai/uploads';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';

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

const MODELS: string[] = [
  'gpt-3.5-turbo-16k',
  'gpt-3.5-turbo-0613',
  'text-davinci-003',
  'text-davinci-002',
  'code-davinci-002',
  'code-davinci-001',
  'gpt-4-0613',
  'gpt-4-32k-0613',
  'gpt-4o',
  'gpt-4o-mini',
];

export async function handleTranscriptSummary(
  openAiKey: string,
  transcript: string,
) {
  const systemPrompt = `
  You are an expert note-making AI for obsidian who specializes in the Linking Your Thinking (LYK) strategy.  
  The following is a transcription of recording of someone talking aloud or people in a conversation. 
  There may be a lot of random things said given fluidity of conversation or thought process and the microphone's ability to pick up all audio.  
  Give me detailed notes in markdown language on what was said in the most easy-to-understand, detailed, and conceptual format.  
  Include any helpful information that can conceptualize the notes further or enhance the ideas, and then summarize what was said.  
  Do not mention "the speaker" anywhere in your response.  
  The notes your write should be written as if I were writting them. 
  Finally, ensure to end with code for a mermaid chart that shows an enlightening concept map combining both the transcription and the information you added to it.  
  The following is the transcribed audio:
  <transcript>
  ${transcript}
  </transcript>
  `;
  const model = new ChatOpenAI({ model: 'gpt-4o', apiKey: openAiKey });
  const messages = [new SystemMessage(systemPrompt)];
  const parser = new StringOutputParser();

  const result = await model.invoke(messages);

  return await parser.invoke(result);
}
