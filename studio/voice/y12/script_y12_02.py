"""v5 Short (lesson 2 of 15) of the series "15 Lessons from Surah Yusuf": "The Worst Plan Began as a Quiet Feeling" (Quran 12:8-9).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: Canaan hills at the edge of the family sheep pen: stacked-stone wall, a small cooking fire, wool sacks, the
   father's house glowing with one lit window further up the slope.
TIME OF DAY: Dusk, last orange light on the ridge, then firelight.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'The worst plan in this story started as a quiet feeling.': frame 1 is the fire, embers popping, sparks drifting
    up; on the far slope the father's house window glows warm.
 - s1 'His brothers were talking.': a ring of cloaked silhouettes sits around the fire seen from behind or as dark
    outlines; one shape sits slightly apart from the glow.
 - s2 'In Surah Yusuf, they say:': camera drifts along the stone wall; sparks light the wall in flickers.
 - d1 (12:8): the warm lit window on the hill becomes the visual centre; the fire's glow is cooler and smaller by
    comparison, shown by a slow light-pull (exposure shift) from the window to the fire.
 - d2 (12:9): the ring of silhouettes leans closer, one pointing hand casting a long shadow across the stones toward
    the dark mouth of a distant well.
 - l1-l3: the same fire shrinking to coals, embers turning dark, then a single spark that does not die.
 - e1 'Catch it while it is small.': the single spark in close-up, a hand's shadow closing around it.
CAMERA AND WHY: Hold on the fire for the hook (movement from sparks), then a slow lateral track along the stone wall
   (a feeling of eavesdropping); the exposure pull from lit window to dim fire visualises 'more beloved' without any
   people being compared; ends macro on the spark because the lesson is about a tiny beginning.
"""

LINES = [
    ("h1", "hook", "The worst plan in this story started as a quiet feeling."),
    ("s1", "setup", "His brothers were talking."),
    ("s2", "setup", "In Surah|Sūrah Yusuf,|Yūsuf, they say:"),
    ("d1", "dlg", "Joseph and his brother are more beloved to our father than we, while we are a clan."),
    ("d2", "dlg", "Kill Joseph or cast him out to another|[another] land;"),
    ("l1", "lesson", "Envy keeps score."),
    ("l2", "lesson", "It turns a brother into a rival."),
    ("l3", "lesson", "And it never stays just a feeling."),
    ("e1", "end", "Catch it while it is small."),
]
CHECK = {"d1": ('quran', "y12_8q"), "d2": ('quran', "y12_9q")}
GAP = {"h1": 0.45, "s1": 0.2, "s2": 0.3, "d1": 0.55, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_02_the-envy', 'title': "The Worst Plan Began as a Quiet Feeling", 'follow': ''}
KEYS = {"h1": ["worst", "plan", "feeling."],
        "s1": ["brothers"],
        "s2": ["Yūsuf,"],
        "d1": ["more", "beloved", "father"],
        "d2": ["Kill", "Joseph", "cast"],
        "l1": ["Envy", "score."],
        "l2": ["brother", "rival."],
        "l3": ["never", "feeling."],
        "e1": ["Catch", "small."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('The brothers say', 'The brothers say')}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('The brothers say', 'The brothers say')}]
