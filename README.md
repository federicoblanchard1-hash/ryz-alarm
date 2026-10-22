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

On first launch: a welcome screen, then **create an account** (name, email, password), **log in**, or **continue without an account**, then say **what you want to improve** (wake up on time, stop snoozing, feel less groggy, sleep longer, regular schedule… or *Something else*, in your own words). Accounts use Supabase and are optional (Sleep Cycle's reviews are full of people who left over a forced sign-up); with one, your name, goals and sleep goal are saved to the account and come back when you log in on another phone. Alarms work offline; your alarms, nights and moods are also backed up to the account, so a new phone or a reinstall gets them back (a phone that already has alarms keeps its own).

## Morning (home)

- **Weather where you wake up**, laid out like Alarmy's morning screen: your town (tap to refresh), the temperature on the left, conditions and today's high and low on the right, and the next 24 hours with white weather icons underneath. Data from Open-Meteo (no API key); the town name comes from the phone's geocoder.
- **A realistic sky that matches the weather**, like the iPhone Weather app: 13 rendered skies (clear, partly cloudy, overcast, rain, storm, snow, fog; day and night) that drift slowly, with animated rain, drops on the glass, snow and lightning on top. They're made by `scripts/generate-skies.py` (`npm run skies`). Everything holds still when Reduce Motion is on.
- **Shortcut tiles** on the scene: your **XP** (tap to see how to earn more), **Mood** (today's face; tap for the calendar), **Power nap** (the quick alarm) and **Last night**'s sleep.
- **Next alarm** as one slim row: the time, how long until it rings, its name and missions. Tap to edit.
- **Mood**: Ryz asks *How's your mood now?* after you finish your morning missions, and *How was your day?* when you tap Start sleep. Seven black-and-white faces, to match the rest of the app: Happy, Calm, Okay, Tired, Sad, Stressed, Angry. The Mood screen is a month calendar (big face: morning, small: evening), a day's details with the sleep before it, the month's counts, and how your morning mood compares after full and short nights. You can also log a mood there any time.
- **Today**, from your own sleep, in place of a news feed (reading the news right after waking goes with more stress, and Alarmy's own morning panel is just weather, news and horoscopes). It reads top to bottom:
  - **Right now**: what your energy is like at this moment in plain words (*Best focus until 11:30 AM: your sharpest hours, do the hardest thing first*), and what's next.
  - **Your day**: a small bar chart from wake-up to bedtime (taller = more energy, the white bar is now, with Noon and 6 PM marked) and the times in a list, time first: waking up (sleep inertia, longer after a short night or sleep debt), best focus, the afternoon dip (a short nap or walk), last coffee (at least 6 h before bed, or your *Last call for coffee* setting), second wind, wind down and bed (your sleep goal before tomorrow's alarm). Past steps fade; the current one says *Now*.
  - It starts from this morning's wake-up and last night's sleep; before you're up, from your usual wake-up time or today's alarm. It's an estimate built on well-studied patterns (Hilditch & McHill, 2019; Monk, 2005; Drake et al., 2013; Van Dongen et al., 2003), and says so.
  - **Get daylight**: 10 minutes outside in the first two hours, ticked off for 10 XP once a day (Burns et al., 2023: more daytime light, lower depression risk).
  - **Wake-up streak**: your streak of mornings within 30 minutes of your usual time, the last 7 days as dots, and how much your wake-up moves (Windred et al., 2024).
  - **Sample nights** fill Sleep and Today until you've tracked 3 nights of your own, with a *Sample* tag and a one-tap *Hide* (or Settings → Sleep → Sample nights).

Four tabs: **Morning**, **Alarms**, **Sleep** and **Settings**, in the native iOS tab bar on iPhone (a floating pill on web). **Alarms** shows the time big, a 12h/24h switch, when the next alarm rings, your alarms, and a round + button to add one.

The **alarm editor** copies Alarmy's layout and text sizes: the alarm name, "Ring in …", a scroll wheel for the time, the repeat days with a *Daily* box, mission slots, an *Alarm sound* card (play button with a progress bar, volume slider, vibration box, gentle wake-up, keep ringing) and *Custom setting* (snooze). Each setting opens in a bottom sheet, and Save stays at the bottom of the screen.

## Missions

Like Alarmy: with missions on, **Stop** starts them, and the alarm only turns off when they're done. Up to five per alarm, done in order. You choose **how many** of each, from 1 to 100, with a slider (tap the boxed number to type it), and how hard. Puzzles never repeat within a mission: sums come in several shapes per level (+, −, ×, ÷, brackets), and sentences and words come from large shuffled pools. **While you work, the alarm is silent.** If you stop for a while (5 s to 2 min, Settings → Alarms) it rings again, and an optional **time limit per mission** restarts the mission with a new puzzle and rings again when it runs out. It only stops for good when every mission is done. There's no *new puzzle* button, so you can't skip one. But if a mission can't be done (the camera won't read your code, the phone won't count steps), after 2 minutes a **Stuck? Do sums instead** button appears, so you're never left with an alarm you can't stop.

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

**Free and Pro.** The free plan is a complete alarm app: unlimited alarms, 6 missions (math, memory, typing, shake, squats, steps) with up to 3 per alarm, 8 sounds, 2 vibration patterns, the sleep tracker by week, 2 weeks and month, power naps and the Today plan. Pro adds all 18 missions and up to 5 per alarm, all 39 sounds and every vibration, a year or any dates of sleep history, automatic sleep from a smartwatch, every app icon (3 styles and 12 seasonal ones), and Family Sharing (one plan for up to 6 people). No ads on any plan. Locked items show a small PRO tag; sounds and vibrations can still be previewed, and tapping a locked item opens the paywall about that feature. An alarm that already uses a Pro sound or mission keeps working after Pro ends: waking people up comes first.

**The 14-day reverse trial.** Everyone gets full Pro for 14 days once they finish signing up, with no card. Morning shows the days left, and from 3 days before the end, a reminder. When it ends, Ryz says so once and lists what Pro was doing for you. The trial is once per account (its start date is saved to the account). Why this design: people value something they already have about twice as much as something they don't (loss aversion, the endowment effect), and longer trials convert best (RevenueCat, *State of Subscription Apps 2025*: 17–32-day trials have the highest trial-to-paid rate, 45.7%; Strava and Ladder grew with reverse trials).

**The paywall** leads with the feature you tapped, defaults to the yearly plan, shows each plan as a monthly price next to the monthly plan (anchoring, with 6 months as the stepping stone that makes the year the obvious deal), shows an honest trial timeline and "cancel anytime". The plans (1, 3, 6, 12 months) have placeholder prices, and payments aren't connected yet: that needs App Store / Google Play subscriptions, for example through RevenueCat.

**XP.** You earn XP for good mornings and nights: getting up with your alarm (+10), no snooze (+15), up within a minute (+10), each mission (+5), the awake check (+10, once a day), a regular wake-up time (+10), tracking a night (+5), reaching your sleep goal (+25) and every 7-day no-snooze streak (+50). Test alarms, naps and nights typed in by hand earn nothing. A perfect month earns about 3,500 XP. Morning shows your progress to the next reward (the goal-gradient effect).

**The XP shop** gives a taste of Pro, not a replacement for it: 3 days for 1,500 XP, a week for 3,000, two weeks for 5,500, at most one pass every 30 days and never during a trial or subscription. It also sells **40% off the first year** (2,500 XP, valid 7 days), which turns XP into a reason to subscribe, and **streak freezes** (400 XP, hold up to 2), which cover one missed morning; Duolingo found a little slack keeps people going.

## Quick alarm

Tap **+** on Alarms (or **Power nap** on Morning) and choose **Quick alarm** for a power nap: 10, 20, 26 (NASA's nap), 45 or 90 minutes, or any length up to 3 hours. It rings once at exactly that time, with no missions or snooze, shows a live countdown on Alarms, and removes itself afterwards.

## Sleep

- **Start sleep** when you go to bed; stopping your alarm ends it (or tap *I'm awake*). Nights can also be added by hand and deleted with a long press.
- **Smartwatch** (off by default): the first time you switch it on, Ryz asks you to accept that it reads your sleep (only when you fell asleep and woke up; nothing is written to the watch or Health), then your phone asks for permission. Once nights arrive, the Sleep tab shows **which watch is connected** ("Federico's Apple Watch", "Galaxy Watch"…), and so does Settings → Sleep. Nights come in by themselves from Apple Health (Apple Watch, or any watch that writes to Health) or Health Connect (Galaxy Watch, Pixel Watch, Fitbit, Garmin…). While it's on, the Start button is disabled, because there's nothing to press. Not wearing the watch tonight? Switch it off and use the button. This needs a real build of the app (see *Running it*); Expo Go explains that and keeps the button.
- **Ranges**: week, 2 weeks, month, year, or any dates from a calendar. Long ranges average by week or by month.
- Stats: your **average night** against your goal, hours per night (tap a column for details), average bedtime and wake-up with their spread, **regularity**, **sleep debt**, nights on goal, **weekend shift** (social jet lag, Wittmann et al., 2006), longest and shortest night, and how you felt.
- One research-based note at a time: under 7 hours (AASM/SRS), irregular mornings (Windred et al., 2024), or short of your goal.

## Fixed from Alarmy's 1–3 star reviews

We read Alarmy's recent low-star App Store reviews and made sure Ryz doesn't have the same problems:

- **"The ads have gotten insane"**: Ryz has no ads, on any plan.
- **"I wish I had the check-in feature"** (paywalled): the *Are you awake?* check is free.
- **Battery drain overnight**: Ryz does no background work. Alarms are scheduled with the system, and the sleep-sound timer only runs during its last-minute fade.
- **"It rings on the Home Screen and I have to search for the app to do the mission"**: a mission alarm's notification says *Tap to start your mission*, and tapping it opens the mission.
- **"It wakes up my whole house"**: **Wake only me** (alarm editor) buzzes for 10 s to 2 min before any sound, while Ryz is open.
- **"Didn't realise I'd be charged $60 after the trial"**: the trial needs no card and nothing is charged when it ends. The paywall shows the whole price.
- **"Subscriptions aren't family shareable"**: Pro is listed with Family Sharing. Turn it on for the subscription in App Store Connect when payments go live.
- **"I go back to sleep"** and re-rolling puzzles: there's no *new puzzle* button, missions are silent only while you're working on them, and the awake check rings again if you don't answer.
- **Alarms that don't go off**: alarms repeat on weekly system triggers (they ring even if Ryz isn't opened for weeks), with follow-up notifications that keep ringing, within iOS's 64-notification limit.

**Round two.** We then read 5,693 recent 1–3 star reviews across 7 alarm and sleep apps: Alarmy, Alarm Clock for Me, Sleep Cycle, Alarm Clock: Wake Up Music, Rise, Pillow and SuperAlarm. That's 5,511 from the US, UK, Canadian and Australian App Stores plus 182 from Alarmy on Google Play. The most common complaints were prices and paywalls (about 2,200), sleep tracking that's wrong and can't be fixed (about 780), ads (about 670), watch sync, bugs, and alarms that don't ring. What Ryz does about each one:

- **"It says it's not the right code" / "the step counter doesn't count" / "I had to restart my phone to stop it"**: *Stuck? Do sums instead* after 2 minutes on a mission.
- **"I can no longer edit the duration of my tracked sleep"** (Pillow) and wrong watch data: **Edit times** on any night, free; delete works too.
- **"I'd pay a flat fee, not $100 a year for an alarm"**: a **Lifetime** plan, pay once.
- **"Deleted the app by accident and lost everything"** (and Alarmy's 5-star reviews for restoring alarms): alarms, nights and moods are **backed up to your account** and come back on a new phone.
- **"Time zone change woke me at 4 am instead of 9"** (Pillow): one-time alarms keep their clock time when you travel.
- **"It doesn't work on silent / Do Not Disturb"** and *will it ring?* anxiety: Start sleep now shows tomorrow's alarm and whether notifications are on, with a one-tap fix, and on iPhone a reminder about the silent switch.
- **"Ads flash in the middle of the night"**, **forced trials on launch**: no ads, and the trial needs no card.

**Round three**, from the feature wishes in all 11,676 reviews (every star rating):

- **Your own song** as the alarm sound (alarm editor → Alarm sound → *Your own song*): any song you have as a file (MP3, M4A…), picked from Files and copied into Ryz. It plays while Ryz is open; if Ryz is closed, the alarm's regular sound rings, because iPhone notifications can only play short sounds built into the app.
- **Morning music** (Settings → Alarms): paste a Spotify, Apple Music, YouTube Music, Deezer or SoundCloud link (Share → Copy link) and *Play your morning music* appears after the alarm, or it starts by itself when you tap *I'm up*. Spotify and Apple Music don't let other apps use their songs as the alarm sound itself; the apps that claim to just launch Spotify and need it left open all night (MacStories on Alarmify), which is exactly the kind of alarm that fails.
- **Skip the next one**: for a repeating alarm, skip just the next ring (a holiday, a day off) without switching it off. The alarm list shows *skips Tue*, and it goes back to normal by itself.
- **Accounts are optional again**, and everything works without one.

Still not possible in an Expo app: Home Screen widgets (they need native widget code).

## Settings

A short list, like iOS Settings; each row opens its own page.

- **Account** (top): your name and email; on its page, Change password, Log out and Erase all data. Without an account, the page offers *Create an account* or *Log in*, to back up alarms, nights, moods and XP.
- **Ryz Pro** and **XP**.
- **Alarms**: time for each mission, quieter during missions and how long before full volume comes back, bright screen when ringing, daylight reminder.
- **Sleep**: sleep goal, bedtime reminder, last call for coffee.
- **Goals**: what you want to improve.
- **General**: 24-hour clock, °C or °F, location for the weather.
- **Will my alarm ring?**: notification status and a test alarm. **The research**: the studies behind Ryz.
- **Test alarm** in Settings, plus a check that notifications and (on Android) exact alarms are allowed.
- **Swipe an alarm left** to delete it. Time settings (fade-in, snooze, keep ringing, the awake check, mission time limits, sleep goal…) use a slider plus a boxed number you can tap to type.
- Repeat days, alarm names, volume, vibration, a 12/24-hour clock, haptics, reduced-motion support, and screen-reader labels.

## Logo and app icons

The logo is **rz**: a custom ligature cut from the wordmark's own typeface (Instrument Serif Italic), where the r's arm runs straight into the z's top stroke, so the icon and the name read as one family. It's white on black, centred exactly in width and height by its real outline, and the app icon, Android adaptive and themed (monochrome) icons, splash screen, favicon (a slightly bolder cut for small sizes) and `assets/brand/` (the master `rz.svg`, `mark.png` and a brand sheet) all come from one script:

```bash
pip install fonttools cairosvg pillow
python3 scripts/generate-brand.py
```

**Seasonal icons.** The rz never changes; each season or holiday only changes the tile colour and adds one small detail:

| Icon | Look | When Ryz suggests it |
| --- | --- | --- |
| Winter | snow on navy | 8 January – 19 March |
| Spring | a flower on cream | 20 March – 20 June |
| Summer | a sun on yellow | 21 June – 22 September |
| Autumn | maple leaves on rust | 23 September – 30 November |
| New Year | gold sparkles on black | 31 December – 7 January |
| Lunar New Year | a gold lantern on red, gold rz | the eve and first week (dates looked up to 2036) |
| Valentine's | a heart on red | 7 – 14 February |
| St Patrick's | a shamrock on green | 14 – 17 March |
| Easter | a painted egg on sky blue | Palm Sunday – Easter Monday (worked out each year) |
| Pride | a rainbow on black | June |
| Halloween | a witch hat on orange | 15 – 31 October |
| Christmas | a Santa hat on green | 1 – 30 December |

Holidays win over the season they fall in. There are also three **styles** with no dates, to use any time: **Light** (black on off-white), **Gold** (a gold rz on black) and **Sunrise** (white on a dawn gradient). Pick any of them in **Settings → General → App icon**; from a week before each season or holiday, a one-line card on Morning offers its icon ("Halloween icon · in 3 days"). Closing it, or using it, keeps it away until a week before the next one; *Suggest seasonal icons* turns it off.

**Icons are Pro.** Everyday is free; the styles and seasonal icons come with Ryz Pro (and the 14-day trial). Free users see them with a lock, and tapping one, or *Unlock* on the season card, opens the Pro screen about icons. An icon picked during the trial stays on the home screen after it ends; only switching needs Pro.

Switching icons uses `expo-alternate-app-icons`, which needs native code: it works in a development or store build, not in Expo Go (there the picker shows the icons and explains). On iPhone, iOS itself shows a short "You have changed the icon" message each time; apps can't switch silently.

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
  app/            screens (Expo Router): tabs (morning, alarms, sleep, settings), settings pages, alarm editor, ringing, try a mission, "Are you awake?", good morning, welcome, account, goals, Pro and XP
  core/           plain TypeScript, unit-tested: the alarm model, when things ring, the notification plan, volume fades, missions, sounds, vibration, sleep stats, the Today plan, weather, XP and Pro
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
- **Squat counting** uses a simple motion pattern (a dip then a peak), tuned on synthetic data. It needs testing on real phones and people.
- **Not built yet**, from the research list: a voice alarm (record a familiar voice), a smart wake window from Apple Health / Health Connect sleep data, smart-bulb dawn light, and a study with a sleep researcher to measure whether Ryz actually reduces grogginess.
- The bundle identifier `com.ryzalarm.app` in `app.json` is a placeholder. Change it to your own before publishing.

## Sources

- Weather: Open-Meteo.com (CC BY 4.0). Place names on web: © OpenStreetMap contributors.
- Today: `src/core/today.ts` (energy estimate, plan, wake-up rhythm, sample nights), tested in `src/core/__tests__/today.test.ts`.

- Bruck & Thomas, low-frequency alarms and waking deep sleepers: https://vuir.vu.edu.au/3994
- McFarlane et al. (RMIT, 2020), melodic alarms: https://neurosciencenews.com/alarm-music-grogginess-15625/
- Sundelin et al. (2023), snoozing: https://livescience.com/health/sleep/hitting-snooze-can-boost-morning-cognition-study-hints
- Hilditch & McHill (2019), sleep inertia: https://pmc.ncbi.nlm.nih.gov/articles/PMC6710480/
- Basner & Dinges (2011), the psychomotor vigilance test: https://pubmed.ncbi.nlm.nih.gov/21532953/
- Vallat et al. (2022), activity, sleep and morning alertness: https://www.nature.com/articles/s41467-022-34503-2
- Hirshkowitz et al. (2015), sleep needed by age: https://pubmed.ncbi.nlm.nih.gov/29073412/
- MacStories on Alarmify (Spotify alarms that need Spotify left open all night): https://www.macstories.net/?p=21964
- Windred et al. (2024), sleep regularity: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10782489/
- Burns et al. (2023), day and night light and mental health (UK Biobank, about 86,000 people): https://www.monash.edu/news/articles/largest-ever-study-on-light-exposure-proves-its-impact-on-mental-health
- Monk (2005), the post-lunch dip: https://pubmed.ncbi.nlm.nih.gov/15892914/
- Drake et al. (2013), caffeine 0, 3 or 6 hours before bed: https://pubmed.ncbi.nlm.nih.gov/24235903/
- Van Dongen et al. (2003), the cost of chronic sleep restriction: https://pubmed.ncbi.nlm.nih.gov/12683469/
- AASM & SRS (2015), sleep duration: https://aasm.org/aasm-and-srs-publish-new-sleep-duration-consensus-statement/
