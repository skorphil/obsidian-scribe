import type ScribePlugin from 'src';
import { ScribeControlsModal } from 'src/modal/scribeControlsModal';

/**
 * I then want a command for each component when a file is open
 * Scribe Transcribe + Summarize (Whole thing, but in that file)
 * Create Transcript
 * Create Summary
 */
export function handleCommands(plugin: ScribePlugin) {
  // This adds a simple command that can be triggered anywhere
  plugin.addCommand({
    id: 'scribe-recording-modal',
    name: 'Begin Recording',
    callback: () => {
      plugin.state.isOpen = true;
      new ScribeControlsModal(plugin).open();
    },
  });
  plugin.addCommand({
    id: 'scribe-transcribe-summarize',
    name: 'Transcribe & Summarize Current File',
    callback: async () => {
      const activeFile = plugin.app.workspace.getActiveFile();
      if (activeFile) {
        plugin.scribeExistingFile(activeFile);
      }
    },
  });
  plugin.addCommand({
    id: 'scribe-fix-mermaid-chart',
    name: 'Fix Mermaid Chart',
    callback: () => {
      const activeFile = plugin.app.workspace.getActiveFile();
      if (activeFile) {
        plugin.fixMermaidChart(activeFile);
      }
    },
  });
}
