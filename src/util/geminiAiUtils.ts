import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
/**
 * This was heavily inspired by
 * https://github.com/drewmcdonald/obsidian-magic-mic
 * Thank you for traversing this in such a clean way
 */
import OpenAI from 'openai';
import type { FileLike } from 'openai/uploads';
import { z } from 'zod';
import audioDataToChunkedFiles from './audioDataToChunkedFiles';

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Notice } from 'obsidian';
import type { ScribeOptions } from 'src';
import { LanguageOptions } from './consts';
import { obsidianOpenAIFetch } from './obsidianOpenAIFetch';
import { convertToSafeJsonKey } from './textUtil';

export enum LLM_MODELS {
  'gpt-4.1' = 'gpt-4.1',
  'gpt-4.1-mini' = 'gpt-4.1-mini',
  'gpt-4o' = 'gpt-4o',
  'gpt-4o-mini' = 'gpt-4o-mini',
  'gpt-4-turbo' = 'gpt-4-turbo',
}

const MAX_CHUNK_SIZE = 25 * 1024 * 1024;

export async function chunkAndTranscribeWithOpenAi(
  openAiKey: string,
  audioBuffer: ArrayBuffer,
  { audioFileLanguage }: Pick<ScribeOptions, 'audioFileLanguage'>,
  customBaseUrl?: string,
  customModel?: string,
) {
  const openAiClient = new OpenAI({
    fetch: obsidianOpenAIFetch,
    apiKey: openAiKey,
    dangerouslyAllowBrowser: true,
    ...(customBaseUrl && { baseURL: customBaseUrl }),
  });
  const audioFiles = await audioDataToChunkedFiles(audioBuffer, MAX_CHUNK_SIZE);
  new Notice(`Scribe: 🎧 Split transcript into ${audioFiles.length} files`);

  const transcript = await transcribeAudio(openAiClient, {
    audioFiles,
    audioFileLanguage,
    customModel,
  });

  return transcript;
}

/**
 * Transcribe an audio file with OpenAI's Whisper model
 *
 * Handles splitting the file into chunks, processing each chunk, and
 * concatenating the results.
 */

interface TranscriptionOptions {
  audioFiles: FileLike[];
  onChunkStart?: (i: number, totalChunks: number) => void;
  audioFileLanguage?: LanguageOptions;
  customModel?: string;
}

async function transcribeAudio(
  client: OpenAI,
  {
    audioFiles,
    onChunkStart,
    audioFileLanguage,
    customModel,
  }: TranscriptionOptions,
): Promise<string> {
  let transcript = '';
  for (const [i, file] of audioFiles.entries()) {
    if (onChunkStart) {
      onChunkStart(i, audioFiles.length);
    }

    const useAudioFileLanguageSetting =
      audioFileLanguage && audioFileLanguage !== LanguageOptions.auto;

    const modelToUse = customModel || 'whisper-1';
    const baseOptions = {
      model: modelToUse,
      file,
    };
    const whisperOptions = useAudioFileLanguageSetting
      ? { ...baseOptions, language: audioFileLanguage }
      : baseOptions;

    const res = await client.audio.transcriptions.create(whisperOptions);
    const sep = i === 0 ? '' : ' ';
    transcript += sep + res.text.trim();
  }
  return transcript;
}

export async function summarizeTranscript(
  openAiKey: string, // Now used as GEMINI_API_KEY
  transcript: string,
  { scribeOutputLanguage, activeNoteTemplate }: ScribeOptions,
  llmModel: LLM_MODELS = LLM_MODELS['gpt-4o'], // Use a Gemini default
  customBaseUrl?: string,
  customChatModel?: string,
) {
  // 1. Define the CORE System Prompt without the transcript
  let coreSystemInstructions = `
  You are "Scribe" an expert note-making AI for Obsidian you specialize in the Linking Your Thinking (LYK) strategy.  
  The following is the transcription generated from a recording of someone talking aloud or multiple people in a conversation. 
  There may be a lot of random things said given fluidity of conversation or thought process and the microphone's ability to pick up all audio.  

  The transcription may address you by calling you "Scribe" or saying "Hey Scribe" and asking you a question, they also may just allude to you by asking "you" to do something.
  Give them the answers to this question

  Give me notes in Markdown language on what was said, they should be
  - Easy to understand
  - Succinct
  - Clean
  - Logical
  - Insightful
  
  It will be nested under a h2 # tag, feel free to nest headers underneath it
  Rules:
  - Do not include escaped new line characters
  - Do not mention "the speaker" anywhere in your response.  
  - The notes should be written as if I were writing them. 
  `;

  // 2. Add the language instruction to the core prompt if specified.
  if (scribeOutputLanguage) {
    coreSystemInstructions += `\n\nPlease ensure you respond entirely in ${scribeOutputLanguage} language.`;
  }

  // 3. Define the User Input (Transcript) separately.
  const userTranscriptInput = `
  The following is the transcribed audio:
  <transcript>
  ${transcript}
  </transcript>
  `;

  const modelToUse = customChatModel || llmModel;

  const model = new ChatGoogleGenerativeAI({
    model: modelToUse,
    apiKey: openAiKey,
    temperature: 0.5,
  });

  // 3. Construct the messages array: SystemMessage then HumanMessage
  const messages: BaseMessage[] = [
    new SystemMessage(coreSystemInstructions.trim()),
    new HumanMessage(userTranscriptInput.trim()),
  ];

  // --- Dynamic Zod Schema Generation (THE FIX IS HERE) ---
  const schema: Record<string, z.ZodType<string | null | undefined>> = {
    // fileTitle remains a standard required string
    fileTitle: z
      .string()
      .describe(
        'A suggested title for the Obsidian Note. Ensure that it is in the proper format for a file on mac, windows and linux, do not include any special characters',
      ),
  };

  activeNoteTemplate.sections.forEach((section) => {
    const { sectionHeader, sectionInstructions, isSectionOptional } = section;
    const key = convertToSafeJsonKey(sectionHeader);

    // Define the base type as a required string
    let field = z.string().describe(sectionInstructions);

    // FIX: If optional, use .optional() instead of .nullish()
    // This tells the JSON schema translator to simply remove the field
    // from the 'required' list, avoiding complex and confusing type definitions.
    if (isSectionOptional) {
      field = field.optional(); // ype 'ZodOptional<ZodString>' is missing the following properties from type 'ZodString': _regex, _addCheck, email, url, and 44 more.
    }

    // Assign the resulting Zod schema object
    schema[key] = field;
  });

  const structuredOutput = z.object(schema);

  const structuredLlm = model.withStructuredOutput(structuredOutput);

  const result = (await structuredLlm.invoke(messages)) as Record<
    string,
    string
  > & { fileTitle: string };

  return result;
}

