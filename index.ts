import fs from "fs";

function formatTime(min: string, sec: string, ms: string): string {
  return `00:${min}:${sec},${ms.padEnd(3, "0")}`;
}

function addDefaultDuration(time: string, duration: number): string {
  const [hour, min, secMs] = time.split(":");
  const [sec, ms] = secMs.split(",");
  let totalSeconds =
    parseInt(hour) * 3600 + parseInt(min) * 60 + parseInt(sec) + duration;
  let hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")},${ms}`;
}

function lrc2srt(lrc: string): string {
  const lines = lrc.split("\n");
  const srtLines = [];
  let index = 1;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/\[(\d{2}):(\d{2}).(\d{2})\](.*)/);
    if (match) {
      const [, min, sec, ms, text] = match;
      const trimmedText = text.trim();
      if (trimmedText) {
        const startTime = formatTime(min, sec, ms);
        let endTime = "00:00:00,000";

        if (i + 1 < lines.length) {
          const nextMatch = lines[i + 1].match(/\[(\d{2}):(\d{2}).(\d{2})\]/);
          if (nextMatch) {
            const [, nextMin, nextSec, nextMs] = nextMatch;
            endTime = formatTime(nextMin, nextSec, nextMs);
          } else {
            endTime = addDefaultDuration(startTime, 5);
          }
        } else {
          endTime = addDefaultDuration(startTime, 5);
        }

        srtLines.push(`${index}`);
        srtLines.push(`${startTime} --> ${endTime}`);
        srtLines.push(`${trimmedText}`);
        srtLines.push("");
        index++;
      }
    }
  }

  return srtLines.join("\n");
}

function readFile(path: string) {
  return fs.readFileSync(path, { encoding: "utf-8" }).toString();
}

function output(path: string, data: string) {
  fs.writeFileSync(path, data, { encoding: "utf-8" });
}

function handleFile(path: string) {
  const content = readFile(path);
  output(path.replace(/\.lrc/i, ".srt"), lrc2srt(content));
}

async function start() {
  const [fileOrDirectory] = Bun.argv.slice(2);
  if (!fs.existsSync(fileOrDirectory)) {
    console.warn(`${fileOrDirectory} is not exists!`);
    return;
  }

  const stat = fs.statSync(fileOrDirectory);

  if (stat.isFile()) {
    handleFile(fileOrDirectory);
    return;
  }

  if (stat.isDirectory()) {
    console.log("directory");
    return;
  }
}

start();
