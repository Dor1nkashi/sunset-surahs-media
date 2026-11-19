"""v5 Short (lesson 11 of 15) of the series "15 Lessons from Surah Yusuf": "A King Wanted Him. He Asked for the Grain Stores" (Quran 12:55-56).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: A palace audience court: a raised dais with a carved throne, lotus-capital columns, sunlit floor; later the
   royal granary yard: long mud-brick silos with domed tops, sacks, scribes' tables with clay tablets and reed pens.
TIME OF DAY: Morning in the court, midday over the granary.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'A king wanted him. He asked for the grain stores.': frame 1 is the throne dais with light and an empty golden
    seat; behind it, in the distance through the columns, the granary silos in a row.
 - s1 'The king says he is trusted now.': a cloaked silhouette's back stands before the dais (the young man), the
    throne's silhouette above him, scribes small at the edges.
 - s2 'Yusuf answers:': the standing silhouette looks (its back, head turn only in outline) through the columns toward
    the silos.
 - d1 (12:55): camera follows his line of sight to the silos: doors, keys on a ring, scribes counting sacks; keys
    catch the light.
 - d2 (12:56b, mercy & reward): the sun comes out over the whole granary yard in a slow warm exposure rise.
 - l1-l3: a key turning in a lock, a scale and a clay tablet, sacks being stacked.
 - e1 'Ask what you can carry.': a hand lifting one sack of grain onto a pile, steady.
CAMERA AND WHY: A long lens through the columns lets the hook promise two things at once: power in the foreground, the
   real request in the background; then the camera physically travels from the dais to the silos, which is the story
   'he chose the work, not the throne'.
"""

LINES = [
    ("h1", "hook", "A king wanted him. He asked for the grain stores."),
    ("s1", "setup", "The king says he is trusted now."),
    ("s2", "setup", "Yusuf|Yūsuf answers:"),
    ("d1", "dlg", "Appoint me over the storehouses of the land. Indeed, I will be a knowing guardian."),
    ("d2", "dlg", "We touch with Our mercy whom We will, and We do not allow to be lost the reward of those who do good."),
    ("l1", "lesson", "He asked for a duty, not a crown."),
    ("l2", "lesson", "He named his strengths: guard and know."),
    ("l3", "lesson", "Power meant service."),
    ("e1", "end", "Ask what you can carry."),
]
CHECK = {"d1": ('quran', "y12_55"), "d2": ('quran', "y12_56b")}
GAP = {"h1": 0.45, "s1": 0.25, "s2": 0.2, "d1": 0.6, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_11_the-storehouses', 'title': "A King Wanted Him. He Asked for the Grain Stores", 'follow': ''}
KEYS = {"h1": ["king", "grain", "stores."],
        "s1": ["trusted"],
        "s2": ["Yūsuf"],
        "d1": ["storehouses", "knowing", "guardian."],
        "d2": ["mercy", "reward"],
        "l1": ["duty,", "crown."],
        "l2": ["strengths:", "guard"],
        "l3": ["service."],
        "e1": ["carry."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Yūsuf says', 'Allāh says')}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('Yūsuf says', 'Allāh says')}]
