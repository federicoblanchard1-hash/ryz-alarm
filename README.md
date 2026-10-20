# Ryz

An alarm app for deep sleepers and normal sleepers, built with Expo (SDK 57) and grounded in sleep research. Black and white, in the Outfit font, with a layout that follows Alarmy's; the only colour is the weather sky.

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

## Getting started

On first launch: a welcome screen, then **create an account** (name, email, password) or **log in**, pick your **news topics**, then say **what you want to improve** (wake up on time, stop snoozing, feel less groggy, sleep longer, regular schedule… or *Something else*, in your own words). Accounts use Supabase; your name, age, news topics, goals and sleep goal are saved to the account and come back when you log in on another phone. Alarms and sleep history stay on the phone, so alarms always work offline.

## Morning (home)

- **Weather where you wake up**, laid out like Alarmy's morning screen: your town (tap to refresh), the temperature on the left, conditions and today's high and low on the right, and the next 24 hours with white weather icons underneath. Data from Open-Meteo (no API key); the town name comes from the phone's geocoder.
- **A realistic sky that matches the weather**, like the iPhone Weather app: 13 rendered skies (clear, partly cloudy, overcast, rain, storm, snow, fog; day and night) that drift slowly, with animated rain, drops on the glass, snow and lightning on top. They're made by `scripts/generate-skies.py` (`npm run skies`). Everything holds still when Reduce Motion is on.
- **Shortcut tiles** on the scene: next alarm, bedtime, sleep goal and a test alarm.
- **Next alarm** card with how long until it rings, its sound and missions.
- **Your news**: on first launch Ryz asks what you like to read, from 13 categories and 133 topics, each category opening into its sub-topics (Football into Premier League, Champions League, La Liga, Serie A…; Countries into France, Germany, Japan…; Science into Space, Physics, Neuroscience…). It stays up to date: re-fetched every 5 minutes while Ryz is open, when you come back to the app or the tab, and when you pull down on Morning, with "Updated x min ago" under the title. Stories come from over 50 free publishers (BBC, The Guardian, The New York Times, Sky, France 24, Euronews, Le Monde, Wired, The Verge, ESPN, Autosport, Variety, Space.com…), and the feed takes turns between them so no single source fills it. Stories appear as each publisher answers, a slow site is skipped after a few seconds, and the feed goes back in time as you scroll: it shows more stories each time you reach the end, and once those run out it keeps loading older news, a few days at a time, from Google News. A small **search bar** finds anything: it filters your stories and searches every publisher through Google News. They open in Ryz's own reader view, which shows only the text and pictures, so there are no pop-ups, cookie banners or sign-up walls. A page that can't be read that way (a video, or one a site won't share outside a browser) opens in an in-app browser, in Safari Reader on iPhone. Ryz can't get round region blocks or paywalls, which is why it sticks to free sources. Change topics in Settings → News.

Four tabs: **Morning**, **Alarms**, **Sleep** and **Settings**, in the native iOS tab bar on iPhone (a floating pill on web). **Alarms** shows the time big, a 12h/24h switch, when the next alarm rings, your alarms, and a round + button to add one.

The **alarm editor** copies Alarmy's layout and text sizes: the alarm name, "Ring in …", a scroll wheel for the time, the repeat days with a *Daily* box, mission slots, an *Alarm sound* card (play button with a progress bar, volume slider, vibration box, gentle wake-up, keep ringing) and *Custom setting* (snooze). Each setting opens in a bottom sheet, and Save stays at the bottom of the screen.

## Missions

Like Alarmy: with missions on, **Stop** starts them, and the alarm only turns off when they're done. Up to five per alarm, done in order. You choose **how many** of each, from 1 to 100, with a slider (tap the number to type it), and how hard. Puzzles never repeat within a mission: sums come in several shapes per level (+, −, ×, ÷, brackets), and sentences and words come from large shuffled pools. While you work, the alarm turns down; if you stop for a while (5 s to 1 min, Settings) it's back to full volume. An optional **time limit per mission** (30 s to 3 min) restarts the mission with a new puzzle when it runs out.

| Wake your brain | Wake your body | Scientific |
| --- | --- | --- |
| **Math**: sums, easy to hard | **Shake** the phone hard | **Reaction test**: tap the moment the screen lights up. The psychomotor vigilance task sleep labs use to measure alertness (Basner & Dinges) |
| **Memory**: repeat the squares that light up | **Squats**, phone held to your chest | **Arrow test**: answer where the arrow points, not what the word says (a spatial Stroop test of attention) |
| **Typing**: type sentences word for word | **Steps** | |
| **Number hunt**: tap 1, 2, 3… on a shuffled grid | **Jumping jacks** | |
| **Odd one out**: find the square that's a different grey | **Scan a code**: register any QR code or barcode (toothpaste, coffee jar…) and scan it to stop the alarm, so you have to get up | |
| **Missing sign**: `12 ? 4 = 48` | | |
| **Unscramble** a word | | |

Every mission has **Try it** in the editor. On a phone without the needed sensor, a body mission turns into sums so you can always turn the alarm off.

## Alarms

- **Two wake-up styles**
  - **Gentle** for normal sleepers: a melody that starts almost silent and fades in (30 s to 5 min). Melodic alarms were linked with less morning grogginess than harsh beeps (McFarlane et al., 2020).
  - **Deep sleeper**: a low 520 Hz square-wave tone in bursts of three (the T-3 pattern). In fire-safety research it woke far more deep sleepers than the usual ~3 kHz beep, and it's the tone US fire code now requires in bedrooms (Bruck & Thomas). Stopping it takes a 1.5 s hold, so a half-asleep tap can't turn it off.
- **39 sounds in three tabs, each with sub-groups**:
  - *Scientific*: low tones (520 Hz and 400 Hz deep-sleeper square waves) and melodic (gentle, rising and rhythmic melodies).
  - *Loud*, full volume and nonstop, with a hold to stop: sirens (air raid, wail, yelp, two-tone, hi-lo, red alert, klaxon, foghorn, car alarm), beeps (continuous tone, rapid pulse, digital buzzer, escalating beeps, smoke detector) and bells (alarm clock, fire bell, old phone, reveille bugle).
  - *Calm*, fading in: nature (birdsong, morning forest, rain, stream, ocean, wind chimes), music (sunrise, soft piano, harp, guitar, kalimba, music box, lo-fi, singing bowl) and noise (pink, brown).
  All are synthesized by `scripts/generate-sounds.mjs` (`npm run sounds`), so there's nothing to license.
- **Volume slider** that follows your finger on the UI thread, plays the sound while you drag so you hear the level, and ticks every 10%.
- **Vibration patterns**: basic, heartbeat, rapid, strong, waves, SOS. Tap one to feel it.
- **Escalation**: if you sleep through a gentle or calm sound, the deep tone takes over after 1–5 minutes.
- **Snooze** of 5–30 minutes, limited to 1–5 times. Snoozing for up to about 30 minutes didn't hurt sleep or mood in a 2023 study (Sundelin et al.). If nobody touches the alarm for the whole ring time (5–15 min), it snoozes itself while snoozes are left.
- **"Are you awake?"**: a few minutes after you stop the alarm, Ryz asks. If you don't answer in time, it rings again with the deep tone.
- **Sleep coaching**: a sleep goal (7–9 h, since adults need at least 7 according to AASM/SRS), the bedtime that goal implies on the home screen, and an optional bedtime reminder before the earliest alarm of each morning.
- **Ringing screen**: black, with the time inside a dial of 60 ticks that fill with the seconds, a dot sweeping round once a minute and a breathing glow. The screen turns up to full brightness (light right after waking helps clear grogginess; Settings can turn it off).
- **Good-morning screen** greets you by name, asks how you slept, and lists what helps after waking: bright light, music you like, the same wake time tomorrow.

## Quick alarm

Tap **+** on Alarms and choose **Quick alarm** for a power nap: 10, 20, 26 (NASA's nap), 45 or 90 minutes, or any length up to 3 hours. It rings once at exactly that time, with no missions or snooze, shows a live countdown on Alarms, and removes itself afterwards.

## Sleep

- **Start sleep** when you go to bed; stopping your alarm ends it (or tap *I'm awake*). Nights can also be added by hand and deleted with a long press.
- **Smartwatch**: switch it on and nights come in by themselves from Apple Health (Apple Watch, or any watch that writes to Health) or Health Connect (Galaxy Watch, Pixel Watch, Fitbit, Garmin…). While it's on, the Start button is disabled, because there's nothing to press. Not wearing the watch tonight? Switch it off and use the button. This needs a real build of the app (see *Running it*); Expo Go explains that and keeps the button.
- **Ranges**: week, 2 weeks, month, year, or any dates from a calendar. Long ranges average by week or by month.
- Stats: your **average night** against your goal, hours per night (tap a column for details), average bedtime and wake-up with their spread, **regularity**, **sleep debt**, nights on goal, **weekend shift** (social jet lag, Wittmann et al., 2006), longest and shortest night, and how you felt.
- One research-based note at a time: under 7 hours (AASM/SRS), irregular mornings (Windred et al., 2024), or short of your goal.

## Settings

- **Account**: who's signed in, and Log out.
- **Profile**: your name and age group. Your age suggests a sleep goal (Hirshkowitz et al., 2015).
- **Your goals**: what you picked at sign-up; change them any time.
- **Missions**: time for each mission, quieter during missions, and how long before the alarm is back at full volume.
- **Waking up**: bright screen when ringing, daylight reminder.
- Sleep goal and bedtime reminder, clock and temperature units, alarm checks and a test alarm, news topics, location, erase all data, and the research behind Ryz.
- **Test alarm** in Settings, plus a check that notifications and (on Android) exact alarms are allowed.
- Repeat days, alarm names, volume, vibration, a 12/24-hour clock, haptics, reduced-motion support, and screen-reader labels.

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

The alarm sounds are generated by `scripts/generate-sounds.mjs` (`npm run sounds`) and the weather skies by `scripts/generate-skies.py` (`npm run skies`, needs Python with numpy and Pillow).

## Project layout

```
src/
  app/            screens (Expo Router): tabs (morning, alarms, sleep, settings), alarm editor, ringing, try a mission, "Are you awake?", good morning, news topics, article reader
  core/           plain TypeScript, unit-tested: the alarm model, when things ring, the notification plan, volume fades, missions, sounds, vibration, sleep stats, weather, news
  missions/       the mission screens and the runner
  services/       expo-notifications scheduling, expo-audio playback, location and weather
  state/          the store (saved with AsyncStorage) and permission state
  components/     shared UI
assets/sounds/    the alarm and reminder sounds
assets/weather/   the rendered sky backgrounds
```

## Known limits and next steps

- **iPhone silent switch**: when Ryz is closed, iOS notifications are silent in silent mode. The fix is Apple's **AlarmKit** (iOS 26+), which rings like the Clock app. It needs a native module and is the top priority for version 2.
- **Android lock screen**: Ryz rings from a notification; it doesn't yet take over the lock screen with a full-screen alarm (that needs the full-screen intent, also a native module).
- **When the app is in the background on Android**, in-app playback uses media volume. Notifications use alarm volume.
- **Sign-up emails**: Supabase's built-in email service only sends to the project team's addresses. Before other people sign up, either turn off **Confirm email** (Supabase dashboard → Authentication → Sign In / Providers → Email) or add your own SMTP server.
- **Alarms and sleep history** are kept on the phone, not in the account yet.
- **Squat counting** uses a simple motion pattern (a dip then a peak), tuned on synthetic data. It needs testing on real phones and people.
- **Not built yet**, from the research list: a voice alarm (record a familiar voice), a smart wake window from Apple Health / Health Connect sleep data, smart-bulb dawn light, and a study with a sleep researcher to measure whether Ryz actually reduces grogginess.
- The bundle identifier `com.ryzalarm.app` in `app.json` is a placeholder. Change it to your own before publishing.

## Sources

- Weather: Open-Meteo.com (CC BY 4.0). Place names on web: © OpenStreetMap contributors.
- News: BBC, The Guardian and Ars Technica RSS feeds; each story links to its original page.

- Bruck & Thomas, low-frequency alarms and waking deep sleepers: https://vuir.vu.edu.au/3994
- McFarlane et al. (RMIT, 2020), melodic alarms: https://neurosciencenews.com/alarm-music-grogginess-15625/
- Sundelin et al. (2023), snoozing: https://livescience.com/health/sleep/hitting-snooze-can-boost-morning-cognition-study-hints
- Hilditch & McHill (2019), sleep inertia: https://pmc.ncbi.nlm.nih.gov/articles/PMC6710480/
- Basner & Dinges (2011), the psychomotor vigilance test: https://pubmed.ncbi.nlm.nih.gov/21532953/
- Vallat et al. (2022), activity, sleep and morning alertness: https://www.nature.com/articles/s41467-022-34503-2
- Hirshkowitz et al. (2015), sleep needed by age: https://pubmed.ncbi.nlm.nih.gov/29073412/
- Windred et al. (2024), sleep regularity: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10782489/
- AASM & SRS (2015), sleep duration: https://aasm.org/aasm-and-srs-publish-new-sleep-duration-consensus-statement/
