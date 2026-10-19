# Ryz

An alarm app for deep sleepers and normal sleepers, built with Expo (SDK 57) and grounded in sleep research. Black and white throughout: the only colour is the weather emojis.

## Try it on your phone (Expo Go)

You need a computer with [Node.js](https://nodejs.org) (the LTS version) and git, and the **Expo Go** app on your phone (App Store or Google Play).

```bash
git clone https://github.com/federicoblanchard1-hash/ryz-alarm
cd ryz-alarm
npm install
npm run go
```

A QR code appears in the terminal. Scan it with the iPhone **Camera** app, or with **Expo Go** on Android. Ryz opens in Expo Go and reloads by itself when the code changes.

- The phone and computer must be on the **same Wi-Fi**. If it won't connect (office or school Wi-Fi often blocks it), run `npx expo login` once, then `npm run go:tunnel`.
- In the terminal, press `r` to reload the app and `Ctrl+C` to stop.
- Keep Ryz open to test alarms: Settings → **Test alarm in 1 minute**. In Expo Go, alarms that ring while Ryz is closed use the phone's default notification sound, not Ryz's sounds. The full alarm needs a real build (see *Running it* below).

## Home

- **Weather where you wake up**: your town, the temperature, conditions, today's high and low, and the next 24 hours with weather emojis, like Apple Weather. Data from Open-Meteo (no API key); the town name comes from the phone's geocoder.
- **A background that matches the weather**, drawn in greys and animated: sun and glow, moon and twinkling stars at night, drifting clouds, rain, snow, fog, and lightning in a storm. It holds still when Reduce Motion is on.
- **Next alarm** with its sound and missions, plus the bedtime for your sleep goal.

Three tabs: **Home**, **Alarms** and **Settings**, on the platform's own tab bar.

## Missions

Like Alarmy: with missions on, **Stop** starts them, and the alarm only turns off when they're done. Up to three per alarm, done in order. While you work on one, the alarm drops to a low volume and stops vibrating; after 15 seconds without a tap, shake or step it's back to full volume.

| Wake your brain | Wake your body |
| --- | --- |
| **Math**: 3, 5 or 10 sums, easy to hard (`34 + 7` up to `14 × 6 + 57`) | **Shake**: 20, 40 or 80 hard shakes |
| **Memory**: squares light up, tap the same ones; 2–5 rounds on a 3×3 to 5×5 grid | **Squats**: 5, 10 or 20, phone held to your chest |
| **Typing**: type 1–3 sentences word for word | **Steps**: 20, 50 or 100 steps |

Every mission has **Try it** in the editor. On a phone without the needed motion sensor, a body mission turns into sums so you can always turn the alarm off.

## Alarms

- **Two wake-up styles**
  - **Gentle** for normal sleepers: a melody that starts almost silent and fades in (30 s to 5 min). Melodic alarms were linked with less morning grogginess than harsh beeps (McFarlane et al., 2020).
  - **Deep sleeper**: a low 520 Hz square-wave tone in bursts of three (the T-3 pattern). In fire-safety research it woke far more deep sleepers than the usual ~3 kHz beep, and it's the tone US fire code now requires in bedrooms (Bruck & Thomas). Stopping it takes a 1.5 s hold, so a half-asleep tap can't turn it off.
- **Escalation**: if you sleep through the gentle melody, the deep tone takes over after 1–5 minutes.
- **Snooze** of 5–30 minutes, limited to 1–5 times. Snoozing for up to about 30 minutes didn't hurt sleep or mood in a 2023 study (Sundelin et al.). If nobody touches the alarm for the whole ring time (5–15 min), it snoozes itself while snoozes are left.
- **"Are you awake?"**: a few minutes after you stop the alarm, Ryz asks. If you don't answer in time, it rings again with the deep tone.
- **Sleep coaching**: a sleep goal (7–9 h, since adults need at least 7 according to AASM/SRS), the bedtime that goal implies on the home screen, and an optional bedtime reminder before the earliest alarm of each morning.
- **Good-morning screen** with the things that help after waking: bright light, music you like, and the same wake time tomorrow.
- **Test alarm** in Settings, plus a check that notifications and (on Android) exact alarms are allowed.
- Repeat days, labels, vibration, a 12/24-hour clock, haptics, reduced-motion support, and screen-reader labels.

## How alarms ring

| Situation | What happens |
| --- | --- |
| Ryz is open | Ryz plays the alarm itself, with the fade-in and the switch to the deep tone, even in silent mode. The screen stays on. |
| Ryz is closed, Android | A notification on an alarm channel: it plays at **alarm volume**, rings **through Do Not Disturb**, and fires at the exact minute thanks to the exact-alarm permission. |
| Ryz is closed, iPhone | A time-sensitive notification. It gets through Focus but follows the **silent switch**. |

A notification sound plays only once (iOS caps it at 30 s), so Ryz schedules a follow-up every 30 seconds for as long as the alarm should keep ringing. Repeating alarms use weekly triggers, so they keep firing even if you don't open Ryz for weeks. Tapping the notification, or opening Ryz, brings up the ringing screen.

## Running it

The app uses native modules and custom notification sounds, so it needs a **development build** (Expo Go won't play the custom sounds):

```bash
npm install
npx expo run:android            # or: npx expo run:ios (needs a Mac with Xcode)
# no Mac? build in the cloud:
npx eas-cli@latest build --profile development --platform ios
```

The web build is a preview of the screens; there, alarms only ring while the tab is open:

```bash
npm run web
```

Checks:

```bash
npm test            # scheduling and ringing logic (Jest)
npm run typecheck
npm run lint
```

The alarm sounds are generated by `scripts/generate-sounds.mjs`. Run `npm run sounds` after changing it.

## Project layout

```
src/
  app/            screens (Expo Router): tabs (home, alarms, settings), alarm editor, ringing, try a mission, "Are you awake?", good morning
  core/           plain TypeScript, unit-tested: the alarm model, when things ring, the notification plan, volume fades, missions, weather
  missions/       the six mission screens and the runner
  services/       expo-notifications scheduling, expo-audio playback, location and weather
  state/          the store (saved with AsyncStorage) and permission state
  components/     shared UI
assets/sounds/    deep_520hz.wav, gentle_melody.wav, chime.wav
```

## Known limits and next steps

- **iPhone silent switch**: when Ryz is closed, iOS notifications are silent in silent mode. The fix is Apple's **AlarmKit** (iOS 26+), which rings like the Clock app. It needs a native module and is the top priority for version 2.
- **Android lock screen**: Ryz rings from a notification; it doesn't yet take over the lock screen with a full-screen alarm (that needs the full-screen intent, also a native module).
- **When the app is in the background on Android**, in-app playback uses media volume. Notifications use alarm volume.
- **Squat counting** uses a simple motion pattern (a dip then a peak), tuned on synthetic data. It needs testing on real phones and people.
- **Not built yet**, from the research list: a voice alarm (record a familiar voice), a smart wake window from Apple Health / Health Connect sleep data, smart-bulb dawn light, and a study with a sleep researcher to measure whether Ryz actually reduces grogginess.
- The bundle identifier `com.ryzalarm.app` in `app.json` is a placeholder. Change it to your own before publishing.

## Sources

- Weather: Open-Meteo.com (CC BY 4.0). Place names on web: © OpenStreetMap contributors.

- Bruck & Thomas, low-frequency alarms and waking deep sleepers: https://vuir.vu.edu.au/3994
- McFarlane et al. (RMIT, 2020), melodic alarms: https://neurosciencenews.com/alarm-music-grogginess-15625/
- Sundelin et al. (2023), snoozing: https://livescience.com/health/sleep/hitting-snooze-can-boost-morning-cognition-study-hints
- Hilditch & McHill (2019), sleep inertia: https://pmc.ncbi.nlm.nih.gov/articles/PMC6710480/
- Windred et al. (2024), sleep regularity: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10782489/
- AASM & SRS (2015), sleep duration: https://aasm.org/aasm-and-srs-publish-new-sleep-duration-consensus-statement/
