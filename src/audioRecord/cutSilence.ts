import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const config = {
  inputFileName: 'input.webm',
  outputFileName: 'output.webm',
  silenceFilter:
    'silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-35dB',
};

/**
 * Cuts out the silence from audio.
 * - reduce transcription cost
 * - Make it easier to re-listen
 * @returns webm Blob
 */
export async function cutSilenceFromBlob(webmBlob: Blob): Promise<Blob> {
  const ffmpeg = await loadFFmpeg(true);
  await ffmpeg.writeFile(config.inputFileName, await fetchFile(webmBlob));
  console.info(
    'Original audio duration (min):',
    (await getFileDuration(ffmpeg, config.inputFileName)) / 60,
  );
  await ffmpeg.exec([
    '-i',
    config.inputFileName,
    '-af',
    config.silenceFilter,
    config.outputFileName,
  ]);

  console.info(
    'Audio duration after silence trimming (min):',
    (await getFileDuration(ffmpeg, config.outputFileName)) / 60,
  );
  const data = await ffmpeg.readFile(config.outputFileName);

  if (isString(data)) {
    const outputBlob = new Blob([data], { type: 'audio/webm' });
    return outputBlob;
  }

  console.error('Data from ffmpeg is not a string');
  return webmBlob;
}

async function loadFFmpeg(debug = false) {
  // Error during recording stop: TypeError: Failed to construct 'URL': Invalid URL
  const ffmpeg = new FFmpeg();
  if (debug) {
    ffmpeg.on('log', ({ message }) => {
      console.debug('[FFmpeg Log]:', message);
    });
  }
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';

  // Load FFmpeg
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  console.debug('FFmpeg is loaded!');
  return ffmpeg;
}

/**
 * Executes ffprobe on a file in the FFmpeg virtual file system to get its duration in seconds.
 * @param ffmpeg The initialized FFmpeg instance.
 * @param fileName The name of the file in the FFmpeg virtual file system (e.g., 'input.webm').
 * @returns The duration in seconds as a number.
 */
async function getFileDuration(
  ffmpeg: FFmpeg,
  fileName: string,
): Promise<number> {
  const args = [
    '-i',
    fileName,
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
  ];

  let logOutput = '';
  const logHandler = ({ message }: { type: string; message: string }) => {
    logOutput += `${message}\n`;
  };

  ffmpeg.on('log', logHandler);

  try {
    await ffmpeg.exec(['ffprobe', ...args]);
  } catch (error) {
    console.error('ffprobe execution failed:', error);
  } finally {
    ffmpeg.off('log', logHandler);
  }

  const durationMatch = logOutput.trim().match(/[\d.]+/);

  if (durationMatch) {
    return Number.parseFloat(durationMatch[0]);
  }
  return 0;
}

function isString(data: unknown): data is string {
  return typeof data === 'string';
}
