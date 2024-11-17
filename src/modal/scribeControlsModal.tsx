import { createRoot, type Root } from 'react-dom/client';
import { Modal, Notice, setIcon } from 'obsidian';
import type ScribePlugin from 'src';
import { useEffect, useState } from 'react';
import { MicVocal, SaveIcon, TrashIcon } from './icons/icons';

function RecordingTimer({ time }: { time: number }) {
  const millis = `0${(time / 10) % 100}`.slice(-2);
  const seconds = `0${Math.floor((time / 1000) % 60)}`.slice(-2);
  const minutes = `0${Math.floor((time / 60000) % 60)}`.slice(-2);

  return (
    <div className="scribe-timer">
      <span className="scribe-timer-digits">{minutes}:</span>
      <span className="scribe-timer-digits">{seconds}.</span>
      <span className="scribe-timer-digits scribe-timer-millis">{millis}</span>
    </div>
  );
}

function ControlButtons({
  active,
  isPaused,
  isScribing,
  handleStart,
  handlePauseResume,
  handleReset,
  handleComplete,
}: {
  active: boolean;
  isPaused: boolean;
  isScribing: boolean;
  handleStart: () => void;
  handlePauseResume: () => void;
  handleReset: () => void;
  handleComplete: () => void;
}) {
  const StartButton = (
    <button
      className="scribe-btn scribe-btn-start"
      onClick={handleStart}
      type="button"
    >
      <MicVocal />
      Start
    </button>
  );
  const ActiveButtons = (
    <div className="scribe-active-buttons-container">
      <div className="scribe-buttons-row">
        <button
          className="scribe-btn"
          onClick={handleReset}
          type="button"
          disabled={isScribing}
        >
          <TrashIcon />
          Reset
        </button>

        <button
          className="scribe-btn scribe-btn-save"
          onClick={handleComplete}
          type="button"
          disabled={isScribing}
        >
          <SaveIcon />
          Complete
        </button>
      </div>
      {isScribing && <h2>♽ Scribe In progress</h2>}
    </div>
  );

  return (
    <div className="scribe-control-buttons-container">
      {active ? ActiveButtons : StartButton}
    </div>
  );
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
      <RecordingTimer time={recordingDuration} />
      <ControlButtons
        active={isActive}
        isPaused={isPaused}
        isScribing={isScribing}
        handleStart={handleStart}
        handlePauseResume={handlePauseResume}
        handleComplete={handleComplete}
        handleReset={handleReset}
      />
    </div>
  );
};

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
