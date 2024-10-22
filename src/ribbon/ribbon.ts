import { Notice } from 'obsidian';
import type ScribePlugin from 'src';

export function handleRibbon(plugin: ScribePlugin) {
  // This creates an icon in the left ribbon.
  const ribbonIconEl = plugin.addRibbonIcon(
    'dice',
    'Sample Plugin',
    (evt: MouseEvent) => {
      // Called when the user clicks the icon.
      new Notice('This is a notice!');
    },
  );
  // Perform additional things with the ribbon
  ribbonIconEl.addClass('my-plugin-ribbon-class');

  // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
  const statusBarItemEl = plugin.addStatusBarItem();
  statusBarItemEl.setText('Status Bar Text');
}
