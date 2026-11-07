import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Usage: node scripts/render-demo.mjs /absolute/path/to/ffmpeg.exe
const ffmpeg = process.argv[2] ?? "ffmpeg";
const ffprobe = path.join(
  path.dirname(ffmpeg),
  process.platform === "win32" ? "ffprobe.exe" : "ffprobe",
);
const chapters = JSON.parse(readFileSync("demo/narration.json", "utf8"));
const assTime = (seconds) =>
  `0:${String(Math.floor(seconds / 60)).padStart(2, "0")}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
const srtTime = (seconds) =>
  `00:${String(Math.floor(seconds / 60)).padStart(2, "0")}:${(seconds % 60).toFixed(3).padStart(6, "0").replace(".", ",")}`;
const escapeAss = (text) => text.replaceAll("{", "(").replaceAll("}", ")");
let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,Arial,27,&H00F3E6D9,&H00FFFFFF,&H005D3617,&H005D3617,1,0,0,0,100,100,1,0,1,0,0,2,45,45,78,1
Style: Caption,Arial,29,&H00FFFFFF,&H00FFFFFF,&H005D3617,&H005D3617,0,0,0,0,100,100,0,0,1,0,0,2,80,80,18,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
let srt = "";
let captionIndex = 0;
const inputs = ["-i", ".data/demo/raw/wardzero.webm"];
const audioFilters = [];
chapters.forEach((chapter, index) => {
  const file = `.data/demo/audio/part-${index}.wav`;
  const duration = Number(
    execFileSync(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        file,
      ],
      { encoding: "utf8" },
    ).trim(),
  );
  const speed = Math.max(1, duration / (chapter.end - chapter.start - 1));
  inputs.push("-i", file);
  audioFilters.push(
    `[${index + 1}:a]atempo=${speed.toFixed(6)},adelay=${chapter.start * 1000}:all=1[a${index}]`,
  );
  ass += `Dialogue: 0,${assTime(chapter.start)},${assTime(chapter.end)},Title,,0,0,0,,${escapeAss(chapter.title)}\n`;
  const words = chapter.text.split(" ");
  for (let offset = 0; offset < words.length; offset += 13) {
    const start = chapter.start + ((offset / words.length) * duration) / speed;
    const end =
      chapter.start +
      ((Math.min(offset + 13, words.length) / words.length) * duration) / speed;
    const caption = words.slice(offset, offset + 13).join(" ");
    ass += `Dialogue: 1,${assTime(start)},${assTime(end)},Caption,,0,0,0,,${escapeAss(caption)}\n`;
    srt += `${++captionIndex}\n${srtTime(start)} --> ${srtTime(end)}\n${caption}\n\n`;
  }
});
writeFileSync(".data/demo/captions.ass", ass);
writeFileSync("demo/wardzero-demo.srt", srt.trimEnd() + "\n");
const filter = [
  "[0:v]scale=1536:960,pad=1920:1080:192:0:color=0x17365d,ass=.data/demo/captions.ass[v]",
  ...audioFilters,
  `${chapters.map((_, index) => `[a${index}]`).join("")}amix=inputs=${chapters.length}:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad=whole_dur=180[a]`,
].join(";");
execFileSync(
  ffmpeg,
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "warning",
    ...inputs,
    "-filter_complex",
    filter,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-t",
    "180",
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "21",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "demo/wardzero-demo.mp4",
  ],
  { stdio: "inherit" },
);
console.log("Rendered 180-second narrated demo with burned-in captions.");
