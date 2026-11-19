"""v5 Short (lesson 8 of 15) of the series "15 Lessons from Surah Al-Kahf": "He Would Not Stop Traveling Until He Found a Teacher" (Quran 18:60, 18:65).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: A long dusty caravan track across dry, sun-baked plains with scrub and low rocks, leading to a pale coastline
   where two bands of water of different colour (clear turquoise and muddy green) meet in a visible seam. Two
   travellers seen only from behind: the taller one in a plain cloak with a long wooden staff and a head cloth, the
   younger one carrying a bag and a cloth-wrapped parcel. At the shore, a third figure seated on a rock by the water,
   only as a robed silhouette from far behind.
TIME OF DAY: Hard bright day with heat shimmer, softening into low afternoon sun at the shore.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 "He wouldn't stop traveling until he found a teacher.": frame 1: the tip of a wooden staff and a sandalled foot
    pressing into cracked earth, dust lifting, camera tracking backwards.
 - s1 'Musa sets out and tells his servant:': the two travellers' backs on the track, heat shimmer, the tall one
    stopping and raising a hand to the horizon.
 - d1 (18:60, 'I will not cease...'): the camera rises over their shoulders to the horizon: a thin line of sea with
    two bands of colour meeting; the staff pointing toward it, the figure unmoving, wind in the cloak.
 - d2 (18:65, they found a servant of Allah): arrival at the shore: the two travellers pause; far down the beach a
    robed figure sits on a rock by the water, seen only from behind and far away; the camera slowly pushes in past the
    travellers toward the seated figure, no face ever.
 - l1-l3: the staff planted in sand; a line of footprints behind them stretching back to the dusty road; the
    two-colour seam in the water.
 - e1 'Keep learning.': the staff upright in the wet sand, the two seas meeting behind it.
CAMERA AND WHY: Low and moving in the first second (feet and staff tip), then a rise to the horizon as the distance
   becomes the promise of the verse; the slow push-in on the seated figure builds the 'who is this?' question without
   showing a face; ending on the planted staff and meeting waters is the quiet 'I'm not done learning'.
"""

LINES = [
    ("h1", "hook", "He wouldn't stop traveling until he found a teacher."),
    ("s1", "setup", "Musa|Mūsā sets out and tells his servant:"),
    ("d1", "dlg", "I will not cease traveling|[traveling] until I reach the junction of the two seas or continue for a long period."),
    ("d2", "dlg", "And they found a servant from among Our servants to whom we had given mercy from us and had taught him from Us a certain|[certain] knowledge."),
    ("l1", "lesson", "Knowledge is worth the journey."),
    ("l2", "lesson", "He asked to be taught."),
    ("l3", "lesson", "Never think you have learned enough."),
    ("e1", "end", "Keep learning."),
]
CHECK = {"d1": ('quran', "k18_60a"), "d2": ('quran', "k18_65")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.55, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_08_the-teacher', 'title': "He Would Not Stop Traveling Until He Found a Teacher", 'follow': ''}
KEYS = {"h1": ["traveling", "teacher."],
        "s1": ["Mūsā", "servant:"],
        "d1": ["cease", "junction", "seas"],
        "d2": ["servant", "knowledge."],
        "l1": ["Knowledge", "journey."],
        "l2": ["taught."],
        "l3": ["learned", "enough."],
        "e1": ["learning."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Mūsā says', 'Allāh says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('Mūsā says', 'Allāh says')}]
