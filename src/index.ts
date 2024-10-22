import { Plugin } from 'obsidian';
import {
  DEFAULT_SETTINGS,
  handleSettingsTab,
  type ScribePluginSettings,
} from './settings/settings';
import { handleRibbon } from './ribbon/ribbon';
import { handleCommands } from './commands/commands';
import { getDefaultPathSettings } from './util/pathUtils';

interface ScribeState {
  isOpen: boolean;
  counter: number;
}

const DEFAULT_STATE: ScribeState = {
  isOpen: false,
  counter: 0,
};

export default class ScribePlugin extends Plugin {
  settings: ScribePluginSettings = DEFAULT_SETTINGS;
  state: ScribeState = DEFAULT_STATE;

  async onload() {
    console.log(`Reloaded: ${new Date().toDateString()}`);

    await this.loadSettings();

    handleRibbon(this);
    handleCommands(this);
    handleSettingsTab(this);
  }

  onunload() {}

  async loadSettings() {
    const savedUserData: ScribePluginSettings = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...savedUserData };

    console.log('this.settings', this.settings);
    const defaultPathSettings = await getDefaultPathSettings(this);
    console.log('defaultPathSettings', defaultPathSettings);

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
}
