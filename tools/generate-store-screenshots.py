#!/usr/bin/env python3
"""
Pokie Palace store screenshots — real game states, headless, no device.

Applying the lesson from Princess Ninja: don't screenshot the boring default
state. A slots game screenshotted at idle with a starting balance looks dead.
Seed a genuine mid-progression player (level 6, so BOTH machines are unlocked —
Grotto needs level 5), then actually spin and capture the wins.

Nothing faked: seeded state is a state a real player reaches, and every spin
result is the real RNG engine.
"""
import pathlib, subprocess, time
from playwright.sync_api import sync_playwright

REPO = pathlib.Path("/home/claude/slots-game")
RAW = pathlib.Path("/home/claude/pp-raw"); RAW.mkdir(exist_ok=True)
for f in RAW.glob("*.png"): f.unlink()

W, H = 1080, 1920  # portrait — this is a phone-shaped UI, unlike Princess Ninja

SEEDED = {
    "state": {
        "balance": 8450,
        "betIndex": 3,
        "lastWin": 0,
        "muted": True,          # no audio in headless
        "machineId": "beach",
        "level": 6,             # >= 5 so Glowworm Grotto is unlocked too
        "xp": 40,
        "lastDailyClaim": 0,
        "lastHourlyClaim": 0,
        "dailyStreak": 4,       # a real streak — shows the retention feature
        "piggyBank": 1830,
        "freeSpinsLeft": 0,
        "freeSpinBet": 0,
    },
    "version": 0,
}

server = subprocess.Popen(["npx","vite","preview","--port","4180","--host","127.0.0.1"],
                          cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(4)

shots = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": W, "height": H})
        pg.goto("http://127.0.0.1:4180/", wait_until="load")
        pg.evaluate("s => localStorage.setItem('pokie-palace', JSON.stringify(s))", SEEDED)
        pg.reload(wait_until="load")
        pg.wait_for_timeout(2000)

        pg.screenshot(path=str(RAW/"a-idle.png")); print("a idle (seeded player)")

        # Real spins. Capture during and after each — a win landing is the shot
        # that sells a slots game.
        spin_btn = pg.locator("button").filter(has_text="SPIN").first
        if spin_btn.count() == 0:
            spin_btn = pg.locator("button").nth(0)

        for i in range(10):
            try:
                spin_btn.click(timeout=3000)
            except Exception:
                break
            pg.wait_for_timeout(900)   # mid-spin: reels moving
            pg.screenshot(path=str(RAW/f"b-spin{i}-mid.png"))
            pg.wait_for_timeout(2200)  # settled: win/lose resolved
            pg.screenshot(path=str(RAW/f"c-spin{i}-result.png"))
            # read the balance/lastWin so I can pick a frame with a REAL win
            txt = pg.evaluate("() => document.body.innerText")
            shots.append((i, txt[:400]))
            print(f"  spin {i} captured")

        b.close()
finally:
    server.terminate()

print(f"\n{len(list(RAW.glob('*.png')))} raw frames -> {RAW}")
