# Sentinel Loop: 3-minute demo script

Owner: Ahnaf (`ahnaf-lead-ux`). Mode: **practice**, simulation client (`VITE_API_MODE` unset). Browser: 1440 x 900, first-run tour enabled.

`docs/demo/mockups/` holds the superseded white-blue direction from U0. It is kept for history only. The shipped design is the Ember theme (warm white and orange). Do not show the mockups.

## One-line pitch

"You are the security analyst. An AI is attacking a company's API right now. Watch what it does, find the hijacked session, shut it down without breaking the people who are working, and prove it."

## Before you press record

- `cd apps/web && npm run dev`, open the printed URL on a clean browser profile so the tour appears.
- Optional: open the dev drawer with `Ctrl+K` and keep "Advance scenario one tick" in mind. Do not use it on camera unless the pace drags. The simulation advances on its own every 4 seconds.
- Zoom to 100%. Close other tabs.

## Timeline

| Time | On screen | Say | Proves |
|---|---|---|---|
| 0:00 | Landing page. Cursor on **Start shift**. | "This is a training range for blue teamers. The attacker is a real AI adversary, not a slideshow. The company is fictional: Northstar Analytics." | What it is, who it is for |
| 0:15 | Click **Start shift**. Tour card 1 ("Your current objective"). Press Next once. | "The app always tells me what to do now and why. First I just need to learn what normal looks like." | Guided, not daunting |
| 0:25 | Tour step 2 on the training overlay. Point at the Activity chart, then the Logs. Press Esc to skip the rest. | "This is the shift an analyst actually sits in. Activity shows what is happening. The logs are the record. Coach is optional, and I can hide any of these." | Specialist layout, panel toggles |
| 0:40 | Strip says **Thinking**, then **Acting now**. | "This overlay narrates what the AI is doing as it does it, and why attackers do that. A real shift does not have this. Blind, or hiding Coach, is the closer simulation." | Real-time AI highlighting, as a layer you can remove |
| 1:00 | In the activity chart, point at a hatched (refused) bar, then open a log line. | "Refused requests show up here first. I confirm them in the logs. I do not get a diagram of the system while the attack is still going." | Visualization a SOC would recognize |
| 1:20 | In the log console, press `j` to move, `Enter` to inspect a line from `203.0.113.57`, press `p` to pin. Pin a second line. | "The logs are real records. I compare sessions, notice one switched address and tool, and pin what supports my theory." | Professional logs, evidence |
| 1:45 | Click **Declare incident**. Pick `sess_A`, type one sentence, submit. | "I name the session and explain why. The server checks that my evidence is genuine. I cannot invent log lines." | Evidence validated server-side |
| 2:05 | Respond drawer. Show the blast-radius cards. Choose **End one session**, then **Apply**. The orange "Your response" node appears under the gateway. | "I pick the smallest action that works. Disabling the whole account would also stop a legitimate employee, and I would lose points for that." | Proportional response |
| 2:25 | Verify. Both probes run: intruder denied, Eli still works. | "Proof, not a claim. The attacker is refused and the legitimate user is untouched." | Containment changes real state, continuity |
| 2:40 | Debrief. Point at **How the attack moved**. Scrub back to the moment of containment, then forward. Click the session circle. | "This diagram is the after-action view. Teal was allowed, red was refused, indigo was the AI. Here is the track my response cut, and here is the route it tried next." | The visualization X-factor, only once the shift is over |
| 2:55 | Back to the strip, toggle **Blind**. | "For a harder run, switch the lens to Blind. No narration, no AI labels. Assessment runs force Blind automatically, and the lens never changes the score." | Fairness, replayability |

## Honest answers to likely questions

- **"Is that a real AI?"** In this build the adversary is a scripted simulation and the UI labels it "Scripted simulation". The same screen binds to Tanvir's local model through the control API. A fallback is always disclosed, never presented as live autonomy.
- **"Does the coaching give away the answer?"** In Coached mode the AI's session is named once it acts, which makes the investigation easier. That is intentional for learning. Blind mode and any scored or assessment run remove it, and the score does not depend on the lens.
- **"Can the browser cheat?"** No. The browser only sends declarations and response requests. The server owns scoring, state transitions and the attacker's outcome.

## Fallback plan if something misbehaves on stage

1. Refresh. The simulation restarts cleanly from the landing page.
2. If the AI looks stuck, `Ctrl+K`, then "Advance scenario one tick" a few times.
3. If the dock covers the logs, press `Esc`.

## Acceptance for the recording

- Uncut, 3:00 plus or minus 10 seconds, 1080p or better.
- No console errors, no developer drawer visible, no mockups shown.
- The training overlay visibly changes state at least twice (thinking, acting, stopped).
- The debrief attack map is on screen, including the refused path and the response node.
