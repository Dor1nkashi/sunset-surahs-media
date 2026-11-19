"""v5 Short (lesson 6 of 15) of the series "15 Lessons from Surah Yusuf": "Behind Closed Doors, He Said One Sentence" (Quran 12:21, 12:23).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: A wealthy Egyptian household in Joseph's time: whitewashed mud-brick walls, painted papyrus-bundle columns,
   an inner courtyard with a small pond and date palm, heavy carved wooden doors with bolts, oil lamps, linen
   curtains.
TIME OF DAY: Evening, long amber light through a high window, then lamplight.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'Behind closed doors, he said one sentence.': frame 1 is a heavy carved door with its bolt sliding closed on the
    inside, lamplight leaking under it.
 - s1 'Now he lives in an Egyptian household.': pull back through the courtyard: the pond, the palm, a servant's back
    sweeping; sunlight on painted columns.
 - s2 'The wife of the house tries to tempt him, with the doors closed.': a woman's hand-and-sleeve silhouette bolts a
    second door; the young man's silhouette stands still with his back to her, facing the closed door. Nothing
    explicit, no faces.
 - d1 (12:23 '[I seek] the refuge of Allah.'): his silhouette's hand rises to the door and rests on the wood; a single
    shaft of window light falls on it.
 - d2 (12:23b): the camera tilts up the wall to the lintel and the carved house emblem, then to a small lamp that
    burns steady.
 - l1-l3: the bolt, the lamp, the hand on the door, each as one calm object frame.
 - e1 'Know your reasons before you need them.': the lamp flame, steady, reflected in the polished wood.
CAMERA AND WHY: Hook = the sliding bolt (instant tension without showing anything improper). Camera never enters the
   tempter's space: it stays on his side of the room, with his back to us, so the viewer reads the moral axis from
   posture. The slow tilt up to the lintel while he names his master's trust turns the scene from threat to principle.
"""

LINES = [
    ("h1", "hook", "Behind closed doors, he said one sentence."),
    ("s1", "setup", "Now he lives in an Egyptian household."),
    ("s2", "setup", "The wife of the house tries to tempt him, with the doors closed."),
    ("d1", "dlg", "I|[I seek|seek] the refuge of Allah.|Allāh."),
    ("d2", "dlg", "Indeed, he is my master, who has made good my residence. Indeed, wrongdoers will not succeed."),
    ("l1", "lesson", "First, he took refuge in Allah|Allāh."),
    ("l2", "lesson", "Then, he remembered who had trusted him."),
    ("l3", "lesson", "Say the reason out loud."),
    ("e1", "end", "Know your reasons before you need them."),
]
CHECK = {"d1": ('quran', "y12_23"), "d2": ('quran', "y12_23b")}
GAP = {"h1": 0.45, "s1": 0.2, "s2": 0.35, "d1": 0.55, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_06_the-refuge', 'title': "Behind Closed Doors, He Said One Sentence", 'follow': ''}
KEYS = {"h1": ["closed", "doors,", "sentence."],
        "s1": ["Egyptian"],
        "s2": ["doors", "closed."],
        "d1": ["refuge", "Allāh."],
        "d2": ["master,", "residence.", "succeed."],
        "l1": ["refuge", "Allāh."],
        "l2": ["trusted"],
        "l3": ["reason", "loud."],
        "e1": ["reasons"]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Yūsuf says',)}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('Yūsuf says',)}]
