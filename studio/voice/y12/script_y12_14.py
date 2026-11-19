"""v5 Short (lesson 14 of 15) of the series "15 Lessons from Surah Yusuf": "He Had Every Reason for Revenge. Listen to What He Said" (Quran 12:90, 12:92).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: The Egyptian palace court from a lower angle: sunlit stone floor, lotus columns, a dais; the brothers'
   travel-dusty cloaks, empty grain sacks, a camel at the gate.
TIME OF DAY: Bright afternoon, warm clear light.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'He had every reason for revenge. Listen to what he said.': frame 1 is the sunlit stone floor with the long
    shadows of a group of kneeling/standing silhouettes cast toward the dais.
 - s1 'His brothers stand in front of him again.': wide: dusty cloaks, weary shoulders, backs to us; the dais's carved
    throne above them.
 - s2 'He tells them who he is:': a hand in a rich sleeve rests on the arm of the throne, then lifts slowly.
 - d1 (12:90): one of the silhouettes sinks to his knees; the standing figure steps down from the dais (back to us)
    toward them.
 - d2 (12:92): the camera lowers to the stone floor between the two groups and the shadows merge into one shape as the
    sun moves; the dust in the air glows.
 - l1-l3: hand on the throne arm; a hand lifted open; the dais with nobody on it.
 - e1 'Let it go today.': the merged shadow on the floor, in clean light.
CAMERA AND WHY: A low camera on the floor (the viewer is the same height as the people kneeling) to make power and
   mercy read at once; the merge of shadows is the emotional beat for 'no blame today' without showing a single face.
"""

LINES = [
    ("h1", "hook", "He had every reason for revenge. Listen to what he said."),
    ("s1", "setup", "His brothers stand in front of him again."),
    ("s2", "setup", "He tells them who he is:"),
    ("d1", "dlg", "I am Joseph, and this is my brother. Allah|Allāh has certainly favored us."),
    ("d2", "dlg", "No blame will there be upon you today. Allah|Allāh will forgive you; and He is the most merciful of the merciful."),
    ("l1", "lesson", "He had the power to punish."),
    ("l2", "lesson", "He chose to let it go."),
    ("l3", "lesson", "That is real strength."),
    ("e1", "end", "Let it go today."),
]
CHECK = {"d1": ('quran', "y12_90a"), "d2": ('quran', "y12_92f")}
GAP = {"h1": 0.45, "s1": 0.25, "s2": 0.3, "d1": 0.6, "d2": 0.75, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_14_forgiveness', 'title': "He Had Every Reason for Revenge. Listen to What He Said", 'follow': ''}
KEYS = {"h1": ["revenge.", "said."],
        "s1": ["brothers"],
        "s2": ["who"],
        "d1": ["Joseph,", "brother.", "favored"],
        "d2": ["No", "blame", "forgive", "merciful."],
        "l1": ["power", "punish."],
        "l2": ["let", "go."],
        "l3": ["strength."],
        "e1": ["Let", "go", "today."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Yūsuf says', 'Yūsuf says')}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('Yūsuf says', 'Yūsuf says')}]
