"""v5 Short (lesson 3 of 15) of the series "15 Lessons from Surah Al-Kahf": "Never Say 'I'll Do It Tomorrow' Without This" (Quran 18:23-24).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: A mud-brick courtyard in a hill village: a clay wall with a row of thumb-scratched tally marks, a wooden
   ladder, a coil of rope, a spade and a basket lined up by a low doorway, an olive tree, a sleeping chicken coop. One
   man in a work-worn tunic and head cloth, shown only from behind or as hands.
TIME OF DAY: Dusk, a long lamp-lit night, then the first grey light of the next morning.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 "Never say 'I'll do it tomorrow' without this.": frame 1: a thumb dragging a fresh tally scratch into the clay
    wall beside six older ones, clay crumbs falling.
 - s1 'Allah teaches how to talk about tomorrow:': the man's back as he lines up spade, rope and basket by the
    doorway, dusk light turning the wall orange; he stops, hands on hips, looking at the work.
 - d1 (18:23, 'I will do that tomorrow'): slow push toward the lined-up tools from the doorway; the lamp inside throws
    the man's long shadow over them.
 - d2 (18:24, if Allah wills; remember when you forget): cut to the next morning: the same tools in cold grey light, a
    gentle breeze, the doorway empty; a hand ties a loose knot of cord around its own finger as a reminder, then holds
    the hand open.
 - l1-l3: the sun edge rising over the wall; an open hand; the knotted cord around the finger.
 - e1 'Say: in sha Allah.': close-up of the thumb resting on the tally marks, light warming.
CAMERA AND WHY: Close macro to start (the scratch, a satisfying tactile hook), then a gentle push in at dusk to feel
   the plan building up; cutting to the same frame in morning light shows 'tomorrow' arriving and not being ours; the
   knotted cord is the one action in the video, so the eye stays on 'remember'.
"""

LINES = [
    ("h1", "hook", "Never say 'I'll do it tomorrow' without this."),
    ("s1", "setup", "Allah|Allāh teaches how to talk about tomorrow:"),
    ("d1", "dlg", "And never say of anything, Indeed, I will do that tomorrow."),
    ("d2", "dlg", "Except when|[when adding,|adding], If Allah|Allāh wills. And remember your Lord when you forget it|[it] and say, Perhaps my Lord will guide me to what is nearer than this to right conduct."),
    ("l1", "lesson", "Tomorrow is not in your hands."),
    ("l2", "lesson", "Add the words, and mean them."),
    ("l3", "lesson", "And if you forget, remember Him."),
    ("e1", "end", "Say: in|in sha|shā' Allah.|Allāh."),
]
CHECK = {"d1": ('quran', "k18_23"), "d2": ('quran', "k18_24")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.5, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_03_in-sha-allah', 'title': "Never Say 'I'll Do It Tomorrow' Without This", 'follow': ''}
KEYS = {"h1": ["tomorrow'", "this."],
        "s1": ["tomorrow:"],
        "d1": ["never", "say", "tomorrow."],
        "d2": ["Allāh", "wills.", "remember"],
        "l1": ["Tomorrow", "hands."],
        "l2": ["Add", "mean"],
        "l3": ["forget,", "remember"],
        "e1": ["shā'", "Allāh."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Allāh says', 'Allāh says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('Allāh says', 'Allāh says')}]
