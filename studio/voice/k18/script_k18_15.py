"""v5 Short (lesson 15 of 15) of the series "15 Lessons from Surah Al-Kahf": "If the Sea Were Ink, It Would Still Run Out" (Quran 18:109).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: A quiet pebbled shore at night under a field of stars and a half moon, black water with small silver ripples.
   On a driftwood table at the water's edge: a small clay inkwell with dark ink, a cut reed pen and a sheet of aged
   parchment with only abstract calligraphic strokes (no legible text). A hand and sleeve only.
TIME OF DAY: Deep night, moonlit, with a thin first grey line at the very end.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'If the sea were ink, it would still run out.': frame 1 is the reed pen tip dipping into the dark ink, a bead of
    ink swelling and falling; ripples in the ink.
 - s1 'Think of every ocean as ink.': pull back from the ink to the night sea; the surface of the ink and the surface
    of the sea share the same moon glint (match-cut).
 - s2 'Allah says:': the camera settles at table height with the sea beyond; the pen rests on the parchment.
 - d1 (18:109, the sea would be exhausted before the words of my Lord): the reed pen draws long abstract strokes
    across the parchment, glowing faintly gold; as it writes the inkwell level falls; match-cut to the sea: waves draw
    back down the shore, leaving wet stones, shells and sand exposed, farther and farther, never enough.
 - l1-l3: the empty inkwell; a wave drawing back; the reed pen laid down on the parchment.
 - e1 'Stay humble.': a single drop of ink on a fingertip against the star-filled sky.
CAMERA AND WHY: Macro ink drop (tiny) to the whole sea (vast) in one match-cut is the whole lesson: how small what we
   know is; the camera stays at the table so the sea reads as the 'ink supply' in the background; the ending drop on
   the fingertip is the small human at the end.
"""

LINES = [
    ("h1", "hook", "If the sea were ink, it would still run out."),
    ("s1", "setup", "Think of every ocean as ink."),
    ("s2", "setup", "Allah|Allāh says:"),
    ("d1", "dlg", "If the sea were ink for writing|[writing] the words of my Lord, the sea would be exhausted before the words of my Lord were exhausted, even if We brought the like of it as a supplement."),
    ("l1", "lesson", "The sea would run dry."),
    ("l2", "lesson", "His words would not."),
    ("l3", "lesson", "So stay humble about what you know."),
    ("e1", "end", "Stay humble."),
]
CHECK = {"d1": ('quran', "k18_109a")}
GAP = {"h1": 0.45, "s1": 0.25, "s2": 0.2, "d1": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_15_the-ink', 'title': "If the Sea Were Ink, It Would Still Run Out", 'follow': ''}
KEYS = {"h1": ["sea", "ink,", "out."],
        "s1": ["ocean", "ink."],
        "s2": ["Allāh"],
        "d1": ["ink", "exhausted", "supplement."],
        "l1": ["run", "dry."],
        "l2": ["words"],
        "l3": ["humble"],
        "e1": ["humble."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Allāh says',)}
EXCHANGES = [{'top': "d1", 'labels': ('Allāh says',)}]
