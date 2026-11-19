"""v5 Short (lesson 7 of 15) of the series "15 Lessons from Surah Al-Kahf": "Wealth and Children Are an Adornment. What Lasts?" (Quran 18:46, 18:30).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: The courtyard of a small stone house with a date palm in the corner, a clay water jar, a low doorway with a
   wooden door, a wall niche for a lamp. On a woven mat: a dish of gold coins and a silver bracelet (adornment). By
   the door: a child's small sandals and a wooden toy hoop. Later: a bowl of bread and dates, a lit oil lamp, a young
   palm sapling in a pot of earth. People only as hands and sleeves.
TIME OF DAY: Soft morning light changing to warm late afternoon.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'Wealth and children are called an adornment. What lasts?': frame 1 is the dish of gold coins on the mat
    catching light; a hand's shadow passes over it and a bracelet is laid on top.
 - s1 'Allah separates two things:': pan right to the child's sandals and wooden hoop by the doorway, the same sunbeam
    falling on them.
 - d1 (18:46a, wealth and children are adornment): close-ups of the shiny things with a slight glitter shimmer: coins,
    bracelet, sandals, hoop; the sunbeam holds on each for a beat.
 - d2 (18:46b, enduring good deeds are better): match-cut to the same mat: a hand now places a bowl of bread and dates
    for someone at the door; another hand sets a lit lamp in the wall niche; the glitter is gone, the light is warm
    and steady.
 - d3 (18:30, Allah will not let the reward be lost): a hand waters a young palm sapling in its pot with a clay cup; a
    few drops sink into the soil; the camera tilts up the sapling toward the full-grown palm in the corner.
 - l1-l3: the coins in shadow; the lamp flame in its niche; the sapling with a new leaf.
 - e1 'Invest in what stays.': the lamp in the niche, steady.
CAMERA AND WHY: The same mat is filmed twice (shiny things, then good deeds) so the eye compares them; light turns
   from sparkle to steady glow to say 'adornment' vs 'enduring'; the tilt up from sapling to full palm makes 'not
   lost' read as growth over time.
"""

LINES = [
    ("h1", "hook", "Wealth and children are called an adornment. What lasts?"),
    ("s1", "setup", "Allah|Allāh separates two things:"),
    ("d1", "dlg", "Wealth and children are but|[but] adornment of the worldly life."),
    ("d2", "dlg", "But the enduring good deeds are better to your Lord for reward and better for one's|[one's] hope."),
    ("d3", "dlg", "Indeed, those who have believed and done righteous deeds |- indeed, We will not allow to be lost the reward of any who did well in deeds."),
    ("l1", "lesson", "Money decorates a life."),
    ("l2", "lesson", "Good deeds are what stay."),
    ("l3", "lesson", "No reward for good is lost."),
    ("e1", "end", "Invest in what stays."),
]
CHECK = {"d1": ('quran', "k18_46a"), "d2": ('quran', "k18_46b"), "d3": ('quran', "k18_30")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.5, "d2": 0.7, "d3": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_07_what-lasts', 'title': "Wealth and Children Are an Adornment. What Lasts?", 'follow': ''}
KEYS = {"h1": ["adornment.", "lasts?"],
        "s1": ["things:"],
        "d1": ["Wealth", "children", "adornment"],
        "d2": ["enduring", "good", "better"],
        "d3": ["righteous", "lost"],
        "l1": ["decorates"],
        "l2": ["stay."],
        "l3": ["lost."],
        "e1": ["stays."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Allāh says', 'Allāh says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('Allāh says', 'Allāh says')}, {'top': "d3", 'labels': ('Allāh says',)}]
