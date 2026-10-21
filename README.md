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

On first launch: a welcome screen, then **create an account** (name, email, password) or **log in**, pick your **news topics**, then say **what you want to improve** (wake up on time, stop snoozing, feel less groggy, sleep longer, regular schedule… or *Something else*, in your own words). Accounts use Supabase and are required; your name, news topics, goals and sleep goal are saved to the account and come back when you log in on another phone. Alarms and sleep history stay on the phone, so alarms always work offline.

## Morning (home)

- **Weather where you wake up**, laid out like Alarmy's morning screen: your town (tap to refresh), the temperature on the left, conditions and today's high and low on the right, and the next 24 hours with white weather icons underneath. Data from Open-Meteo (no API key); the town name comes from the phone's geocoder.
- **A realistic sky that matches the weather**, like the iPhone Weather app: 13 rendered skies (clear, partly cloudy, overcast, rain, storm, snow, fog; day and night) that drift slowly, with animated rain, drops on the glass, snow and lightning on top. They're made by `scripts/generate-skies.py` (`npm run skies`). Everything holds still when Reduce Motion is on.
- **Shortcut tiles** on the scene: your **XP** (tap to see how to earn more), **Add alarm**, **Power nap** (the quick alarm) and **Last night**'s sleep.
- **Next alarm** card with how long until it rings, its sound and missions.
- **Your news**: 31 categories, 384 topics and 435 sub-topics (850 in all), exactly as listed in [docs/news-brief.md](docs/news-brief.md), from World, Local & National and Politics to Sports, Lifestyle and Utilities. IDs are hierarchical (`sports.football.premier-league`, `finance.crypto.bitcoin`, `disasters.accidents.plane-crashes`), and you can **follow or mute any level**: the closest choice wins, so you can mute Football but still follow Transfers. You can also **follow names**: teams, players, leagues, companies, tickers, people, countries (all of them, A to Z), cities and any keyword. Stories come from a **registry of 376 sources** (publishers, broadcasters, news agencies, official bodies like NASA, the Fed, the ECB, the WHO, USGS and UN disaster alerts, specialist trade press, fact-checkers, podcasts and YouTube news channels) in 18 languages and 49 countries, plus Google News in 23 editions. Each source lists its country, language, whether it has a paywall, and notes. Every node has at least one working source, and niche topics have specialist ones.
  - **Feeds**: For you, Following, Top stories, Breaking, Trending and a Daily digest (the day's dozen biggest stories from what you follow). Format filters: articles, videos, podcasts, live blogs, photo galleries, long reads and short briefs.
  - **Stories, not duplicates**: the same news from many publishers becomes one card ("BBC + 11 more"), and a big ongoing story has its own page with every source as a timeline, the past week's coverage, and a Follow button.
  - **Auto-tagging**: each story is tagged with its categories (one story can be in several), topics and sub-topics, countries and regions, language, the names in it, and its format.
  - **News settings**: languages and editions, your country, region and city (for Local & National), only some world regions, preferred and blocked sources, paywalled sources on or off, muted words and muted topics.
  - **Tap a story to read it inside Ryz**: a clean reader view (photo, title, text) when the page allows it, otherwise the publisher's page shown in Ryz itself; no browser, no link to follow. At the bottom: the original page, "Also in N more sources" (the story's page with every publisher), and follow or mute its topic. The order (newest, recommended, most sources) and type (articles, videos, podcasts…) sit behind the small filter icon. All sources are public RSS/Atom feeds or Google News RSS.
  - **Sort**: Newest (the default), Recommended, or Most sources.
  - **Choosing**: a grid of the 31 categories; open one to follow it whole or tap its topics and sub-topics as chips (switch to *Tap to mute* to mute). A strip at the top lists everything you follow and mute, one tap to remove, and **Erase all my choices** starts over.
  - It stays up to date (every 5 minutes while open, on return, on pull-down), stories appear as each source answers, slow sites are skipped, and the Following and For you feeds keep loading older news as you scroll. Topics picked in older versions of Ryz move over to the new taxonomy automatically.

Four tabs: **Morning**, **Alarms**, **Sleep** and **Settings**, in the native iOS tab bar on iPhone (a floating pill on web). **Alarms** shows the time big, a 12h/24h switch, when the next alarm rings, your alarms, and a round + button to add one.

The **alarm editor** copies Alarmy's layout and text sizes: the alarm name, "Ring in …", a scroll wheel for the time, the repeat days with a *Daily* box, mission slots, an *Alarm sound* card (play button with a progress bar, volume slider, vibration box, gentle wake-up, keep ringing) and *Custom setting* (snooze). Each setting opens in a bottom sheet, and Save stays at the bottom of the screen.

## Missions

