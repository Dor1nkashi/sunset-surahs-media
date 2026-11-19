"""v5 Short (lesson 10 of 15) of the series "15 Lessons from Surah Yusuf": "Seven Fat Cows, Seven Thin Cows, and a Plan That Saved a Country" (Quran 12:43, 12:47).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: Pharaoh's palace hall: tall painted columns, braziers, low cedar benches, linen hangings. Then the Nile
   valley: green fields, irrigation channels, reed boats, mud-brick granary, date palms, with the desert edge beyond.
TIME OF DAY: Night in the palace, then bright farm morning in the fields.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'Seven fat cows. Seven thin cows. A whole country at stake.': frame 1 is the Nile at dawn with seven sleek cows
    climbing out of the Nile; seven gaunt cows follow behind them, the thin line eclipsing the fat one in a slow
    dream-haze (shown calmly, no violence); green and dry grain spikes sway side by side.
 - s1 'A king has a dream no adviser can explain.': palace hall at night: advisers' silhouettes in robes, hands raised
    in confusion, braziers flickering; the king's seat in the centre, empty of face (we see the carved chair and a
    golden headcloth in shadow).
 - s2 'Then a freed prisoner remembers Yusuf.': a cloaked figure's back at the palace door, lamp in hand, the
    courtyard beyond going to dawn.
 - d1 (12:43): the dream replays line by line: the Nile, seven fat cows, seven thin cows, seven green and seven dry
    spikes; each as one clean 2-s image.
 - d2 (12:47): the Nile fields in morning light: seven rows of green grain stalks being planted and harvested, the
    stalks left in their spikes, a granary being filled with grain, sacks stacked; a calendar-like shadow of the sun
    moving across seven distinct slabs of land.
 - l1-l3: green fields, a full granary, a drought-cracked field, shown as three fast cuts to give the shape of the
    plan.
 - e1 'Solve the problem, not just the puzzle.': the granary door closing on full stores in warm light.
CAMERA AND WHY: Open on the dream so the hook shows the puzzle visually; then the palace hall for the 'no one can
   answer' beat; a rising crane over the fields for the plan (the viewer gets the scale of 14 years); end on the door
   of the granary because the lesson is the storing of grain.
"""

LINES = [
    ("h1", "hook", "Seven fat cows. Seven thin cows. A whole country at stake."),
    ("s1", "setup", "A king has a dream no adviser can explain."),
    ("s2", "setup", "Then a freed prisoner remembers Yusuf.|Yūsuf."),
    ("d1", "dlg", "Indeed, I have seen in|[in a dream|dream] seven fat cows being eaten by seven that|[that were|were] lean, and seven green spikes of|[of grain|grain] and others that|[that were|were] dry."),
    ("d2", "dlg", "You will plant for seven years consecutively; and what you harvest leave in its spikes, except a little from which you will eat."),
    ("l1", "lesson", "He gave the meaning."),
    ("l2", "lesson", "And he gave a plan."),
    ("l3", "lesson", "Good answers include a next step."),
    ("e1", "end", "Solve the problem, not just the puzzle."),
]
CHECK = {"d1": ('quran', "y12_43a"), "d2": ('quran', "y12_47q")}
GAP = {"h1": 0.45, "s1": 0.25, "s2": 0.3, "d1": 0.55, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_10_the-kings-dream', 'title': "Seven Fat Cows, Seven Thin Cows, and a Plan That Saved a Country", 'follow': ''}
KEYS = {"h1": ["fat", "thin", "country"],
        "s1": ["adviser", "explain."],
        "s2": ["Yūsuf."],
        "d1": ["seven", "fat", "cows", "lean,"],
        "d2": ["plant", "seven", "leave", "spikes,"],
        "l1": ["meaning."],
        "l2": ["plan."],
        "l3": ["next", "step."],
        "e1": ["problem,", "puzzle."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('The king says', 'Yūsuf answers')}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('The king says', 'Yūsuf answers')}]
