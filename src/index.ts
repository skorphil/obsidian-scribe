import { Notice, Plugin, type TFile } from 'obsidian';
import {
  DEFAULT_SETTINGS,
  handleSettingsTab,
  type ScribePluginSettings,
} from './settings/settings';
import { handleRibbon } from './ribbon/ribbon';
import { handleCommands } from './commands/commands';
import { getDefaultPathSettings } from './util/pathUtils';
import { AudioRecord } from './audioRecord/audioRecord';
import { saveAudioRecording, saveNoteWithTranscript } from './util/fileUtils';
import type OpenAI from 'openai';
import {
  chunkAndTranscribeAudioBuffer,
  summarizeTranscript,
  type LLMSummary,
} from './util/openAiUtils';
import { ScribeControlsModal } from './modal/scribeControlsModal';

interface ScribeState {
  isOpen: boolean;
  counter: number;
  isRecording: boolean;
  audioRecord: AudioRecord | null;
  openAiClient: OpenAI | null;
}

const DEFAULT_STATE: ScribeState = {
  isOpen: false,
  counter: 0,
  isRecording: false,
  audioRecord: null,
  openAiClient: null,
};

export default class ScribePlugin extends Plugin {
  settings: ScribePluginSettings = DEFAULT_SETTINGS;
  state: ScribeState = DEFAULT_STATE;
  controlModal: ScribeControlsModal;

  async onload() {
    console.log(`Reloaded Scribe: ${new Date().toDateString()}`);

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

  async scribe() {
    const { recordingBuffer, recordingFile } =
      await this.stopAndSaveRecording();
    const transcript = await this.handleAudioTranscription(recordingBuffer);
    const llmSummary = await this.handleTranscriptSummary(transcript);

    await this.handleFinalNoteCreation(
      { transcript, llmSummary },
      recordingFile,
    );

    this.controlModal.close();

    this.state.audioRecord = null;
  }

  async stopAndSaveRecording() {
    const audioRecord = this.state.audioRecord as AudioRecord;

    const audioBlob = await audioRecord.stopRecording();
    const recordingBuffer = await audioBlob.arrayBuffer();

    const recordingFile = await saveAudioRecording(this, recordingBuffer);
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

  private async handleFinalNoteCreation(
    rawTextForNote: {
      transcript: string;
      llmSummary: LLMSummary;
    },
    recordingFile: TFile,
  ) {
    const noteWithTranscript = await saveNoteWithTranscript(
      this,
      rawTextForNote,
      recordingFile,
    );

    if (noteWithTranscript) {
      const currentPath = this.app.workspace.getActiveFile()?.path ?? '';
      this.app.workspace.openLinkText(
        noteWithTranscript?.path,
        currentPath,
        true,
      );
    }
  }
}