export async function summarizeTranscriptOpenAi(
  openAiKey: string,
  transcript: string,
  { scribeOutputLanguage, activeNoteTemplate }: ScribeOptions,
  llmModel: LLM_MODELS = LLM_MODELS['gpt-4o'],
  customBaseUrl?: string,
  customChatModel?: string,
) {
  const systemPrompt = `
  You are "Scribe" an expert note-making AI for Obsidian you specialize in the Linking Your Thinking (LYK) strategy.  
  The following is the transcription generated from a recording of someone talking aloud or multiple people in a conversation. 
  There may be a lot of random things said given fluidity of conversation or thought process and the microphone's ability to pick up all audio.  

  The transcription may address you by calling you "Scribe" or saying "Hey Scribe" and asking you a question, they also may just allude to you by asking "you" to do something.
  Give them the answers to this question

  Give me notes in Markdown language on what was said, they should be
  - Easy to understand
  - Succinct
  - Clean
  - Logical
  - Insightful
  
  It will be nested under a h2 # tag, feel free to nest headers underneath it
  Rules:
  - Do not include escaped new line characters
  - Do not mention "the speaker" anywhere in your response.  
  - The notes should be written as if I were writing them. 

  The following is the transcribed audio:
  <transcript>
  ${transcript}
  </transcript>
  `;
  const modelToUse = customChatModel || llmModel;
  const model = new ChatOpenAI({
    model: modelToUse,
    apiKey: openAiKey,
    temperature: 0.5,
    ...(customBaseUrl && {
      configuration: { baseURL: customBaseUrl, fetch: obsidianOpenAIFetch },
    }),
  });
  const messages = [new SystemMessage(systemPrompt)];

  if (scribeOutputLanguage) {
    messages.push(
      new SystemMessage(`Please respond in ${scribeOutputLanguage} language`),
    );
  }

  const schema: Record<string, z.ZodType<string | null | undefined>> = {
    fileTitle: z
      .string()
      .describe(
        'A suggested title for the Obsidian Note. Ensure that it is in the proper format for a file on mac, windows and linux, do not include any special characters',
      ),
  };

  activeNoteTemplate.sections.forEach((section) => {
    const { sectionHeader, sectionInstructions, isSectionOptional } = section;
    schema[convertToSafeJsonKey(sectionHeader)] = isSectionOptional
      ? z.string().nullish().describe(sectionInstructions)
      : z.string().describe(sectionInstructions);
  });

  const structuredOutput = z.object(schema);
  const structuredLlm = model.withStructuredOutput(structuredOutput);
  const result = (await structuredLlm.invoke(messages)) as Record<
    string,
    string
  > & { fileTitle: string };

  return await result;
}

export async function llmFixMermaidChart(
  openAiKey: string,
  brokenMermaidChart: string,
  llmModel: LLM_MODELS = LLM_MODELS['gpt-4o'],
  customBaseUrl?: string,
  customChatModel?: string,
) {
  const systemPrompt = `
You are an expert in mermaid mindmaps and Obsidian (the note taking app)
Below is a <broken-mermaid-mindmap> that isn't rendering correctly in Obsidian
There may be some new line characters, or tab characters, or special characters.  
Strip them out and only return a fully valid unicode Mermaid mindmap that will render properly in Obsidian
Remove any special characters in the nodes text that isn't valid.

<broken-mermaid-mindmap>
${brokenMermaidChart}
</broken-mermaid-mindmap>

Thank you
  `;
  const modelToUse = customChatModel || llmModel;
  const model = new ChatOpenAI({
    model: modelToUse,
    apiKey: openAiKey,
    temperature: 0.3,
    ...(customBaseUrl && { configuration: { baseURL: customBaseUrl } }),
  });
  const messages = [new SystemMessage(systemPrompt)];
  const structuredOutput = z.object({
    mermaidChart: z
      .string()
      .describe('A fully valid unicode mermaid mindmap diagram'),
  });

  const structuredLlm = model.withStructuredOutput(structuredOutput);
  const { mermaidChart } = await structuredLlm.invoke(messages);

  return { mermaidChart };
}
