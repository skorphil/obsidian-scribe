import { createRoot, type Root } from 'react-dom/client';
import { Modal } from 'obsidian';
import type ScribePlugin from 'src';
import { useEffect, useState } from 'react';
import { ModalSettings } from './components/ModalSettings';
import { ModalRecordingTimer } from './components/ModalRecordingTimer';
import { ModalRecordingButtons } from './components/ModalRecordingButtons';

export class ScribeControlsModal extends Modal {
  plugin: ScribePlugin;
  root: Root | null;

  constructor(plugin: ScribePlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  async onOpen() {
    this.plugin.state.isOpen = true;
    this.initModal();
  }

  async onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.plugin.state.isOpen = false;
    this.plugin.cancelRecording();
    this.root?.unmount();
  }

  initModal() {
    const { contentEl } = this;
    this.modalEl.addClass('scribe-modal');
    contentEl.innerHTML = '';

    const reactTestWrapper = contentEl.createDiv({
      cls: 'scribe-controls-modal-react',
    });

    this.root = createRoot(reactTestWrapper);
    this.root.render(<ScribeModal plugin={this.plugin} />);
  }
}

const ScribeModal: React.FC<{ plugin: ScribePlugin }> = ({ plugin }) => {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isScribing, setIsScribing] = useState(false);
  const [recordingStartTimeMs, setRecordingStartTimeMs] = useState<
    number | null
  >(null);

  const handleStart = () => {
    plugin.startRecording();
    setRecordingStartTimeMs(Date.now());
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    plugin.state.audioRecord?.pauseRecording();
  };

  const handleComplete = async () => {
    setIsPaused(true);
    setIsScribing(true);
    setRecordingStartTimeMs(null);
    await plugin.scribe();
    setIsPaused(false);
    setIsActive(false);
    setIsScribing(false);
  };

  const handleReset = () => {
    plugin.cancelRecording();
    setIsActive(false);
    setRecordingStartTimeMs(null);
  };

  return (
    <div className="scribe-modal-container">
      <ModalRecordingTimer startTimeMs={recordingStartTimeMs} />
      <ModalRecordingButtons
        active={isActive}
        isPaused={isPaused}
        isScribing={isScribing}
        handleStart={handleStart}
        handlePauseResume={handlePauseResume}
        handleComplete={handleComplete}
        handleReset={handleReset}
      />

      <hr />
      <ModalSettings plugin={plugin} />
    </div>
  );
};
