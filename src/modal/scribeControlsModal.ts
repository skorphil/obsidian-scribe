import { clearInterval, setInterval } from 'timers';
import { Modal, Notice } from 'obsidian';
import type ScribePlugin from 'src';

export class ScribeControlsModal extends Modal {
  plugin: ScribePlugin;
  private startTime: number;
  private stopwatchInterval: NodeJS.Timer;
  private elapsedTime: number;

  constructor(plugin: ScribePlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onOpen() {
    console.log('Plugin State from Modal:', this.plugin.state);
    this.plugin.state.isOpen = true;
    this.initModal();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.plugin.state.isOpen = false;
    this.plugin.state.isRecording = false;
    this.handleStopwatch(contentEl, false);
  }

  initModal() {
    console.log('init modal');
    const { contentEl } = this;
    contentEl.innerHTML = '';

    const controlGroupWrapper = contentEl.createDiv({
      cls: 'scribe-controls-modal-wrapper',
    });

    const infoGroup = controlGroupWrapper.createDiv({
      cls: 'scribe-controls-modal-info-group',
    });

    const counterText = infoGroup.createEl('span', {
      cls: 'scribe-modal-info-counter-span',
    });
    counterText.setText('Counter: 00:00');

    const controlGroup = controlGroupWrapper.createDiv({
      cls: 'scribe-controls-modal-control-group',
    });

    const deleteButton = controlGroup.createEl('button');
    deleteButton.setText('Delete');

    const recordButton = controlGroup.createEl('button', {
      cls: 'scribe-control-record-btn',
    });
    recordButton.setText('Record');

    recordButton.addEventListener('click', async () => {
      const updatedRecordingState = !this.plugin.state.isRecording;
      this.updateRecordingState(contentEl, updatedRecordingState);
      this.handleStopwatch(contentEl, updatedRecordingState);
      this.handleRecording(updatedRecordingState);
    });

    deleteButton.addEventListener('click', async () => {
      new Notice('Scribe: Recording Deleted');
      this.close();
    });
  }

  updateRecordingState(container: HTMLElement, isRecording: boolean) {
    this.plugin.state.isRecording = isRecording;
    const recordBtnEl = container.find('.scribe-control-record-btn');
    if (isRecording) {
      new Notice('Scribe: Recording Started');
      recordBtnEl.setText('Save');
    } else {
      recordBtnEl.setText('Record');
      new Notice('Scribe: Recording Saved');
    }
  }

  handleStopwatch(container: HTMLElement, isRecording: boolean) {
    if (isRecording) {
      this.startStopwatch(container);
    } else {
      this.stopStopwatch();
    }
  }

  handleRecording(isRecording: boolean) {
    if (isRecording) {
      this.plugin.startRecording();
    } else {
      this.plugin.stopRecording();
    }
  }

  startStopwatch(container: HTMLElement) {
    const counterText = container.find('.scribe-modal-info-counter-span');
    this.startTime = Date.now();
    console.log('start stopwatch');
    this.stopwatchInterval = setInterval(() => {
      console.log('interval');
      this.elapsedTime = Date.now() - this.startTime;
      counterText.setText(`Counter: ${formatTime(this.elapsedTime)}`);
    }, 1000);
  }

  stopStopwatch() {
    clearInterval(this.stopwatchInterval);
  }
}

function formatTime(milliseconds: number): string {
  let seconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(seconds / 60);

  seconds = seconds % 60;
  minutes = minutes % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(minutes)}:${pad(seconds)}`;
}
