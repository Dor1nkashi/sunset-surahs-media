"""v5 Short (outro) of the series "15 Lessons from Surah Yusuf": "Fifteen Lessons from the Best of Stories (Surah Yusuf)" (Quran 12:111).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: The Canaan hills of the opener at the first light of day: terraced slopes, olive trees, the flat-roofed
   house, the stone well, dew on the grass. No people.
TIME OF DAY: Sunrise, golden light spreading over the terraces.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'That was the best of stories.': frame 1 is the sunrise breaking over the eastern ridge, the eleven bright stars
    just fading in the sky above it.
 - s1 'And Allah says:': the camera glides over the terraces and olive trees toward the house.
 - d1 (12:111): wide: golden light on the well, the house, the road, and the hills, one by one (each story location of
    the series in one view).
 - l1 'Patience. Honesty. Forgiveness.': three quick object beats: a lit lamp, a straight shirt on a line, an open
    hand in light.
 - e1 'Start again from the dream.': the camera tilts back up to the sky and the eleven stars return, matching frame 1
    of the intro, so the loop leads straight into the first lesson.
CAMERA AND WHY: One continuous crane from sunrise sky down over the land and back up to the stars; the 'all places in
   one view' beat gives the long-form a farewell; the final tilt to the stars sets up the loop.
"""

LINES = [
    ("h1", "hook", "That was the best of stories."),
    ("s1", "setup", "And Allah|Allāh says:"),
    ("d1", "dlg", "There was certainly in their stories a lesson for those of understanding."),
    ("l1", "lesson", "Patience. Honesty. Forgiveness."),
    ("e1", "end", "Start again from the dream."),
]
CHECK = {"d1": ('quran', "y12_111")}
GAP = {"h1": 0.45, "s1": 0.2, "d1": 0.7, "l1": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_16_outro', 'title': "Fifteen Lessons from the Best of Stories (Surah Yusuf)", 'follow': ''}
KEYS = {"h1": ["best", "stories."],
        "s1": ["Allāh"],
        "d1": ["stories", "lesson", "understanding."],
        "l1": ["Patience.", "Honesty.", "Forgiveness."],
        "e1": ["dream."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Allāh says',)}
EXCHANGES = [{'top': 'd1', 'labels': ('Allāh says',)}]
