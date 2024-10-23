/**
 * This was heavily inspired by
 * https://github.com/drewmcdonald/obsidian-magic-mic
 * Thank you for traversing this in such a clean way
 */
import OpenAI from 'openai';
import audioDataToChunkedFiles from './audioDataToChunkedFiles';
import type { FileLike } from 'openai/uploads';

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
