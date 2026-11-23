"""Master the concept audio in .concepts/audio -> .concepts/prototype/audio (mono MP3).
   - ambient loops: loudness-matched to -27 dB RMS
   - footsteps: trimmed to the onset, 0.32 s, short fade-out, peak 0.7
   - bird calls: trimmed, peak 0.7
"""
import os, glob
import numpy as np, miniaudio, lameenc

SR = 44100
OUT = ".concepts/prototype/audio"; os.makedirs(OUT, exist_ok=True)

def load(f):
    d = miniaudio.decode_file(f, output_format=miniaudio.SampleFormat.FLOAT32, nchannels=1, sample_rate=SR)
    return np.array(d.samples, dtype=np.float32)

def save(x, name, kbps=96):
    x = np.clip(x, -1, 1)
    enc = lameenc.Encoder(); enc.set_bit_rate(kbps); enc.set_in_sample_rate(SR); enc.set_channels(1); enc.set_quality(2)
    data = enc.encode((x * 32767).astype(np.int16).tobytes()) + enc.flush()
    open(f"{OUT}/{name}.mp3", "wb").write(data)

from scipy.signal import butter, sosfilt

def step_features(y):
    """Bright, noisy, low-thump clips sound like crunch/rustle; low tonal ones sound like hooves."""
    spec = np.abs(np.fft.rfft(y * np.hanning(len(y)), n=8192)) ** 2; fr = np.fft.rfftfreq(8192, 1 / SR)
    band = (fr > 400) & (fr < 10000); p = spec[band] + 1e-12
    flat = float(np.exp(np.log(p).mean()) / p.mean())                       # 1 = pure noise, 0 = tonal
    centroid = float((fr[band] * p).sum() / p.sum())
    low = float(spec[(fr > 60) & (fr < 400)].sum() / spec.sum())            # hollow thump energy
    return flat, centroid, low

def trim_step(x):
    env = np.convolve(np.abs(x), np.ones(int(0.004 * SR)) / int(0.004 * SR), "same")
    on = max(0, int(np.argmax(env > 0.15 * env.max())) - int(0.006 * SR))
    y = x[on:on + int(0.32 * SR)].copy()
    return y

hp = butter(2, 220, "highpass", fs=SR, output="sos")     # remove the low "knock"
for old in glob.glob(OUT + "/step-*.mp3"): os.remove(old)
for surface in ["dirt", "grass", "snow", "wood"]:
    cands = []
    for f in sorted(glob.glob(f".concepts/audio/step-{surface}-*.mp3")):
        y = sosfilt(hp, trim_step(load(f))).astype(np.float32)
        flat, cen, low = step_features(y)
        score = flat * 3 + cen / 3000 - low * 4
        cands.append((score, os.path.basename(f), flat, cen, low, y))
    cands.sort(key=lambda c: -c[0])
    for rank, (score, name, flat, cen, low, y) in enumerate(cands):
        print(f"{surface:5s} {name:16s} score={score:5.2f} flat={flat:.2f} centroid={cen:5.0f}Hz low={low:.2f} {'KEEP' if rank < 3 else ''}")
    for n, (score, name, flat, cen, low, y) in enumerate(cands[:3], 1):
        fade = int(0.08 * SR); y = y.copy(); y[-fade:] *= np.linspace(1, 0, fade); y *= 0.7 / (np.abs(y).max() + 1e-9)
        save(y, f"step-{surface}-{n}", 96)

for f in sorted(glob.glob(".concepts/audio/*.mp3")):
    n = os.path.basename(f)[:-4]
    if n.startswith("step-"): continue
    x = load(f)
    if n.startswith("amb-"):
        rms = np.sqrt((x ** 2).mean()); x = x * (10 ** (-27 / 20) / rms)
        peak = np.abs(x).max()
        if peak > 0.9: x = x * (0.9 / peak)          # gentle: only ever reduces
        save(x, n, 112)
    else:
        env = np.convolve(np.abs(x), np.ones(int(0.02 * SR)) / int(0.02 * SR), "same")
        idx = np.where(env > 0.05 * env.max())[0]
        y = x[max(0, idx[0] - int(0.05 * SR)):min(len(x), idx[-1] + int(0.15 * SR))]
        fade = int(0.1 * SR); y[-fade:] *= np.linspace(1, 0, fade)
        y *= 0.7 / (np.abs(y).max() + 1e-9)
        save(y, n, 96)
    print(n, "ok")
tot = sum(os.path.getsize(f) for f in glob.glob(OUT + "/*.mp3"))
print("total", tot // 1024, "KB")
