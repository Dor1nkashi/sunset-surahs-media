"""v5 Short (intro) of the series "15 Lessons from Surah Al-Kahf": "Fifteen Lessons from the Surah of the Cave" (Quran 18:13).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: A limestone mountain ridge in a dry, wind-cut country: a low cave mouth with a worn stone lip at the foot of
   a cliff, a goat path winding down, and far below in soft haze four things we will visit later, each tiny: a walled
   garden of date palms and vines, the place where two bands of water meet, a village wall of mud brick, and a dark
   iron barrier closing a gap between two peaks. No people in frame.
TIME OF DAY: Blue hour just before sunrise: deep blue sky, a thin pink band on the eastern ridge, stars fading.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'Fifteen lessons from the Surah of the Cave.': frame 1 is already the full picture: we look OUT of the cave from
    inside, the opening a rough arch of pink-blue sky, dust motes drifting in the first light, a thin mist crawling
    over the rocks outside; one lamp flame at the cave floor flickers once.
 - s1 'Allah says of the cave youths:': the camera drifts forward out of the mouth and turns along the ridge so the
    four distant places appear in the haze one after another (garden, water meeting, wall, iron gap), each lit by a
    single slim ray of light.
 - d1 (18:13 card): the camera settles on the cave mouth from outside, low, the lamp inside now a small warm dot; the
    light on the stones slowly turns from blue to gold.
 - l1 'A cave, two gardens, a journey, a wall.': four match-cuts, 0.8 s each, objects only: the stone cave lip with
    moss; a date palm trunk with a vine tendril on a mud-brick wall; the seam where clear water meets muddy water; a
    dark iron sheet with a copper glow along its seam.
 - l2 'Fifteen lessons, in order.': fifteen tiny lamp flames appear in a row along the ridge, one after another.
 - e1 'Start with the cave.': pull back and tilt down so the frame returns to the cave mouth of frame 1; the first
    lesson opens on the same cave.
CAMERA AND WHY: A slow glide from inside the cave out along the ridge (about 6 s), so the viewer 'leaves the cave to
   see the whole surah'; the four far places are previewed as tiny lit spots, never as people; the return to the cave
   mouth loops the Short into lesson 1.
"""

LINES = [
    ("h1", "hook", "Fifteen lessons from the Surah|Sūrah of the Cave."),
    ("s1", "setup", "Allah|Allāh says of the cave youths:"),
    ("d1", "dlg", "It is We who relate to you, O|[O Muhammad,|Muhammad], their story in truth."),
    ("l1", "lesson", "A cave, two gardens, a journey, a wall."),
    ("l2", "lesson", "Fifteen lessons, in order."),
    ("e1", "end", "Start with the cave."),
]
CHECK = {"d1": ('quran', "k18_13a")}
GAP = {"h1": 0.45, "s1": 0.25, "d1": 0.7, "l1": 0.3, "l2": 0.5, "e1": 1.2}
META = {'name': 'v5_k18_00_intro', 'title': "Fifteen Lessons from the Surah of the Cave", 'follow': ''}
KEYS = {"h1": ["Fifteen", "Cave."],
        "s1": ["Allāh", "youths:"],
        "d1": ["story", "truth."],
        "l1": ["cave,", "gardens,", "wall."],
        "l2": ["Fifteen", "order."],
        "e1": ["cave."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Allāh says',)}
EXCHANGES = [{'top': "d1", 'labels': ('Allāh says',)}]
