import { type App, PluginSettingTab, Setting } from 'obsidian';
import type ScribePlugin from 'src';
import { LLM_MODELS } from 'src/util/openAiUtils';

export interface ScribePluginSettings {
  openAiApiKey: string;
  recordingDirectory: string;
  transcriptDirectory: string;
  llmModel: LLM_MODELS;
}

export const DEFAULT_SETTINGS: ScribePluginSettings = {
  openAiApiKey: '',
  recordingDirectory: '',
  transcriptDirectory: '',
  llmModel: LLM_MODELS['gpt-4o'],
};

export async function handleSettingsTab(plugin: ScribePlugin) {
  plugin.addSettingTab(new ScribeSettingsTab(plugin.app, plugin));
}

export class ScribeSettingsTab extends PluginSettingTab {
  plugin: ScribePlugin;

  constructor(app: App, plugin: ScribePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Open AI Api Key')
      .setDesc(
        'You can find this in your OpenAI Dev Console - https://platform.openai.com/settings',
      )
      .addText((text) =>
        text
          .setPlaceholder('sk-....')
          .setValue(this.plugin.settings.openAiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openAiApiKey = value;
            await this.plugin.saveSettings();
          }),
      );

    const foldersInVault = this.plugin.app.vault.getAllFolders();

    new Setting(containerEl)
      .setName('Directory for recordings')
      .setDesc('Defaults to your resources folder')
      .addDropdown((component) => {
        for (const folder of foldersInVault) {
          component.addOption(folder.path, folder.path);
        }
        component.setValue(this.plugin.settings.recordingDirectory);
        component.onChange(async (value) => {
          console.log('onChange value', value);
          this.plugin.settings.recordingDirectory = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Directory for transcripts')
      .setDesc('Defaults to your new note folder')
      .addDropdown((component) => {
        for (const folder of foldersInVault) {
          component.addOption(folder.path, folder.path);
        }
        component.setValue(this.plugin.settings.transcriptDirectory);
        component.onChange(async (value) => {
          console.log('onChange value:', value);
          this.plugin.settings.transcriptDirectory = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('LLM Model for creating the Summary')
      .addDropdown((component) => {
        for (const model of Object.keys(LLM_MODELS)) {
          component.addOption(model, model);
        }
        component.setValue(this.plugin.settings.llmModel);
        component.onChange(async (value: LLM_MODELS) => {
          console.log('onChange value:', value);
          this.plugin.settings.llmModel = value;
          await this.plugin.saveSettings();
        });
      });
  }
}
