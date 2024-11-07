import { Notice, Plugin, type TFile, moment } from 'obsidian';
import type OpenAI from 'openai';
import {
  DEFAULT_SETTINGS,
  handleSettingsTab,
  type ScribePluginSettings,
} from './settings/settings';
import { handleRibbon } from './ribbon/ribbon';
import { handleCommands } from './commands/commands';
import { getDefaultPathSettings } from './util/pathUtils';
import { AudioRecord } from './audioRecord/audioRecord';
import {
  addAudioSourceToFrontmatter,
  addSummaryToNote,
  addTranscriptToNote,
  createBaseFileName,
  createNewNote,
  formatForFilename,
  renameFile,
  saveAudioRecording,
} from './util/fileUtils';
import {
  chunkAndTranscribeAudioBuffer,
  llmFixMermaidChart,
  summarizeTranscript,
  type LLMSummary,
} from './util/openAiUtils';
import { ScribeControlsModal } from './modal/scribeControlsModal';
import {
  mimeTypeToFileExtension,
  type SupportedMimeType,
} from './util/mimeType';
import { extractMermaidChart } from './util/textUtil';

interface ScribeState {
  isOpen: boolean;
  counter: number;
  audioRecord: AudioRecord | null;
  openAiClient: OpenAI | null;
}

const DEFAULT_STATE: ScribeState = {
  isOpen: false,
  counter: 0,
  audioRecord: null,
  openAiClient: null,
};

export default class ScribePlugin extends Plugin {
  settings: ScribePluginSettings = DEFAULT_SETTINGS;
  state: ScribeState = DEFAULT_STATE;
  controlModal: ScribeControlsModal;

  async onload() {
    /**
     * Ensures that Obsidian is fully bootstrapped before plugging in.
     * Helps with load time
     * Ensures that when we get the default folders for settings, they are available
     * https://docs.obsidian.md/Plugins/Guides/Optimizing+plugin+load+time#Listening+to+%60vault.on('create')%60
     */
    this.app.workspace.onLayoutReady(async () => {
      await this.loadSettings();
      handleRibbon(this);
      handleCommands(this);
      handleSettingsTab(this);
      this.controlModal = new ScribeControlsModal(this);
    });
  }

  onunload() {}

  async loadSettings() {
    const savedUserData: ScribePluginSettings = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...savedUserData };

    const defaultPathSettings = await getDefaultPathSettings(this);

    if (!this.settings.openAiApiKey) {
      console.error(
        'OpenAI Api key is needed in Scribes settings - https://platform.openai.com/settings',
      );
      new Notice('⚠️ Scribe: OpenAI Api key is missing in Scribes settings');
    }

