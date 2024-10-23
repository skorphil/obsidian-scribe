import { Notice, Plugin, moment } from 'obsidian';
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
import { handleAudioTranscription, initOpenAiClient } from './util/openAiUtils';

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
    });
  }

  onunload() {}

  async loadSettings() {
    const savedUserData: ScribePluginSettings = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...savedUserData };

    const defaultPathSettings = await getDefaultPathSettings(this);

    if (this.settings.openAiApiKey) {
      this.state.openAiClient = initOpenAiClient(this.settings.openAiApiKey);
    }

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
    console.log('start Recording:', this.state.audioRecord);
    const newRecording = new AudioRecord();
    this.state.audioRecord = newRecording;

    newRecording.startRecording();
  }

  async stopRecording() {
    if (!this.state.audioRecord) {
      console.error(
        'Stop recording fired without an audioRecord, we are in a weird state',
      );
      return;
    }
    console.log('Stop Recording', this.state.audioRecord);

    const { recordingBuffer, recordingFile } =
      await this.handleAudioRecordingSave(this.state.audioRecord);
    if (this.state.openAiClient) {
      const transcript = await handleAudioTranscription(
        this.state.openAiClient,
        recordingBuffer,
      );

      await saveNoteWithTranscript(this, transcript, recordingFile);
    }

    this.state.audioRecord = null;
  }

  private async handleAudioRecordingSave(audioRecord: AudioRecord) {
    const recordingBlob = await audioRecord.stopRecording();
    const recordingBuffer = await recordingBlob.arrayBuffer();

    const recordingFile = await saveAudioRecording(recordingBuffer, this);
    return { recordingFile, recordingBuffer };
  }
}
