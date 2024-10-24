import { moment, normalizePath, type TFile } from 'obsidian';

import type ScribePlugin from 'src';
import type { LLMSummary } from './openAiUtils';

export async function saveAudioRecording(
  recordingBuffer: ArrayBuffer,
  plugin: ScribePlugin,
) {
  const now = moment();

  const fileName = `recording-${now.format('YYYY-MM-DD.HH.mm.ss')}`;
  const pathToSave = plugin.settings.recordingDirectory;
  const fullPath = `${pathToSave}/${fileName}.${plugin.state.audioRecord?.fileExtension}`;
  console.log('Saving file to: ', fullPath);

  try {
    const savedFile = await plugin.app.vault.createBinary(
      fullPath,
      recordingBuffer,
    );
    return savedFile;
  } catch (error) {
    console.error(`Failed to save file in: ${fullPath}`, error);
    throw error;
  }
}

export async function saveNoteWithTranscript(
  plugin: ScribePlugin,
  rawTextForNote: {
    transcript: string;
    llmSummary: LLMSummary;
  },
  audioFile: TFile,
) {
  const now = moment();
  const { transcript, llmSummary } = rawTextForNote;
  const { summary, title, insights, mermaidChart } = llmSummary;

  const formattedTitle = formatForFilename(title);
  const fileName = `scribe-${formattedTitle}-${now.format('YYYY-MM-DD.HH.mm.ss')}`;
  const pathToSave = plugin.settings.transcriptDirectory;
  const fullPath = `${pathToSave}/${fileName}.md`;

  const notePath = normalizePath(fullPath);

  const noteContent = `![[${audioFile.path}]]
# Scribe
## Summary
${summary}

## Insights
${insights}

## Mermaid Chart
\`\`\`mermaid
${mermaidChart}
\`\`\`

# Transcript
${transcript}
  `;

  try {
    const savedFile = await plugin.app.vault.create(notePath, noteContent);
    plugin.app.fileManager.processFrontMatter(savedFile, (frontMatter) => {
      frontMatter.source = `[[${audioFile.path}]]`;
    });

    return savedFile;
  } catch (error) {
    console.error('Failed to save file', error);
  }
}

function formatForFilename(input: string): string {
  // Remove problematic characters
  const safeString = input
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    // Optional: Replace spaces with underscores or another preferred character
    .replace(/\s+/g, '_')
    // Avoid trailing periods or spaces which Windows does not like
    .replace(/\.*\s*$/, '');

  // Truncate to 255 characters to ensure compatibility
  // This limit is chosen based on common filesystem limits
  const maxLength = 255;
  const truncatedString =
    safeString.length > maxLength
      ? safeString.substring(0, maxLength)
      : safeString;

  return truncatedString;
}

// Example usage:
const originalString = 'Example: Filename?*<>|"/\\.';
const safeFilename = formatForFilename(originalString);
console.log(safeFilename); // Output: "Example_Filename"
