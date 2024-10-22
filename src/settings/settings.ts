import { type App, PluginSettingTab, Setting } from 'obsidian';
import type ScribePlugin from 'src';

export async function handleSettingsTab(plugin: ScribePlugin) {
  plugin.addSettingTab(new SampleSettingTab(plugin.app, plugin));
}

export class SampleSettingTab extends PluginSettingTab {
  plugin: ScribePlugin;

  constructor(app: App, plugin: ScribePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Setting #1')
      .setDesc("It's a secret")
      .addText((text) =>
        text
          .setPlaceholder('Enter your secret')
          .setValue(this.plugin.settings.mySetting)
          .onChange(async (value) => {
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
