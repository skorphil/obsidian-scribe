import { Menu, Notice } from 'obsidian';
import type ScribePlugin from 'src';
import { ScribeControlsModal } from 'src/modal/scribeControlsModal';

export function handleRibbon(plugin: ScribePlugin) {
  // This creates an icon in the left ribbon.
  const ribbonIconEl = plugin.addRibbonIcon(
    'mic-vocal',
    'Scribe',
    (evt: MouseEvent) => {
      scribeDropDownMenu(plugin).showAtMouseEvent(evt);
    },
  );
  // Perform additional things with the ribbon
  ribbonIconEl.addClass('scribe-plugin-ribbon');

  // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
  const statusBarItemEl = plugin.addStatusBarItem();
  statusBarItemEl.setText('Status Bar Text');
}

function scribeDropDownMenu(plugin: ScribePlugin): Menu {
  const menu = new Menu();

  menu.addItem((item) => {
    item.setIcon('disk-2');
    item.setTitle('🕹️ Open Controls');
    item.onClick(() => {
      plugin.state.isOpen = true;
      plugin.controlModal.open();
    });
  });

  if (plugin.state.audioRecord?.mediaRecorder?.state === 'recording') {
    menu.addItem((item) => {
      item.setIcon('mic-vocal');
      item.setTitle('🛑🎙️ Stop Recording');
      item.onClick(() => {
        plugin.scribe();
      });
    });
  } else {
    menu.addItem((item) => {
      item.setTitle('🎙️ Start Recording');
      item.setIcon('mic-vocal');
      item.onClick(() => {
        plugin.startRecording();
      });
    });
  }

  return menu;
}
