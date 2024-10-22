import { type Editor, MarkdownView } from 'obsidian';
import type ScribePlugin from 'src';
import { SampleModal } from 'src/modal/modal';

export function handleCommands(plugin: ScribePlugin) {
  // This adds a simple command that can be triggered anywhere
  plugin.addCommand({
    id: 'open-sample-modal-simple',
    name: 'Open sample modal (simple)',
    callback: () => {
      plugin.state.isOpen = true;
      new SampleModal(plugin).open();
    },
  });
  // This adds an editor command that can perform some operation on the current editor instance
  plugin.addCommand({
    id: 'sample-editor-command',
    name: 'Sample editor command',
    editorCallback: (editor: Editor, view: MarkdownView) => {
      console.log(editor.getSelection());
      editor.replaceSelection('Sample Editor Command');
    },
  });
  // This adds a complex command that can check whether the current state of the app allows execution of the command
  plugin.addCommand({
    id: 'open-sample-modal-complex',
    name: 'Open sample modal (complex)',
    checkCallback: (checking: boolean) => {
      console.log(checking);
      // Conditions to check
      const markdownView =
        plugin.app.workspace.getActiveViewOfType(MarkdownView);
      if (markdownView) {
        // If checking is true, we're simply "checking" if the command can be run.
        // If checking is false, then we want to actually perform the operation.
        if (!checking) {
          new SampleModal(plugin).open();
        }

        // This command will only show up in Command Palette when the check function returns true
        return true;
      }
    },
  });
}
