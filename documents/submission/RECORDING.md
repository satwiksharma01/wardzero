# Demo artifact and reproduction

[Watch the three-minute MP4](wardzero-demo.mp4) · [Captions](wardzero-demo.srt) · [Narration](narration.json) · [Asserted checkpoints](recording-evidence.json)

The final video is 1920×1080 H.264/AAC, exactly 180 seconds, with burned-in narration captions and chapter titles. The narration is synthesized; the application footage uses real UI/API transitions and live Gemini. Runtime data and the prepared care identities are synthetic. A new isolated run is created before capture. Prior runs are preserved.

Refreshed on 7 November 2026 against application revision `d0bc83cc96eb5a1d7d5abfc76229abd33d22629e`. Every recording checkpoint passed again. The closing card/narration now reports 73 automated tests, eight Chrome journeys, and 40 synthetic live Gemini cases; optional email remains disabled and live delivery unverified. The five gallery files are full frames from this refreshed encode, and the existing cover layout uses its new stable frame. SHA256 is recorded beside the MP4. Chrome playback/seek verification is in `documents/verification/video-playback.json`.

The 45-second controlled replay is documented separately; this walkthrough does not claim its normal wall-clock UI sequence measures that lead time. This video does not show a real email send.

## Actual chapters

| Time | View |
|---|---|
| 0:00–0:12 | Home-care problem and synthetic patient. |
| 0:12–0:33 | Three stable sensor readings through the real API. |
| 0:33–1:05 | Live Gemini observation, Medium concern, and deterioration to High. |
| 1:05–1:39 | Acknowledge, record an action, resolve, and inspect history. |
| 1:39–2:15 | Sensor outage, accelerated staleness, refresh, and queue recovery. |
| 2:15–2:43 | New unanswered alert, labeled time advance, and coordinator acknowledgement. |
| 2:43–3:00 | Architecture, executed verification, and limits. |

## Reproduce on the verified Windows setup

Start the production app separately with the documented Gemini configuration:

```powershell
npm run build
npm start
```

For an isolated recording port, set `PORT` on the server and `WARDZERO_DEMO_URL=http://127.0.0.1:<port>` on the recording command. The default remains port 3000. The verified refresh used port 3108 and a separate `WARDZERO_DATA_NAME`, with `WARDZERO_EMAIL_ENABLED=false`.

In a second terminal at the repository root:

```powershell
npx playwright install ffmpeg
node scripts/record-demo.mjs
node scripts/render-demo.mjs "C:/path/to/ffmpeg.exe"
node scripts/verify-video.mjs
```

Use an installed FFmpeg distribution with `ffprobe` beside its executable, H.264/AAC encoders, and the ASS subtitle filter. `record-demo.mjs` uses installed Chrome and writes raw capture under ignored `.data/demo/`. The narrator uses the installed Windows speech voice. Rendering overwrites only the generated final MP4/captions; inspect the result before replacing a submitted version.

Before rendering, generate narration from the repository root in an interactive PowerShell session (no script-execution-policy changes are required):

```powershell
Add-Type -AssemblyName System.Speech
New-Item -ItemType Directory -Force .data/demo/audio | Out-Null
$wardzeroChapters = Get-Content documents/submission/narration.json -Raw | ConvertFrom-Json
for ($wardzeroIndex = 0; $wardzeroIndex -lt $wardzeroChapters.Count; $wardzeroIndex++) {
    $wardzeroVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $wardzeroVoice.Rate = 1
    $wardzeroVoice.SetOutputToWaveFile((Join-Path (Get-Location) ('.data/demo/audio/part-' + $wardzeroIndex + '.wav')))
    $wardzeroVoice.Speak($wardzeroChapters[$wardzeroIndex].text)
    $wardzeroVoice.Dispose()
}
```

Application assertions abort recording if a concern transition, live analysis, queue recovery, or escalation is missing. The playback check verifies duration/dimensions, actual Chrome playback, seeking, and absence of media errors. It runs muted for automation; the recorded file contains narration.
