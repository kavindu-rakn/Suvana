# Suvana Learn adaptation

Suvana Learn is **rule-based by design**. It summarizes this browser profile's
scored attempt history and applies explicit rules. It does not run a learned
learner model or infer whether a sign is correct. No participants, learning
gains or teacher-agreement results are claimed.

For example, after one match score of 30, mastery is 0.30 and practice need is
0.75 × (1 − 0.30) = 0.525 on the same day. That exceeds the 0.5 due threshold.
An unseen sign has numeric need 1, but selection explicitly chooses the due
review first. The higher unseen number no longer hides weak signs. These are
worked arithmetic values from the rule, not empirical study findings.

## What the learner model measures

`mastery.ts` starts a sign's estimate at its first match score divided by 100.
Each later attempt updates it with EWMA alpha **0.5**:

```text
mastery = mastery + 0.5 × (newMatch / 100 − mastery)
need = 0.75 × (1 − mastery) + 0.25 × min(elapsedDays / 5, 1)
```

Future timestamps contribute zero elapsed days. New signs have need 1.
Improving means mastery >= **0.6**. Mastered means mastery >= **0.85** after
at least **3 attempts**. These describe reference-match history, not fluency
or sign correctness. Mastery is derived from attempts, not separately stored.
The formula and its constants are unchanged by L-13. Scheduling constants
(alpha, mastery levels, need blend, 5 elapsed days, due threshold and category
tolerance) are **untuned heuristics**, not learned or validated parameters.

## Single Next recommendation

`recommendNext(summaries, now, unitOrder?)` returns `{gloss, kind, reason}`.
`suggestNext` keeps the existing gloss-only API for current consumers.

1. Attempted signs with **need > 0.5** are due. Rank due reviews by need,
   descending, then gloss for deterministic ties. Select one before any unseen
   sign, even though unseen signs have numeric need 1.
2. When none is due, choose the next unseen sign in the supplied unit order.
   Without a unit order, retain the existing alphabetical fallback.
3. When no eligible unseen sign remains, refresh the attempted sign with the
   highest need, within the unit when an order was supplied. Return null when
   no eligible item exists. Due reviews may revisit earlier units; a unit order
   never introduces an unseen sign outside that unit.

Reasons are literal rules: `review: score dropped` only when the latest score
is lower than the previous one; `review: not practised for N days` for a due
sign at least one elapsed day old; `review: low match score` for a fresh weak
sign with no demonstrable score drop; `new: next in unit`; or
`practice: refresh this sign`. The fresh-low reason avoids inventing a prior
high score. Elapsed days in this model are 24-hour periods; the game streak
uses local calendar days instead.

## Finite sessions and the Path entry

`buildSessionPlan` returns a finite list of recommendations. It takes up to
**2 distinct due reviews, then 1 new sign**, repeating while there is room.
When one queue empties it uses the other. Only after both are exhausted does
it fill remaining slots with attempted signs that are not due (within the
unit, if supplied). No sign repeats in one session and unavailable signs are
not invented. This is an approximate 2:1 mix because a learner can run out of
review or new items.

**Plan correction:** "new only when no due review exists" is the strict
single-Next rule. A finite session's specified 2:1 mix deliberately introduces
a new sign after two reviews even if more reviews remain. Requiring strict
global review priority inside a session would make that mix impossible.
This distinction is explicit in implementation/tests and the L-13 handoff.

General sessions retain their existing default size **5**. The Path API
`startUnitSession(unit, summaries, now?, size?)` defaults to **8**, as the
plan specifies for "Practise this unit". It refuses proposed/unapproved units,
empty units, invalid size or missing summaries. This does not approve any
curriculum contents, meaning, sign order or licence. K-05 still owns approval.

Category variety retains its existing **0.05** near-tie tolerance inside a
queue: prefer a word over a symbol, then a category not used in this session.
It cannot move new signs ahead of review slots or reorder an explicit unit's
new-sign list. The tolerance is an untuned presentation heuristic.

Sessions capture the selected reasons and starting mastery, generate a session
ID, and remain finishable after one scored attempt per selected sign, regardless
of score. Done marks and session IDs do not award stars; game.ts derives stars
from actual log records. Optional recommendation/unit metadata preserves older
saved sessions; old sessions without reasons simply have no reason chip.

The pure session API is implemented here. The clickable Path entry (L-11) and
Watch/Try/Recall UI (L-16) remain separate ownership tasks. On the Path:

```ts
const session = startUnitSession(approvedUnit, summaries)
saveSession(session)
const firstGloss = currentGloss(session)
// Mount Practice with initialGloss=firstGloss after saving, so its existing
// loadSession() reads this session. Practice already logs sessionId and done.
```

The Path must offer only a unit that game.unitState says is open/passed/mastered,
and mount/remount Practice after saving. Practice reads sessionStorage at mount;
changing it while Practice is mounted is insufficient. `currentRecommendation`
supplies the reason for the current session item. On profile switch/reset,
clear the active session and refresh mounted derived state (L-23 integration).
No UI hot file is edited by L-13, so a new visible session-start button is not
claimed until L-11 integrates this hook.

## Next exercise within one sign

`nextExercise(gloss, attempts)` is pure and consumes only that sign's valid
isolated Try/Recall history, sorted chronologically. Old stage-less entries
mean Try; sentence entries do not control isolated-sign teaching.

- Two consecutive Try entries **below 60**: offer **0.25x** and a ghost overlay,
  with reason `retry: last two tries below 60`. An intervening Recall breaks
  that run. These are suggestions, not forced controls or new sign content.
- A Recall **below 60**: recommend returning to Try at the existing **0.5x**
  teaching speed. Earned stars and Recall availability are not erased.
- A Try **>=70**: recommend Recall. This uses kvn's approved **second-star
  threshold 70**, replacing the draft 85 unlock. Reveal before scoring prevents
  the third star but does not remove the earlier two.
- Successful Recall remains available; an early reveal recommends retrying
  without revealing. Completion/next-sign UI uses game/session state separately.
- Otherwise recommend Try at **0.5x**. Recall remains available once earned.

## Rewards and future work

Reward rules approved by kvn in chat, 13 Oct: Try **60/70** earns one/two stars;
an unrevealed Recall **>=60** strictly after a two-star Try earns the third;
unit pass requires **1 star on every sign**; goal **5 scored attempts per local
day**; streak counts goal days; XP sums each gloss's best stars. Existing result
bands remain **60/85**, so earning two stars at 70 does not say Great match or
Close match. Full game edge rules are in game.ts and the L-12 handoff.

BKT or other learned adaptation is future work after appropriate learner data,
teacher labels and evaluation exist. K-means/PrefixSpan error mining is also
deferred. No learned model, expert correctness guarantee or improvement in
learning outcomes is established by these scheduling rules or unit tests.
