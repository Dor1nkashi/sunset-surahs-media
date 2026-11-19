"""v5 Short (lesson 13 of 15) of the series "15 Lessons from Surah Yusuf": "He Cried Until His Eyes Turned White, and He Never Gave Up" (Quran 12:86-87).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: The same Canaan house years later: the roof weathered, olive trees larger, the old well in the distance.
   Inside the courtyard: a worn mat, a water jar, an old wooden staff against the wall.
TIME OF DAY: Pale morning light, then midday.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'He cried until his eyes went white, but he never gave up.': frame 1 is the old staff leaning on the courtyard
    wall, dust moving in a shaft of morning light; the camera drifts across the worn mat.
 - s1 'Years pass, and Yaqub still grieves.': a time-lapse of the same courtyard, the olive tree's shadow sweeping
    across the wall, a sapling now taller; a seated silhouette (his back) in a long cloak by the wall, never moving.
 - s2 'His sons tell him to stop. He answers:': a group of silhouettes at the gate, impatient, one with raised arm;
    the seated figure lifts one hand slowly.
 - d1 (12:86): close on the seated figure's folded hands, then up to the open sky; wind lifts the edge of the cloak.
 - d2 (12:87): the gate; the sons' silhouettes start to leave, going down the road toward the horizon (a hint of
    search), the wind rising; a patch of sun crawls across the courtyard toward the seated figure.
 - l1-l3: the empty water jar filling from a drip; the staff; the hand opening.
 - e1 'Grief and hope can live together.': the sunlight reaches the hand and rests on it.
CAMERA AND WHY: No faces and no big motion: the grief is the stillness. A slow time-lapse proves 'years'; the camera
   sits low at the seated figure's level (empathy); the slow-moving patch of sun across the courtyard is the visual
   for hope arriving at its own pace.
"""

LINES = [
    ("h1", "hook", "He cried until his eyes went white, but he never gave up."),
    ("s1", "setup", "Years pass, and Yaqub|Yaʿqūb still grieves."),
    ("s2", "setup", "His sons tell him to stop. He answers:"),
    ("d1", "dlg", "I only complain of my suffering and my grief to Allah,|Allāh, and I know from Allah|Allāh that which you do not know."),
    ("d2", "dlg", "and despair not of relief from Allah.|Allāh. Indeed, no one despairs of relief from Allah|Allāh except the disbelieving people."),
    ("l1", "lesson", "He cried. He did not hide it."),
    ("l2", "lesson", "He took his grief to Allah|Allāh."),
    ("l3", "lesson", "And he kept hoping."),
    ("e1", "end", "Grief and hope can live together."),
]
CHECK = {"d1": ('quran', "y12_86"), "d2": ('quran', "y12_87")}
GAP = {"h1": 0.45, "s1": 0.25, "s2": 0.3, "d1": 0.6, "d2": 0.75, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_13_grief-and-hope', 'title': "He Cried Until His Eyes Turned White, and He Never Gave Up", 'follow': ''}
KEYS = {"h1": ["eyes", "white,", "gave", "up."],
        "s1": ["Yaʿqūb"],
        "s2": ["answers:"],
        "d1": ["complain", "suffering", "grief", "Allāh,"],
        "d2": ["despair", "relief", "Allāh."],
        "l1": ["cried."],
        "l2": ["grief", "Allāh."],
        "l3": ["hoping."],
        "e1": ["Grief", "hope"]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Yaʿqūb says', 'Yaʿqūb says')}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('Yaʿqūb says', 'Yaʿqūb says')}]
