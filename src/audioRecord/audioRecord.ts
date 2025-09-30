/**
 * This was heavily inspired by
 * https://github.com/drewmcdonald/obsidian-magic-mic
 * Thank you for traversing this in such a clean way
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { fixWebmDuration } from '@fix-webm-duration/fix';
import { Notice } from 'obsidian';

import {
  type SupportedMimeType,
  mimeTypeToFileExtension,
  pickMimeType,
} from 'src/util/mimeType';
import { cutSilenceFromBlob } from './cutSilence';

export class AudioRecord {
  mediaRecorder: MediaRecorder | null;
  data: BlobPart[] = [];
  fileExtension: string;
  startTime: number | null = null;
  desiredFormat: 'webm' | 'mp3';

  private mimeType: SupportedMimeType = pickMimeType('audio/webm; codecs=opus');
  private bitRate = 32000;

  constructor(desiredFormat: 'webm' | 'mp3' = 'webm') {
    this.desiredFormat = desiredFormat;
    // We always record in WebM format because it's widely supported
    // If MP3 is desired, we'll convert it later
    this.fileExtension = desiredFormat;
  }

  async startRecording(deviceId?: string) {
    const audioConstraints =
      deviceId && deviceId !== '' ? { deviceId: { exact: deviceId } } : true;

    navigator.mediaDevices
      .getUserMedia({ audio: audioConstraints })
      .then((stream) => {
        this.mediaRecorder = this.setupMediaRecorder(stream);
        this.mediaRecorder.start();
        this.startTime = Date.now();
      })
      .catch((err) => {
        new Notice('Scribe: Failed to access the microphone');
        console.error('Error accessing microphone:', err);
      });
  }

  async handlePauseResume() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.error(
        'There is no mediaRecorder, cannot resume handlePauseResume',
      );
      throw new Error('There is no mediaRecorder, cannot handlePauseResume');
    }

    if (this.mediaRecorder.state === 'paused') {
      this.resumeRecording();
    } else if (this.mediaRecorder.state === 'recording') {
      this.pauseRecording();
    }
  }

  async resumeRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.error('There is no mediaRecorder, cannot resume resumeRecording');
      throw new Error('There is no mediaRecorder, cannot resumeRecording');
    }
    this.mediaRecorder?.resume();
  }

  async pauseRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.error('There is no mediaRecorder, cannot pauseRecording');
      throw new Error('There is no mediaRecorder, cannot pauseRecording');
    }
    this.mediaRecorder?.pause();
  }

  async convertWebmToMp3(webmBlob: Blob): Promise<Blob> {
    try {
      const ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

      // Load FFmpeg
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          'text/javascript',
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          'application/wasm',
        ),
      });

      // Write input WebM file
      await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));

      // Convert WebM to MP3
      await ffmpeg.exec([
        '-i',
        'input.webm',
        '-c:a',
        'libmp3lame',
        '-q:a',
        '2',
        'output.mp3',
      ]);

      // Read the output file
      const data = await ffmpeg.readFile('output.mp3');

      // Create a Blob from the output data
      const mp3Blob = new Blob([data], { type: 'audio/mp3' });

      return mp3Blob;
    } catch (error) {
      console.error('Error converting WebM to MP3:', error);
      throw new Error(`Failed to convert WebM to MP3: ${error.message}`);
    }
  }

  stopRecording() {
    return new Promise<Blob>((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        const err = new Error(
          'There is no mediaRecorder, cannot stopRecording',
        );
        console.error(err.message);
        reject(err);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          this.mediaRecorder?.stream
            .getTracks()
            .forEach((track) => track.stop());

          if (this.data.length === 0) {
            throw new Error('No audio data recorded.');
          }

          let blob = new Blob(this.data, { type: this.mimeType });
          // Test implementation
          blob = await cutSilenceFromBlob(blob);
          const duration = (this.startTime && Date.now() - this.startTime) || 0;
          const fixedBlob = await fixWebmDuration(blob, duration, {});

          this.mediaRecorder = null;
          this.startTime = null;

          // If MP3 is desired, convert the WebM blob to MP3
          if (this.desiredFormat === 'mp3') {
            try {
              const mp3Blob = await this.convertWebmToMp3(fixedBlob);
              resolve(mp3Blob);
            } catch (conversionError) {
              console.error(
                'Error converting to MP3, falling back to WebM:',
                conversionError,
              );
              new Notice(
                'Scribe: Failed to convert to MP3, saving as WebM instead',
              );
              resolve(fixedBlob);
            }
          } else {
            resolve(fixedBlob);
          }
        } catch (err) {
          console.log('Error during recording stop:', err);
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  private setupMediaRecorder(stream: MediaStream) {
    const rec = new MediaRecorder(stream, {
      mimeType: this.mimeType,
      audioBitsPerSecond: this.bitRate,
    });
    rec.ondataavailable = (e) => {
      this.data.push(e.data);
    };

    return rec;
  }
}
