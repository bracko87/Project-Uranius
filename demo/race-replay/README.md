# Local race replay demo

From the sanitized Project Uranius checkout, use the existing Windows Node installation and package cache.

```powershell
npm ci --offline --ignore-scripts --no-audit --no-fund
node scripts/race-replay-demo.mjs
```

Open the loopback address printed by the runner. Groups, Terrain and Classifications show isolated fixtures with play, pause, seek and speed. Live Demo opens the fictional two-manager race. Advance Demo Clock advances the local authority one 30-second tick. Select Manager B and Fictional Rider 10, send Attack, then advance the clock to see the new breakaway and accepted revision. Open a second tab to observe the same revision, or select Reconnect after a connection interruption. Finish Demo Race seals the result and unlocks the completed replay.

The server listens only on loopback. Manager choices are test identities. The live browser receives only elapsed records, and exported final results become available on completion. Display motion interpolates between known samples. Speeds come from the current sample, and gaps use recorded crossings where available.

To repeat the automated browser checks on Windows with Chrome installed:

```powershell
node --experimental-websocket demo/race-replay/browser-check.mjs --screenshots
```

The browser test uses a temporary profile. The screenshots contain only fictional races.