    if (!this.settings.recordingDirectory) {
      this.settings.recordingDirectory =
        defaultPathSettings.defaultNewResourcePath;
    }
    if (!this.settings.transcriptDirectory) {
      this.settings.transcriptDirectory =
        defaultPathSettings.defaultNewFilePath;
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async startRecording() {
    new Notice('Scribe: 🎙️ Recording Started');
    const newRecording = new AudioRecord();
    this.state.audioRecord = newRecording;

    newRecording.startRecording();
  }

  async cancelRecording() {
    if (this.state.audioRecord?.mediaRecorder) {
      new Notice('Scribe: 🛑️ Recording Cancelled');
      await this.state.audioRecord?.stopRecording();
    }
  }

  async scribe() {
    try {
      const baseFileName = createBaseFileName();

      const { recordingBuffer, recordingFile } =
        await this.handleStopAndSaveRecording(baseFileName);

      const scribeNoteFilename = `scribe-${baseFileName}`;
      const note = await createNewNote(this, scribeNoteFilename);
      await addAudioSourceToFrontmatter(this, note, recordingFile);

      const currentPath = this.app.workspace.getActiveFile()?.path ?? '';
      this.app.workspace.openLinkText(note?.path, currentPath, true);

      const transcript = await this.handleAudioTranscription(recordingBuffer);
      await addTranscriptToNote(this, note, transcript);

      const llmSummary = await this.handleTranscriptSummary(transcript);
      await addSummaryToNote(this, note, llmSummary);

      const llmFileName = `scribe-${moment().format('YYYY-MM-DD')}-${formatForFilename(llmSummary.title)}`;
      await renameFile(this, note, llmFileName);
    } catch (error) {
      new Notice(`Scribe: Something went wrong ${error.toString()}`);
    }

    this.cleanup();
  }

  async scribeExistingFile(audioFile: TFile) {
    try {
      if (
        !mimeTypeToFileExtension(
          `audio/${audioFile.extension}` as SupportedMimeType,
        )
      ) {
        new Notice('Scribe: ⚠️ This File type is not supported');
        return;
      }

      const audioFileBuffer = await this.app.vault.readBinary(audioFile);

      const baseFileName = createBaseFileName();
      const scribeNoteFilename = `scribe-${baseFileName}`;

      const note = await createNewNote(this, scribeNoteFilename);
      await addAudioSourceToFrontmatter(this, note, audioFile);

      const currentPath = this.app.workspace.getActiveFile()?.path ?? '';
      this.app.workspace.openLinkText(note?.path, currentPath, true);

      const transcript = await this.handleAudioTranscription(audioFileBuffer);
      await addTranscriptToNote(this, note, transcript);

      const llmSummary = await this.handleTranscriptSummary(transcript);
      await addSummaryToNote(this, note, llmSummary);

      const llmFileName = `scribe-test-${moment().format('YYYY-MM-DD')}-${formatForFilename(llmSummary.title)}`;
      await renameFile(this, note, llmFileName);
    } catch (error) {
      new Notice(`Scribe: Something went wrong ${error.toString()}`);
    }

    this.cleanup();
  }

  async handleStopAndSaveRecording(baseFileName: string) {
    const audioRecord = this.state.audioRecord as AudioRecord;

    const audioBlob = await audioRecord.stopRecording();
    const recordingBuffer = await audioBlob.arrayBuffer();

    const recordingFile = await saveAudioRecording(
      this,
      recordingBuffer,
      baseFileName,
    );
    new Notice(`Scribe: ✅ Audio File saved ${recordingFile.name}`);

    return { recordingBuffer, recordingFile };
  }

  async handleAudioTranscription(audioBuffer: ArrayBuffer) {
    new Notice('Scribe: 🎧 Beginning Transcription');
    const transcript = await chunkAndTranscribeAudioBuffer(
      this.settings.openAiApiKey,
      audioBuffer,
    );
    new Notice('Scribe: 🎧 Transcription Complete');

    return transcript;
  }

  async handleTranscriptSummary(transcript: string) {
    new Notice('Scribe: 🧠 Sending to LLM to Summarize');
    const llmSummary = await summarizeTranscript(
      this.settings.openAiApiKey,
      transcript,
      this.settings.llmModel,
    );
    new Notice('Scribe: 🧠 LLM Summation complete');

    return llmSummary;
  }

  async fixMermaidChart(file: TFile) {
    try {
      let brokenMermaidChart: string | undefined;
      await this.app.vault.process(file, (data) => {
        console.log(data);
        brokenMermaidChart = extractMermaidChart(data);
        return data;
      });

      let fixedMermaidChart: string | undefined;
      if (brokenMermaidChart) {
        fixedMermaidChart = (
          await llmFixMermaidChart(
            this.settings.openAiApiKey,
            brokenMermaidChart,
          )
        ).mermaidChart;

        console.log(fixedMermaidChart);
      }

      if (brokenMermaidChart && fixedMermaidChart) {
        await this.app.vault.process(file, (data) => {
          console.log(data);
          brokenMermaidChart = extractMermaidChart(data);

          return data.replace(
            brokenMermaidChart as string,
            `${fixedMermaidChart}
`,
          );
        });
      }
    } catch (error) {
      new Notice(`Scribe: Something went wrong ${error.toString()}`);
    }
  }

  cleanup() {
    this.controlModal.close();
    this.state.audioRecord = null;
  }
}
