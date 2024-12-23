export function ModalRecordingOptions({
  isAppendToActiveFile,
  setIsAppendToActiveFile,
}: {
  isAppendToActiveFile: boolean;
  setIsAppendToActiveFile: (value: boolean) => void;
}) {
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsAppendToActiveFile(event.target.checked);
  };

  return (
    <div className="scribe-recording-options">
      <label>
        <input
          type="checkbox"
          checked={isAppendToActiveFile}
          onChange={handleCheckboxChange}
        />
        Append to active file
      </label>
    </div>
  );
}
