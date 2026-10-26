import { describe, expect, it } from "vitest";
import { isAudioFile, MAX_AUDIO_BYTES, validateAudioFile } from "./audioFile.ts";

function fakeFile(name: string, type: string, size: number): File {
  return { name, type, size } as File;
}

describe("isAudioFile", () => {
  it("accepts audio MIME types", () => {
    expect(isAudioFile(fakeFile("song.bin", "audio/mpeg", 100))).toBe(true);
  });

  it("accepts known extensions when MIME is empty", () => {
    expect(isAudioFile(fakeFile("demo.flac", "", 100))).toBe(true);
    expect(isAudioFile(fakeFile("demo.m4a", "", 100))).toBe(true);
  });

  it("rejects video and unknown types", () => {
    expect(isAudioFile(fakeFile("clip.mp4", "video/mp4", 100))).toBe(false);
    expect(isAudioFile(fakeFile("notes.txt", "text/plain", 100))).toBe(false);
  });
});

describe("validateAudioFile", () => {
  it("rejects empty and oversized files", () => {
    expect(validateAudioFile(fakeFile("a.mp3", "audio/mpeg", 0))).toMatch(/empty/i);
    expect(validateAudioFile(fakeFile("a.mp3", "audio/mpeg", MAX_AUDIO_BYTES + 1))).toMatch(
      /80 MB/,
    );
  });

  it("rejects non-audio files", () => {
    expect(validateAudioFile(fakeFile("pic.png", "image/png", 12))).toMatch(/audio file/i);
  });

  it("accepts a normal track", () => {
    expect(validateAudioFile(fakeFile("track.wav", "audio/wav", 2048))).toBeNull();
  });
});