Like Alarmy: with missions on, **Stop** starts them, and the alarm only turns off when they're done. Up to five per alarm, done in order. You choose **how many** of each, from 1 to 100, with a slider (tap the boxed number to type it), and how hard. Puzzles never repeat within a mission: sums come in several shapes per level (+, −, ×, ÷, brackets), and sentences and words come from large shuffled pools. While you work, the alarm turns down; if you stop for a while (5 s to 1 min, Settings) it's back to full volume. An optional **time limit per mission** (30 s to 3 min) restarts the mission with a new puzzle when it runs out.

| Wake your brain | Wake your body | Scientific |
| --- | --- | --- |
| **Math**: sums, easy to hard | **Shake** the phone hard | **Reaction test**: tap the moment the screen lights up. The psychomotor vigilance task sleep labs use to measure alertness (Basner & Dinges) |
| **Memory**: repeat the squares that light up | **Squats**, phone held to your chest | **Arrow test**: answer where the arrow points, not what the word says (a spatial Stroop test of attention) |
| **Typing**: type sentences word for word | **Steps** | |
| **Number hunt**: tap 1, 2, 3… on a shuffled grid | **Jumping jacks** | |
| **Odd one out**: find the square that's a different grey | **Scan a code**: register any QR code or barcode (toothpaste, coffee jar…) and scan it to stop the alarm, so you have to get up | |
| **Missing sign**: `12 ? 4 = 48` | **30-second sprint**: run on the spot; the clock only runs while you move hard. 30 s of hard exercise after waking made people feel less sleepy and boosted waking cortisol (Kovac et al., 2021) | |
| **Unscramble** a word | **Torso twists** (gyroscope), **Reach for the sky** (arm raises) | |
| | **Let the light in** (Android): open the curtains or turn on the lights until the room reaches 100 / 400 / 1,000 lux. Bright light after waking raised alertness and energy at home (Sleep Health, 2024) | |

