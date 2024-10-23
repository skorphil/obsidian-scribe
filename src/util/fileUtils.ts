import { moment, normalizePath, TFile } from 'obsidian';

import type ScribePlugin from 'src';

export async function saveAudioRecording(
  recordingBuffer: ArrayBuffer,
  plugin: ScribePlugin,
) {
  const now = moment();

  const fileName = `recording-${now.format('YYYY-MM-DD.HH.mm')}`;
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

  const fileName = `scribe-${now.format('YYYY-MM-DD.HH.mm')}`;
  const pathToSave = plugin.settings.transcriptDirectory;
  const fullPath = `${pathToSave}/${fileName}.md`;

  const notePath = normalizePath(fullPath);

  try {
    const savedFile = await plugin.app.vault.create(notePath, transcript);

    return savedFile;
  } catch (error) {
    console.error('Failed to save file', error);
  }
}
