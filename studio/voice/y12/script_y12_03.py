"""v5 Short (lesson 3 of 15) of the series "15 Lessons from Surah Yusuf": "At the Bottom of a Well, He Got a Promise" (Quran 12:15).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: A deep hand-dug well on the dry slope: round rim of fitted stones, a wooden beam and rope, a few sheep far
   off, scrub grass, hard white sky.
TIME OF DAY: Midday, harsh light, short shadows.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'At the bottom of a well, he got a promise.': frame 1 is already inside the well looking UP: a bright coin of
    sky, brick-like stone walls with ferns, cool blue light, a small ripple of water below. A rope end swings.
 - s1 'His own brothers agree to put him at the bottom of a well.': cut up to the rim from outside: backs of cloaked
    figures standing around the rim; the rope is paid out hand over hand; the rope goes taut then slack.
 - s2 'Then Allah speaks to him:': figures walk away up the slope (backs only), dust settling; the rim falls silent;
    camera sinks over the rim into the shaft.
 - d1 (12:15): in the shaft, a single soft shaft of light enters from above and travels down the wall as the line is
    read; dust motes drift in it; the water surface catches it.
 - l1-l3: the light ring above stays steady while the water below slowly goes still and clear; then the coin of sky
    gets brighter.
 - e1 'Even the bottom has a message.': tight shot of the lit patch on the wet stone, a droplet falling through the
    beam and landing in the water.
CAMERA AND WHY: Open inside the well looking up (a scary, instantly readable image, strong hook); the move outside
   shows the betrayal in two seconds without faces; then one long descending dolly into the shaft so the viewer 'sits'
   at the bottom while the line is read; the single light shaft is the 'message' made visible.
"""

LINES = [
    ("h1", "hook", "At the bottom of a well, he got a promise."),
    ("s1", "setup", "His own brothers agree to put him at the bottom of a well."),
    ("s2", "setup", "Then Allah|Allāh speaks to him:"),
    ("d1", "dlg", "You will surely inform them someday|[someday] about this affair of theirs while they do not perceive your|[your identity.|identity]."),
    ("l1", "lesson", "The promise came before the rescue."),
    ("l2", "lesson", "Darkness was not the end of the story."),
    ("l3", "lesson", "Allah|Allāh was already there."),
    ("e1", "end", "Even the bottom has a message."),
]
CHECK = {"d1": ('quran', "y12_15q")}
GAP = {"h1": 0.45, "s1": 0.25, "s2": 0.3, "d1": 0.8, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_03_the-well', 'title': "At the Bottom of a Well, He Got a Promise", 'follow': ''}
KEYS = {"h1": ["bottom", "well,", "promise."],
        "s1": ["well."],
        "s2": ["Allāh"],
        "d1": ["surely", "inform", "them"],
        "l1": ["promise", "rescue."],
        "l2": ["Darkness", "end"],
        "l3": ["Allāh", "there."],
        "e1": ["bottom", "message."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Allāh inspired to him',)}
EXCHANGES = [{'top': 'd1', 'labels': ('Allāh inspired to him',)}]
