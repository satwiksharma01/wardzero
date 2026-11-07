import { chromium, expect } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage();
  await page.goto(
    pathToFileURL(path.resolve("documents/submission/wardzero-demo.mp4")).href,
  );
  const video = page.locator("video");
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((element) => element.readyState))
    .toBeGreaterThanOrEqual(2);
  const metadata = await video.evaluate((element) => ({
    duration: element.duration,
    width: element.videoWidth,
    height: element.videoHeight,
  }));
  expect(metadata).toEqual({ duration: 180, width: 1920, height: 1080 });
  await video.evaluate(async (element) => {
    element.muted = true;
    await element.play();
  });
  await expect
    .poll(() => video.evaluate((element) => element.currentTime))
    .toBeGreaterThan(2);
  await video.evaluate((element) => {
    element.currentTime = 150;
  });
  await expect
    .poll(() => video.evaluate((element) => element.currentTime))
    .toBeGreaterThan(152);
  expect(await video.evaluate((element) => element.error)).toBeNull();
  await writeFile(
    "documents/verification/video-playback.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        ...metadata,
        playbackAdvanced: true,
        seekPlaybackAdvanced: true,
        mediaError: null,
        mutedForAutomation: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "Chrome decoded and played the 180-second 1080p video, including seeking.",
  );
} finally {
  await browser.close();
}
