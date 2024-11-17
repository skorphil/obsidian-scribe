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
  const [recordingDuration, setRecordingDuration] = useState(0);

  useEffect(() => {
    let interval: number | undefined = undefined;

    if (isActive && isPaused === false) {
      interval = window.setInterval(() => {
        setRecordingDuration((recordingDuration) => recordingDuration + 10);
      }, 10);
    } else {
      interval && window.clearInterval(interval as number);
    }
    return () => {
      interval && window.clearInterval(interval as number);
    };
  }, [isActive, isPaused]);

  const handleStart = () => {
    plugin.startRecording();
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
    await plugin.scribe();
    setIsPaused(false);
    setIsActive(false);
    setIsScribing(false);
  };

  const handleReset = () => {
    plugin.cancelRecording();
    setIsActive(false);
    setRecordingDuration(0);
  };

  return (
    <div className="scribe-modal-container">
      <ModalRecordingTimer time={recordingDuration} />
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
