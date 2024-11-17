export function ModalRecordingTimer({ time }: { time: number }) {
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
