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

    console.log('this.settings', this.settings);
    const defaultPathSettings = await getDefaultPathSettings(this);
    console.log('defaultPathSettings:', defaultPathSettings);

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
