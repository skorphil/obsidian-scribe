import { Plugin } from 'obsidian';
import { handleSettingsTab } from './settings/settings';
import { handleRibbon } from './ribbon/ribbon';
import { handleCommands } from './commands/commands';

interface ScribeState {
  isOpen: boolean;
  counter: number;
}

interface ScribePluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: ScribePluginSettings = {
  mySetting: 'default',
};

const DEFAULT_STATE: ScribeState = {
  isOpen: false,
  counter: 0,
};

export default class ScribePlugin extends Plugin {
  settings: ScribePluginSettings;
  state: ScribeState = DEFAULT_STATE;

  async onload() {
    console.log(`Reloaded!: ${new Date().toDateString()}`);

    await this.loadSettings();

    handleRibbon(this);
    handleCommands(this);
    handleSettingsTab(this);

    // This adds a settings tab so the user can configure various aspects of the plugin
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
