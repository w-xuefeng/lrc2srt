import fs from "fs";
import { glob } from "glob";

// function formatTime(min: string, sec: string, ms: string): string {
//   return `00:${min}:${sec},${ms.padEnd(3, "0").slice(0, 3)}`;
// }

// function addDefaultDuration(time: string, duration: number): string {
//   const [hour, min, secMs] = time.split(":");
//   const [sec, ms] = secMs.split(",");
//   const totalSeconds =
//     parseInt(hour) * 3600 + parseInt(min) * 60 + parseInt(sec) + duration;
//   const nextHours = Math.floor(totalSeconds / 3600);
//   const restHours = totalSeconds % 3600;
//   const minutes = Math.floor(restHours / 60);
//   const seconds = restHours % 60;

//   return `${String(nextHours).padStart(2, "0")}:${String(minutes).padStart(
//     2,
//     "0"
//   )}:${String(seconds).padStart(2, "0")},${ms}`;
// }

const formatMSTime = (ms: number): string => {
  const pad = (n: number, z = 2) => `${n}`.padStart(z, "0");
  return `${pad(Math.floor(ms / 3600000))}:${pad(
    Math.floor((ms % 3600000) / 60000)
  )}:${pad(Math.floor((ms % 60000) / 1000))},${pad(ms % 1000, 3)}`;
};

function parseTime(timeStr: string): number {
  const [, minutes, seconds, milliseconds] =
    timeStr.match(/(\d{2}):(\d{2})\.(\d+)/) || [];
  return (
    (parseInt(minutes) * 60 + parseInt(seconds)) * 1000 +
    parseInt(milliseconds.padEnd(3, "0").slice(0, 3))
  );
}

function lrc2srt(lrc: string): string {
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d+)\]/g;
  const lines = lrc.trim().split("\n");

  const lyrics: { startTime: number; endTime: number; text: string }[] = [];

  lines.forEach((line) => {
    const times = Array.from(line.matchAll(timeRegex));
    if (times.length > 0) {
      const text = line.replace(timeRegex, "").trim();
      times.forEach((time) => {
        const startTime = parseTime(time[0]);
        lyrics.push({
          startTime,
          text,
          endTime: 0,
        });
      });
    }
  });

  lyrics.sort((a, b) => a.startTime - b.startTime);

  const handleEndTimeLyrics = lyrics.map((e, i) => {
    if (i === lyrics.length - 1) {
      return e;
    }
    e.endTime = lyrics[i + 1].startTime;
    return e;
  });

  if (handleEndTimeLyrics.length > 0) {
    const lastLyric = handleEndTimeLyrics[handleEndTimeLyrics.length - 1];
    const totalDuration =
      lastLyric.startTime - handleEndTimeLyrics[0].startTime;
    const averageDuration = totalDuration / handleEndTimeLyrics.length;
    lastLyric.endTime = Math.max(
      lastLyric.startTime + 5000,
      lastLyric.startTime + averageDuration
    );
  }

  return handleEndTimeLyrics
    .map((lyric, index) =>
      [
        index + 1,
        `${formatMSTime(lyric.startTime)} --> ${formatMSTime(lyric.endTime)}`,
        lyric.text,
        "",
      ].join("\n")
    )
    .join("\n");
}

function readFile(path: string) {
  return fs.readFileSync(path, { encoding: "utf-8" }).toString();
}

function output(path: string, data: string) {
  fs.writeFileSync(path, data, { encoding: "utf-8" });
}

function handleFile(path: string) {
  const content = readFile(path);
  const target = path.replace(/\.lrc/i, ".srt");
  lrc2srt(content);
  output(target, lrc2srt(content));
  return target;
}

async function start() {
  const [fileOrDirectory] = Bun.argv.slice(2);
  if (!fs.existsSync(fileOrDirectory)) {
    console.warn(`${fileOrDirectory} is not exists!`);
    return;
  }

  const stat = fs.statSync(fileOrDirectory);

  if (stat.isFile()) {
    console.log(`[lrc2srt start]: ${fileOrDirectory}`);
    const target = handleFile(fileOrDirectory);
    console.log(`[lrc2srt done]: ${target}`);
    return;
  }

  if (stat.isDirectory()) {
    const lrcs = await glob(`${fileOrDirectory}/*.lrc`);
    for await (const lrc of lrcs) {
      console.log(`[lrc2srt start]: ${lrc}`);
      const target = handleFile(lrc);
      console.log(`[lrc2srt done]: ${target}`);
    }
    return;
  }
}

start();
