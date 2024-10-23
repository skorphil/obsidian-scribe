import { Notice } from 'obsidian';
import type ScribePlugin from 'src';
import { ScribeControlsModal } from 'src/modal/scribeControlsModal';

export function handleRibbon(plugin: ScribePlugin) {
  // This creates an icon in the left ribbon.
  const ribbonIconEl = plugin.addRibbonIcon(
    'mic-vocal',
    'Scribe',
    (evt: MouseEvent) => {
      plugin.state.isOpen = true;
      new ScribeControlsModal(plugin).open();
    },
  );
  // Perform additional things with the ribbon
  ribbonIconEl.addClass('my-plugin-ribbon-class');

  // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
  const statusBarItemEl = plugin.addStatusBarItem();
  statusBarItemEl.setText('Status Bar Text');
}
