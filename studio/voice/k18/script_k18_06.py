"""v5 Short (lesson 6 of 15) of the series "15 Lessons from Surah Al-Kahf": "Allah Compares This World to a Rainstorm" (Quran 18:45).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: A wide, flat barley plain with a few scattered stones and one low mud-brick field hut far off, under a huge
   sky. No people. Plant life is the star: green stalks, then yellow straw, then loose chaff blowing across bare
   earth.
TIME OF DAY: Starts under heavy rain-light (grey-green), then breaks into clear golden sun, then a dry, windy late
   afternoon.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'Allah compares this world to a rainstorm.': frame 1 is a fat raindrop hitting dry cracked earth in macro, a
    dark splash blooming; more drops join and a tiny green shoot starts to unfold.
 - s1 'Allah gives a picture of this life:': pull back to a plain of rain falling on bare soil; thin green points push
    up everywhere (time-lapse).
 - d1 (18:45, rain, vegetation mingles, dry remnants, scattered by winds): one continuous time-lapse over the field:
    rain stops, green stalks thicken and tangle with each other and lean together, then the sun bakes them yellow,
    then brown and brittle; a wind rises and the dry stalks break and are carried off in long streams across the
    plain.
 - d2 (18:45 end, Allah is ever Perfect in Ability): the wind drops: a locked-off wide shot of the empty bare plain
    under an enormous sky, one single straw stalk standing steady in the foreground.
 - l1-l3: a green stalk in macro; a dry stalk bending; chaff drifting out of frame.
 - e1 'Hold it lightly.': an open palm (cloak sleeve, no face) letting dry straw slip off it into the breeze.
CAMERA AND WHY: Macro drop first (a strong, simple, tactile hook); a long locked-off time-lapse for the parable so the
   whole life cycle is watched in one unbroken take; the final locked-off wide shot with one standing stalk gives a
   calm, huge 'Allah is over all things' beat.
"""

LINES = [
    ("h1", "hook", "Allah|Allāh compares this world to a rainstorm."),
    ("s1", "setup", "Allah|Allāh gives a picture of this life:"),
    ("d1", "dlg", "And present to them the example of the life of this world, its|[its being|being] like rain which We send down from the sky, and the vegetation of the earth mingles with it and then|[then] it becomes dry remnants, scattered by the winds."),
    ("d2", "dlg", "And Allah|Allāh is ever, over all things, Perfect in Ability."),
    ("l1", "lesson", "It grows green."),
    ("l2", "lesson", "Then it dries and scatters."),
    ("l3", "lesson", "Hold this world lightly."),
    ("e1", "end", "Hold it lightly."),
]
CHECK = {"d1": ('quran', "k18_45a"), "d2": ('quran', "k18_45b")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.6, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_06_the-rain', 'title': "Allah Compares This World to a Rainstorm", 'follow': ''}
KEYS = {"h1": ["Allāh", "rainstorm."],
        "s1": ["life:"],
        "d1": ["rain", "dry", "scattered"],
        "d2": ["Allāh", "Perfect"],
        "l1": ["green."],
        "l2": ["dries", "scatters."],
        "l3": ["lightly."],
        "e1": ["lightly."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Allāh says', 'Allāh says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('Allāh says', 'Allāh says')}]
