"""v5 Short (lesson 1 of 15) of the series "15 Lessons from Surah Al-Kahf": "Young Men, One Cave, and One Prayer" (Quran 18:10, 18:14).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: A dry rocky mountain slope with thorn scrub and pale limestone, a narrow goat path climbing from a distant
   town (a scatter of small yellow lights far below), and a wide, low cave whose mouth is just tall enough to enter
   stooping. Inside: a smooth earth floor, a few flat stones to sit on. Five young men seen only as silhouettes from
   behind, in plain long tunics, cloth head-wraps, leather sandals and light shoulder bags.
TIME OF DAY: Late afternoon turning to dusk; the cave mouth glows amber-orange against a deepening blue sky.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'Young men, one cave, and one prayer.': frame 1 is a close-up of five pairs of sandalled feet leaving a stone
    road and stepping onto a dusty goat path; dust puffs at every step; the camera tracks backwards in front of them.
 - s1 'A few young men retreat to a cave and pray:': the five silhouettes climb the slope from behind, one stops and
    glances back at the town lights (back of the head only), then follows the others into the dark mouth.
 - d1 (18:10, the youths' prayer): inside, they sit in a loose circle with their backs to the camera, the amber cave
    mouth beyond them; their hands rise slowly palms up; the camera creeps in over one shoulder toward the light.
 - d2 (18:14, Allah makes their hearts firm): they get up one by one and stand in a line facing the cave mouth, camera
    now low behind them; the light on the floor between their feet brightens; shoulders square, no weapons, no
    movement except standing.
 - l1-l3: palms-up hands in close-up; a row of sandalled feet planted side by side on the cave floor; a single oil
    lamp flame that steadies and grows after a draught.
 - e1 'Ask. Then stand firm.': the steady lamp flame in the cave, the five silhouettes small and still behind it.
CAMERA AND WHY: Start low and moving (feet, dust) so the first second is motion; move to eye level behind the group so
   the viewer is one of them; the slow creep over a shoulder during the prayer is intimacy, the low stable camera
   behind the standing line during 'made firm their hearts' says strength without showing a face.
"""

LINES = [
    ("h1", "hook", "Young men, one cave, and one prayer."),
    ("s1", "setup", "A few young men retreat to a cave and pray:"),
    ("d1", "dlg", "Our Lord, grant us from Yourself mercy and prepare for us from our affair right guidance."),
    ("d2", "dlg", "And We made firm their hearts when they stood up and said, Our Lord is the Lord of the heavens and the earth."),
    ("l1", "lesson", "They asked for guidance first."),
    ("l2", "lesson", "Then they stood up and said it out loud."),
    ("l3", "lesson", "And Allah|Allāh made their hearts firm."),
    ("e1", "end", "Ask. Then stand firm."),
]
CHECK = {"d1": ('quran', "k18_10a"), "d2": ('quran', "k18_14a")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.55, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_01_the-cave', 'title': "Young Men, One Cave, and One Prayer", 'follow': ''}
KEYS = {"h1": ["Young", "cave,", "prayer."],
        "s1": ["cave", "pray:"],
        "d1": ["grant", "guidance."],
        "d2": ["firm", "stood", "up"],
        "l1": ["guidance"],
        "l2": ["stood", "up"],
        "l3": ["firm."],
        "e1": ["Ask.", "firm."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('The youths pray', 'Allāh says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('The youths pray', 'Allāh says')}]
