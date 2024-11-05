import { Modal, Notice, setIcon } from 'obsidian';
import type ScribePlugin from 'src';

/**
 * Essentially what I want is the following
 * Save the AudioFile - Display it's location
 * Begin Transcript - Show Status (Idle, In Progress, Done)
 * Create Note - File + Transcript - Display Location
 * Create LLM Summary - Show Status (Idle, In Progress, Done)
 * Rename File based on output
 * Open file
 */

export class ScribeControlsModal extends Modal {
  plugin: ScribePlugin;
  private startTime: number;
  private stopwatchInterval: number;
  private elapsedTime: number;

  constructor(plugin: ScribePlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onOpen() {
    this.plugin.state.isOpen = true;
    this.initModal();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();

    if (this.plugin.state.isRecording) {
      new Notice('Scribe: 🛑 Recording Cancelled');
      this.plugin.state.audioRecord?.stopRecording();
    }
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
    counterText.setText('00:00');

    const controlGroup = controlGroupWrapper.createDiv({
      cls: 'scribe-controls-modal-control-group',
    });
    const cancelButtonWrapper = controlGroup.createEl('div', {
      cls: 'scribe-control-cancel-btn-wrapper',
    });
    const recordButton = controlGroup.createEl('button', {
      cls: 'scribe-control-record-btn',
    });
    setIcon(recordButton, 'mic-vocal');

    recordButton.addEventListener('click', async () => {
      const updatedRecordingState = !this.plugin.state.isRecording;
      this.updateRecordingState(contentEl, updatedRecordingState);
      this.handleStopwatch(contentEl, updatedRecordingState);
      this.handleRecording(updatedRecordingState);
      this.updateRender(contentEl, updatedRecordingState);
    });

    this.updateRender(contentEl, this.plugin.state.isRecording);
  }

  updateRender(container: HTMLElement, isRecording: boolean) {
    const controlGroup = container.find('.scribe-controls-modal-control-group');
    const cancelBtnWrapper = controlGroup.find(
      '.scribe-control-cancel-btn-wrapper',
    );
    if (isRecording) {
      const cancelBtn = cancelBtnWrapper.createEl('button', {
        cls: 'scribe-control-cancel-btn',
      });
      cancelBtn.addEventListener('click', async () => {
        this.close();
      });

      cancelBtn.setText('Cancel');
      setIcon(cancelBtn, 'trash-2');
    } else {
      cancelBtnWrapper.empty();
    }
  }

  updateRecordingState(container: HTMLElement, isRecording: boolean) {
    this.plugin.state.isRecording = isRecording;
    const recordBtnEl = container.find('.scribe-control-record-btn');
    if (isRecording) {
      setIcon(recordBtnEl, 'circle-stop');
    } else {
      setIcon(recordBtnEl, 'mic-vocal');
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
      this.plugin.scribe();
    }
  }

  startStopwatch(container: HTMLElement) {
    const counterText = container.find('.scribe-modal-info-counter-span');
    this.startTime = Date.now();
    console.log('start stopwatch');
    this.stopwatchInterval = window.setInterval(() => {
      console.log('interval');
      this.elapsedTime = Date.now() - this.startTime;
      counterText.setText(`${formatTime(this.elapsedTime)}`);
    }, 1000);
  }

  stopStopwatch() {
    window.clearInterval(this.stopwatchInterval);
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
