/** Browser file pickers often leave `type` empty; trust the extension then. */
const AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".wave",
  ".flac",
  ".ogg",
  ".oga",
  ".m4a",
  ".aac",
  ".opus",
];

export const MAX_AUDIO_BYTES = 80 * 1024 * 1024;

export function isAudioFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type.startsWith("audio/")) return true;
  if (type.startsWith("video/")) return false;
  const name = file.name.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function validateAudioFile(file: File): string | null {
  if (file.size <= 0) return "That file is empty.";
  if (file.size > MAX_AUDIO_BYTES) return "Audio files must be 80 MB or smaller.";
  if (!isAudioFile(file)) return "Use an audio file (mp3, wav, flac, ogg, m4a, aac).";
  return null;
}
