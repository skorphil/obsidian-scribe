import { moment, normalizePath, type TFile } from 'obsidian';

import type ScribePlugin from 'src';

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
  transcript: string,
  audioFile: TFile,
) {
  const now = moment();

  const fileName = `scribe-${now.format('YYYY-MM-DD.HH.mm.ss')}`;
  const pathToSave = plugin.settings.transcriptDirectory;
  const fullPath = `${pathToSave}/${fileName}.md`;

  const notePath = normalizePath(fullPath);

  const noteContent = `![[${audioFile.path}]]

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