Every mission has **Try it** in the editor. On a phone without the needed sensor, a body mission turns into sums so you can always turn the alarm off (an iPhone has no light sensor apps can read, so Let the light in becomes sums there).

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
- **Sleep coaching**: a sleep goal (7–9 h, since adults need at least 7 according to AASM/SRS), the bedtime that goal implies on the home screen, an optional bedtime reminder before the earliest alarm of each morning, and an optional **last call for coffee** 3–12 hours before bedtime (caffeine even 6 hours before bed cost about an hour of sleep; Drake et al., 2013).
- **Sleep sounds** on the Sleep tab, one small row with a play button (tap it to pick the sound, timer and volume): rain, ocean, stream, forest, pink or brown noise, with a 15–90 minute timer (or all night) that fades out over the last minute. They keep playing with the screen locked, and an alarm always stops them.
- **Sleep debt** over the last 14 days, with a gentle payback plan (a long lie-in doesn't undo a short week; Depner et al., 2019).
- **Night notes**: tap a night to rate it and note the day before (caffeine after 2 pm, alcohol, exercise, late meal, screens in bed, stress, nap, new place). Once there are a few nights with and without each, **What affects your sleep** shows how much longer or shorter you sleep with it.
- **Ringing screen**: black, with the time inside a dial of 60 ticks that fill with the seconds, a dot sweeping round once a minute and a breathing glow. The screen turns up to full brightness (light right after waking helps clear grogginess; Settings can turn it off).
- **Good-morning screen** greets you by name, asks how you slept, and lists what helps after waking: bright light, music you like, the same wake time tomorrow.

## XP and Ryz Pro

**Free and Pro.** The free plan is a complete alarm app: unlimited alarms, 6 missions (math, memory, typing, shake, squats, steps) with up to 3 per alarm, 8 sounds, 2 vibration patterns, the sleep tracker by week, 2 weeks and month, power naps, and news for 5 follows (topics or names). Pro adds all 18 missions and up to 5 per alarm, all 39 sounds and every vibration, a year or any dates of sleep history, automatic sleep from a smartwatch, and unlimited news follows. Locked items show a small PRO tag; sounds and vibrations can still be previewed, and tapping a locked item opens the paywall about that feature. An alarm that already uses a Pro sound or mission keeps working after Pro ends: waking people up comes first.

**The 14-day reverse trial.** Everyone gets full Pro for 14 days once they finish signing up, with no card. Morning shows the days left, and from 3 days before the end, a reminder. When it ends, Ryz says so once and lists what Pro was doing for you. The trial is once per account (its start date is saved to the account). Why this design: people value something they already have about twice as much as something they don't (loss aversion, the endowment effect), and longer trials convert best (RevenueCat, *State of Subscription Apps 2025*: 17–32-day trials have the highest trial-to-paid rate, 45.7%; Strava and Ladder grew with reverse trials).

**The paywall** leads with the feature you tapped, defaults to the yearly plan, shows each plan as a monthly price next to the monthly plan (anchoring, with 6 months as the stepping stone that makes the year the obvious deal), shows an honest trial timeline and "cancel anytime". The plans (1, 3, 6, 12 months) have placeholder prices, and payments aren't connected yet: that needs App Store / Google Play subscriptions, for example through RevenueCat.

**XP.** You earn XP for good mornings and nights: getting up with your alarm (+10), no snooze (+15), up within a minute (+10), each mission (+5), the awake check (+10, once a day), a regular wake-up time (+10), tracking a night (+5), reaching your sleep goal (+25) and every 7-day no-snooze streak (+50). Test alarms, naps and nights typed in by hand earn nothing. A perfect month earns about 3,500 XP. Morning shows your progress to the next reward (the goal-gradient effect).

**The XP shop** gives a taste of Pro, not a replacement for it: 3 days for 1,500 XP, a week for 3,000, two weeks for 5,500, at most one pass every 30 days and never during a trial or subscription. It also sells **40% off the first year** (2,500 XP, valid 7 days), which turns XP into a reason to subscribe, and **streak freezes** (400 XP, hold up to 2), which cover one missed morning; Duolingo found a little slack keeps people going.

## Quick alarm

Tap **+** on Alarms (or **Power nap** on Morning) and choose **Quick alarm** for a power nap: 10, 20, 26 (NASA's nap), 45 or 90 minutes, or any length up to 3 hours. It rings once at exactly that time, with no missions or snooze, shows a live countdown on Alarms, and removes itself afterwards.

## Sleep

- **Start sleep** when you go to bed; stopping your alarm ends it (or tap *I'm awake*). Nights can also be added by hand and deleted with a long press.
- **Smartwatch**: switch it on and nights come in by themselves from Apple Health (Apple Watch, or any watch that writes to Health) or Health Connect (Galaxy Watch, Pixel Watch, Fitbit, Garmin…). While it's on, the Start button is disabled, because there's nothing to press. Not wearing the watch tonight? Switch it off and use the button. This needs a real build of the app (see *Running it*); Expo Go explains that and keeps the button.
- **Ranges**: week, 2 weeks, month, year, or any dates from a calendar. Long ranges average by week or by month.
- Stats: your **average night** against your goal, hours per night (tap a column for details), average bedtime and wake-up with their spread, **regularity**, **sleep debt**, nights on goal, **weekend shift** (social jet lag, Wittmann et al., 2006), longest and shortest night, and how you felt.
- One research-based note at a time: under 7 hours (AASM/SRS), irregular mornings (Windred et al., 2024), or short of your goal.

## Settings

A short list, like iOS Settings; each row opens its own page.

- **Account** (top): your name and email; on its page, Log out and Erase all data. An account is required: when you're signed out, Ryz shows the welcome screen until you log in.
- **Ryz Pro** and **XP**.
- **Alarms**: time for each mission, quieter during missions and how long before full volume comes back, bright screen when ringing, daylight reminder.
- **Sleep**: sleep goal, bedtime reminder, last call for coffee.
- **News**: news settings (languages, regions, sources, muted words) and what you follow.
- **Goals**: what you want to improve.
- **General**: 24-hour clock, °C or °F, location for the weather.
- **Will my alarm ring?**: notification status and a test alarm. **The research**: the studies behind Ryz.
- **Test alarm** in Settings, plus a check that notifications and (on Android) exact alarms are allowed.
- **Swipe an alarm left** to delete it. Time settings (fade-in, snooze, keep ringing, the awake check, mission time limits, sleep goal…) use a slider plus a boxed number you can tap to type.
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
  app/            screens (Expo Router): tabs (morning, alarms, sleep, settings), alarm editor, ringing, try a mission, "Are you awake?", good morning, news topics (follow/mute tree), news settings, story pages, article cards
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
- News: the taxonomy is in `src/core/taxonomy.ts` and the source registry in `src/core/sources.ts`. `src/core/__tests__/taxonomy.test.ts` ticks every item of `docs/news-brief.md` off against the taxonomy (814 items), and `newsEngine.test.ts` checks that every node has a feed in any language setup and that every feed is in the registry.

- Bruck & Thomas, low-frequency alarms and waking deep sleepers: https://vuir.vu.edu.au/3994
- McFarlane et al. (RMIT, 2020), melodic alarms: https://neurosciencenews.com/alarm-music-grogginess-15625/
- Sundelin et al. (2023), snoozing: https://livescience.com/health/sleep/hitting-snooze-can-boost-morning-cognition-study-hints
- Hilditch & McHill (2019), sleep inertia: https://pmc.ncbi.nlm.nih.gov/articles/PMC6710480/
- Basner & Dinges (2011), the psychomotor vigilance test: https://pubmed.ncbi.nlm.nih.gov/21532953/
- Vallat et al. (2022), activity, sleep and morning alertness: https://www.nature.com/articles/s41467-022-34503-2
- Hirshkowitz et al. (2015), sleep needed by age: https://pubmed.ncbi.nlm.nih.gov/29073412/
- Windred et al. (2024), sleep regularity: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10782489/
- AASM & SRS (2015), sleep duration: https://aasm.org/aasm-and-srs-publish-new-sleep-duration-consensus-statement/
