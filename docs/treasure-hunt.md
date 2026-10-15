# Solo treasure hunt

The `/hunt/` screen supports Taj Mahal, Red Fort and Qutub Minar with five checkpoints each. Choose a monument and either on-site or practice mode. Hints and read-aloud clues are available during play. Pause returns to setup without deleting progress.

On-site checks request a fresh high-accuracy GPS reading. Permission failures, unavailable GPS, stale readings, low accuracy and locations outside the checkpoint radius never complete a clue. Recentring the map only moves the map. Map tiles require internet; a tile failure does not disable clues or GPS checks. Coordinates are displayed without the former artificial scaling.

Progress is versioned in local storage, separately for each profile, monument and mode. It is device-specific, not cloud-synced. Completed on-site hunts remain completed; practice can be restarted. Clearing device data clears these records.

Every checkpoint contributes 50 hunt points; completing the trail adds 500 points. Practice never calls the XP service. Signed-in on-site participants can save 750 XP after completing the hunt. The claim attempt is stored before submitting and is not repeated on refresh. The existing XP API has no request idempotency key, so failed or timed-out submissions are shown as unconfirmed and are not automatically retried. This is device-side duplicate prevention, not a server-side anti-cheat or cross-device reward ledger.

## Verification

From `apk/ui`, run:

```
node --experimental-strip-types --test tests/hunt.test.mjs
./node_modules/.bin/tsc --noEmit
npm run build
```

Browser walkthrough covered practice completion, refresh/resume, no practice XP, denied GPS, distant GPS, simulated valid checkpoints, local-profile XP credit and reload without a second claim. Actual on-site accuracy/accessibility and cloud XP credit require live-device verification. Follow staff instructions and stay in permitted visitor areas; the map is not a turn-by-turn walking route.
