"""v5 Short (lesson 2 of 15) of the series "15 Lessons from Surah Al-Kahf": "They Looked Awake. They Were Asleep for Three Hundred Years" (Quran 18:18, 18:25).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: The inside of the same dry cave, deeper chamber: a hard-packed earth floor, rough walls with faint tool
   marks, a narrow shaft of sun entering from the mouth. Five sleepers lie on the floor wrapped head to toe in coarse
   cloaks, hoods up and turned away from camera (no faces). A tan short-haired dog lies across the cave threshold with
   both front legs stretched out on the stone lip, ears twitching.
TIME OF DAY: Starts at midday with a hard shaft of light, then the light shifts and fades through many days and
   seasons (time-lapse).
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'They looked awake. They were asleep for three hundred years.': frame 1 is a hand lying open on the cave floor,
    fingers curled, the cloak edge rising and falling with slow breathing; a dust-lit shaft of sun crosses it.
 - s1 'Inside the cave, the young men sleep.': pull back from the hand to the five bundled cloaks in a row; no one
    moves except the breathing; a drip of water falls somewhere in the dark.
 - d1 (18:18, turned right and left; the dog): wide shot toward the entrance: the dog stretched across the threshold,
    forelegs out. In the same take the sleepers' cloaked shapes slowly roll from one side to the other by themselves,
    smoothly, with no hand touching them; the camera tilts left then right with them.
 - d2 (18:25, three hundred years): time-lapse on the cave floor: the sun beam sweeps across the earth again and
    again, seasons shown by the colour of the light (white summer, grey winter); leaves blow in and out, a vine creeps
    over the cave lip; the cloaked shapes stay exactly where they are.
 - l1-l3: the open hand again, untouched; the sleepers' cloaks turned to the other side; the dog's paws on the stone
    lip, still.
 - e1 'Not forgotten.': the sunbeam falling on the quiet row of cloaks, steady.
CAMERA AND WHY: Macro on one hand first (curiosity: is he alive?), then a slow pull-back to the row; the tilt
   left-right follows the turning of the sleepers; the time-lapse is locked off on a tripod-still frame so only light
   changes, which makes years pass without a cut; end on the steady sunbeam.
"""

LINES = [
    ("h1", "hook", "They looked awake. They were asleep for three hundred years."),
    ("s1", "setup", "Inside the cave, the young men sleep."),
    ("d1", "dlg", "And you would think them awake, while they were asleep. And We turned them to the right and to the left, while their dog stretched his forelegs at the entrance."),
    ("d2", "dlg", "And they remained in their cave for three hundred years and exceeded by nine."),
    ("l1", "lesson", "They could not guard themselves."),
    ("l2", "lesson", "Still, Allah|Allāh turned them to the right and left."),
    ("l3", "lesson", "Even asleep, they were not forgotten."),
    ("e1", "end", "Not forgotten."),
]
CHECK = {"d1": ('quran', "k18_18a"), "d2": ('quran', "k18_25")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.6, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_02_the-sleep', 'title': "They Looked Awake. They Were Asleep for Three Hundred Years", 'follow': ''}
KEYS = {"h1": ["awake.", "asleep", "three"],
        "s1": ["sleep."],
        "d1": ["asleep.", "dog", "entrance."],
        "d2": ["three", "hundred", "nine."],
        "l1": ["guard"],
        "l2": ["turned", "left."],
        "l3": ["forgotten."],
        "e1": ["forgotten."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Allāh says', 'Allāh says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('Allāh says', 'Allāh says')}]
