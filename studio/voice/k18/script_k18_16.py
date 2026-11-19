"""v5 Short (outro) of the series "15 Lessons from Surah Al-Kahf": "Fifteen Lessons from the Surah of the Cave (Surah Al-Kahf)" (Quran 18:110).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: The mountain ridge and cave mouth of the opener at first light: the same cave with its worn stone lip, the
   goat path, and far below the four places of the series (walled garden with date palms, the meeting of two seas, the
   village wall, the iron barrier between two peaks) all now lit by the sun. No people.
TIME OF DAY: Sunrise: golden light spreading from the east, mist burning off, dew on the rocks.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'That was the Surah of the Cave.': frame 1 is sunrise breaking over the eastern ridge, long gold light along the
    cave lip and the rocks, a thin mist lifting.
 - s1 'And Allah says:': the camera glides along the ridge toward the cave mouth, the four far places catching light
    one after another.
 - d1 (18:110, hope for the meeting with his Lord): wide: golden light hits the garden, the water seam, the village
    wall and the iron barrier in turn (each in its own distant frame), then returns to the cave mouth steady in
    sunlight.
 - l1 'Faith. Wealth. Knowledge. Power.': four quick object beats: the cave lamp (faith), a date cluster on a palm
    (wealth), a reed pen over parchment (knowledge), a dark iron hinge with a copper glow (power).
 - e1 'Start again from the cave.': the camera tilts down into the cave mouth until it frames the same dark arch as
    frame 1 of the opener; the dim lamp inside, so the loop leads into lesson 1.
CAMERA AND WHY: One continuous glide from sunrise sky along the ridge to the cave (about 6 s), with a lit-up 'all
   places in one view' beat as a farewell for the long-form, then a tilt into the cave mouth matching the opener so
   the Short loops.
"""

LINES = [
    ("h1", "hook", "That was the Surah|Sūrah of the Cave."),
    ("s1", "setup", "And Allah|Allāh says:"),
    ("d1", "dlg", "So whoever would hope for the meeting with his Lord |- let him do righteous work and not associate in the worship of his Lord anyone."),
    ("l1", "lesson", "Faith. Wealth. Knowledge. Power."),
    ("e1", "end", "Start again from the cave."),
]
CHECK = {"d1": ('quran', "k18_110a")}
GAP = {"h1": 0.45, "s1": 0.2, "d1": 0.7, "l1": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_16_outro', 'title': "Fifteen Lessons from the Surah of the Cave (Surah Al-Kahf)", 'follow': ''}
KEYS = {"h1": ["Sūrah", "Cave."],
        "s1": ["Allāh"],
        "d1": ["meeting", "righteous", "anyone."],
        "l1": ["Faith.", "Knowledge.", "Power."],
        "e1": ["cave."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Allāh says',)}
EXCHANGES = [{'top': "d1", 'labels': ('Allāh says',)}]
