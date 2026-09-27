"""Master the original score and export the master/web media with FFmpeg.
python export.py --audio-only
python export.py --output-dir /path/to/outputs
FFMPEG_PATH and FFPROBE_PATH can point to portable installations.
"""
from pathlib import Path
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
FF = os.environ.get("FFMPEG_PATH", "ffmpeg")
PROBE = os.environ.get("FFPROBE_PATH", str(Path(FF).with_name("ffprobe.exe" if os.name == "nt" else "ffprobe")) if Path(FF).is_absolute() else "ffprobe")
DURATION = "29.4"

def run(args, capture=False):
    return subprocess.run([FF, "-hide_banner", "-nostdin", "-y", *args],
                          check=True, stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
                          stderr=subprocess.PIPE if capture else None, text=capture)

def measure(path):
    r = run(["-i", str(path), "-vn", "-af", "loudnorm=I=-20:TP=-1.5:LRA=7:print_format=json", "-f", "null", os.devnull], True)
    return json.loads(re.findall(r"\{[\s\S]*?\}", r.stderr)[-1])

def master_audio():
    raw, score = OUT / "raw-score.wav", OUT / "score.wav"
    if not raw.exists():
        subprocess.run([sys.executable, str(ROOT / "audio.py"), str(OUT)], check=True)
    first = run(["-i", str(raw), "-af", "highpass=f=35,loudnorm=I=-20:TP=-1.5:LRA=7:print_format=json", "-f", "null", os.devnull], True)
    values = json.loads(re.findall(r"\{[\s\S]*?\}", first.stderr)[-1])
    filt = ("highpass=f=35,loudnorm=I=-20:TP=-1.5:LRA=7:linear=true"
            f":measured_I={values['input_i']}:measured_TP={values['input_tp']}"
            f":measured_LRA={values['input_lra']}:measured_thresh={values['input_thresh']}"
            f":offset={values['target_offset']}")
    run(["-loglevel", "error", "-i", str(raw), "-af", filt, "-ar", "48000", "-ac", "2",
         "-c:a", "pcm_s24le", "-t", DURATION, str(score)])
    verified = measure(score)
    (OUT / "loudness.json").write_text(json.dumps(verified, indent=2))
    if abs(float(verified["input_i"]) + 20) > 1 or float(verified["input_tp"]) > -1:
        raise RuntimeError("Audio master outside loudness target")
    print("Score mastered:", verified["input_i"], "LUFS /", verified["input_tp"], "dBTP", flush=True)
    return score

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-only", action="store_true")
    parser.add_argument("--output-dir", type=Path, default=OUT / "delivery")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    score = master_audio()
    if args.audio_only: return
    picture = OUT / "picture.mp4"
    if not picture.exists(): raise FileNotFoundError("Render out/picture.mp4 first")
    dest = args.output_dir.resolve(); dest.mkdir(parents=True, exist_ok=True)
    media = ROOT.parent / "media"; media.mkdir(exist_ok=True)
    master = dest / "Blurb_showreel_v6_1080p60.mp4"
    run(["-loglevel", "error", "-i", str(picture), "-i", str(score),
         "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
         "-ar", "48000", "-t", DURATION, "-movflags", "+faststart", str(master)])
    for height, bitrate, audio_rate, max_bytes in [(1080, 2900, 160, 12 * 1024**2), (720, 1350, 128, 6 * 1024**2)]:
        name = f"Blurb_showreel_v6_web_{height}p60.mp4"
        output = dest / name
        log = OUT / f"pass-{height}"
        encoding = ["-vf", f"scale=-2:{height}:flags=lanczos", "-c:v", "libx264", "-preset", "slow",
                    "-b:v", f"{bitrate}k", "-maxrate", f"{round(bitrate * 1.6)}k", "-bufsize", f"{bitrate * 3}k",
                    "-pix_fmt", "yuv420p", "-r", "60", "-g", "120",
                    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
                    "-passlogfile", str(log)]
        print("Encoding", height, flush=True)
        run(["-loglevel", "error", "-i", str(picture), *encoding, "-pass", "1", "-an", "-t", DURATION, "-f", "null", os.devnull])
        run(["-loglevel", "error", "-i", str(picture), "-i", str(score), "-map", "0:v:0", "-map", "1:a:0",
             *encoding, "-pass", "2", "-c:a", "aac", "-b:a", f"{audio_rate}k", "-ar", "48000",
             "-t", DURATION, "-movflags", "+faststart", str(output)])
        if output.stat().st_size >= max_bytes: raise RuntimeError(f"{name} exceeds file size target")
        shutil.copy2(output, media / f"blurb-v6-{height}p60.mp4")
        print(name, output.stat().st_size, "bytes", flush=True)
    poster = media / "blurb-v6-poster.webp"
    run(["-loglevel", "error", "-i", str(OUT / "frame-10.65.png"), "-frames:v", "1", "-c:v", "libwebp", "-quality", "90", str(poster)])
    shutil.copy2(poster, dest / "Blurb_showreel_v6_poster.webp")
    shutil.copy2(score, dest / "Blurb_showreel_v6_soundtrack.wav")
    results = {}
    for p in [master, dest / "Blurb_showreel_v6_web_1080p60.mp4", dest / "Blurb_showreel_v6_web_720p60.mp4"]:
        decoded = run(["-v", "error", "-xerror", "-err_detect", "explode", "-i", str(p), "-f", "null", os.devnull], True)
        if decoded.stderr.strip(): raise RuntimeError(f"Decode error in {p.name}: {decoded.stderr}")
        info = subprocess.check_output([PROBE, "-v", "error", "-count_frames", "-show_entries",
            "format=duration,size:stream=codec_name,width,height,r_frame_rate,nb_read_frames,duration,start_time,sample_rate,channels", "-of", "json", str(p)], text=True)
        results[p.name] = json.loads(info)
        results[p.name]["loudness"] = measure(p)
        video, audio = results[p.name]["streams"]
        expected_height = 720 if "720p" in p.name else 1080
        if (video["width"], video["height"], video["r_frame_rate"], video["nb_read_frames"]) != (expected_height * 16 // 9, expected_height, "60/1", "1764"):
            raise RuntimeError(f"Incorrect picture format in {p.name}")
        if abs(float(video["duration"]) - 29.4) > .02 or abs(float(audio["duration"]) - 29.4) > .05:
            raise RuntimeError(f"Incorrect duration in {p.name}")
        if abs(float(video["start_time"]) - float(audio["start_time"])) > .025:
            raise RuntimeError(f"Audio/video start mismatch in {p.name}")
        loudness = results[p.name]["loudness"]
        if abs(float(loudness["input_i"]) + 20) > 1 or float(loudness["input_tp"]) > -1:
            raise RuntimeError(f"AAC loudness outside target in {p.name}")
    (dest / "media-verification.json").write_text(json.dumps(results, indent=2))
    print("All media decoded and verified", flush=True)

if __name__ == "__main__":
    main()
