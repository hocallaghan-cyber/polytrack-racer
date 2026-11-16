# PolyTrack Grand Prix

A lightweight browser racing game inspired by low-poly arcade racers.

Features:
- 9 AI opponents
- 10 lap race format
- Famous circuits: Silverstone, Monaco, Suzuka, Spa, Monza
- Pit stop system for fuel and tyre wear
- Win condition: finish first against the 9 AI
- Keyboard controls for acceleration, braking, steering and pit stop

## How to run

From the project folder, start a small web server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Controls

- W / Up: accelerate
- S / Down: brake
- A / D: steer
- P: pit stop when you are in the pit zone and moving slowly

## Race objective

Win the 10-lap race by finishing ahead of the 9 AI cars. If your fuel or tyres run low, enter the pit lane and complete a pit stop to keep the car competitive.

## Files

- `index.html` – main UI
- `style.css` – visual styling
- `game.js` – game logic and race simulation
