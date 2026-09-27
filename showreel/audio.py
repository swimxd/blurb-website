"""Blurb v6: original 96 BPM warm electronic pulse, 29.4 s / 48 kHz stereo.
No notification, highlight, toggle, typing or completion cues.
Run: python audio.py [output-directory]. Master raw-score.wav with export.py.
"""
from pathlib import Path
import json
import sys
import wave
import numpy as np

SR = 48000
DURATION = 29.4
BPM = 96
N = round(SR * DURATION)
RNG = np.random.default_rng(806)
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "out"
OUT.mkdir(parents=True, exist_ok=True)
music = np.zeros((N, 2), dtype=np.float64)
washes = np.zeros_like(music)

def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)

def place(bus, signal, start, gain=1):
    offset = round(start * SR)
    left = max(0, -offset)
    offset = max(0, offset)
    length = min(len(signal) - left, N - offset)
    if length > 0:
        bus[offset:offset + length] += signal[left:left + length] * gain

def envelope(length, attack, release):
    env = np.ones(length)
    na, nr = min(length, round(attack * SR)), min(length, round(release * SR))
    if na: env[:na] *= np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    if nr: env[-nr:] *= np.sin(np.linspace(np.pi / 2, 0, nr)) ** 2
    return env

def pad(notes, duration):
    t = np.arange(round(duration * SR)) / SR
    out = np.zeros((len(t), 2))
    for i, midi in enumerate(notes):
        for side, detune in enumerate((-0.0014, 0.0014)):
            f = hz(midi) * (1 + detune)
            phase = RNG.uniform(0, 2 * np.pi)
            breath = .82 + .18 * np.sin(2 * np.pi * .083 * t + i * .8)
            voice = np.sin(2 * np.pi * f * t + phase)
            voice += .19 * np.sin(2 * np.pi * f * 2 * t + phase)
            voice += .04 * np.sin(2 * np.pi * f * 3 * t)
            out[:, side] += voice * breath / len(notes)
    return out * envelope(len(t), 1.8, 2.4)[:, None]

# Open voicings; overlapping, slow harmonic movement without an arpeggio.
chords = [
    [50, 57, 61, 64, 66],  # Dmaj9
    [45, 52, 57, 59, 61],  # Aadd9
    [43, 50, 54, 57, 62],  # Gmaj9
    [45, 52, 57, 59, 64],  # Asus2
    [50, 57, 61, 64, 66],
]
for chord, start in zip(chords, [-.7, 5.1, 11.0, 16.9, 22.8]):
    place(music, pad(chord, 8.0), start, .22)

# A gently propulsive low pulse at 96 BPM, still rounded rather than punchy.
beat = 60 / BPM
for i, start in enumerate(np.arange(.5, DURATION - 1.9, beat)):
    t = np.arange(round(.56 * SR)) / SR
    root = 50 if start < 5.1 or start >= 22.8 else (45 if start < 11 else 43 if start < 16.9 else 45)
    f = hz(root - 12)
    tone = np.sin(2 * np.pi * f * t) + .16 * np.sin(2 * np.pi * 2 * f * t)
    env = (1 - np.exp(-t / .025)) ** 2 * np.exp(-t / .16)
    env *= envelope(len(t), .025, .14)
    strength = .18 if i % 4 == 0 else .13
    place(music, np.column_stack([tone * env, tone * env]), start, strength)

# Soft offbeat chord pulses add lift, with all notes together (no arpeggio).
# The musical grid is independent of the on-screen interactions.
for i, start in enumerate(np.arange(.5 + beat / 2, DURATION - 2.0, beat)):
    chord_index = 0 if start < 5.1 else 1 if start < 11 else 2 if start < 16.9 else 3 if start < 22.8 else 4
    t = np.arange(round(.38 * SR)) / SR
    pulse = np.zeros((len(t), 2))
    for note in chords[chord_index][1:]:
        for side, detune in enumerate((-.0008, .0008)):
            f = hz(note) * (1 + detune)
            pulse[:, side] += (np.sin(2 * np.pi * f * t)
                              + .15 * np.sin(2 * np.pi * 2 * f * t)) / 4
    env = (1 - np.exp(-t / .04)) ** 2 * np.exp(-t / .11)
    pulse *= (env * envelope(len(t), .035, .16))[:, None]
    place(music, pulse, start, .12 if i % 4 in (0, 2) else .08)

def air(duration, lower=450, upper=2100):
    n = round(duration * SR)
    freq = np.fft.rfftfreq(n, 1 / SR)
    shape = (freq / max(lower, 1)) ** 2 / (1 + (freq / max(lower, 1)) ** 2)
    shape *= np.exp(-(freq / upper) ** 4) / np.sqrt(np.maximum(freq, 80))
    result = []
    for _ in range(2):
        noise = np.fft.irfft(np.fft.rfft(RNG.standard_normal(n)) * shape, n)
        noise /= max(np.sqrt(np.mean(noise ** 2)), 1e-9)
        result.append(noise)
    return np.column_stack(result)

bed = air(DURATION, 250, 1500)
t = np.arange(N) / SR
music += bed * (.0018 * (.6 + .4 * np.sin(2 * np.pi * .08 * t) ** 2))[:, None]

# A quiet brushed texture gives the groove a little forward movement.
# Filtered noise only: no metallic hats, claps, bells or UI-like ticks.
brush = air(.20, 900, 2900)
brush *= envelope(len(brush), .04, .14)[:, None]
for i, start in enumerate(np.arange(.5, DURATION - 1.9, beat / 2)):
    place(music, brush, start, .0034 if i % 2 else .0018)

# Only broad chapter washes. All UI interactions are intentionally silent.
for time in (4.8, 13.8, 16.8, 24.6):
    wash = air(1.5, 550, 1900)
    wash *= np.sin(np.linspace(0, np.pi, len(wash)))[:, None] ** 2.5
    place(washes, wash, time - .85, .006)

# Short, dark stereo tails. No tempo pumping or impact compression.
for delay, gain in ((.173, .07), (.317, .05), (.491, .035)):
    offset = round(delay * SR)
    music[offset:] += music[:-offset, ::-1].copy() * gain

fade = envelope(N, .65, 1.8)
music *= fade[:, None]
washes *= fade[:, None]
mix = music + washes
peak = np.max(np.abs(mix))
scale = min(1., .8 / max(peak, 1e-12))

def write(name, data):
    assert np.isfinite(data).all()
    pcm = (np.clip(data * scale, -1, 1) * 32767).astype("<i2")
    with wave.open(str(OUT / name), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes(pcm.tobytes())

write("music.wav", music)
write("transition-washes.wav", washes)
write("raw-score.wav", mix)
(OUT / "audio-notes.json").write_text(json.dumps({
    "bpm": BPM, "duration": DURATION, "sampleRate": SR,
    "uiCues": [], "transitionWashCenters": [4.8, 13.8, 16.8, 24.6],
    "masterTarget": {"integratedLufs": -20, "truePeakDbtp": -1.5}
}, indent=2))
print(f"Original score and stems: {OUT} ({DURATION}s, {BPM} BPM)")
