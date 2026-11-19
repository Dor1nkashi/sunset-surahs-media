"""v5 Short (lesson 15 of 15) of the series "15 Lessons from Surah Yusuf": "Years Later, the Childhood Dream Came True" (Quran 12:100-101).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: The Egyptian royal court at its brightest: a raised throne, polished stone, linen banners; family members
   arriving in travel cloaks. Above the palace, the night sky of the first dream.
TIME OF DAY: Golden hour fading to night so the stars of the first dream appear.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'Years later, the dream from his childhood came true.': frame 1 is the palace court in golden light with eleven
    stars of the first dream faintly visible in the sky above its roofline.
 - s1 'His family comes to Egypt, and bows to him.': arrival: a line of cloaked silhouettes entering the court, ending
    in a bow that traces the same arc the stars made in the first lesson.
 - s2 'Yusuf says:': a standing silhouette's back at the dais, one hand open.
 - d1 (12:100a): the stars above align into the same eleven-star arc with the sun and moon returning to their places
    from lesson 1; thin lines of light draw from the stars down to the bowed figures.
 - d2 (12:101b): the court slowly dims; the sky takes over; one steady star.
 - l1-l3: the eleven stars fading, the star remaining, and the court empty in moonlight.
 - e1 'Ask for a good ending.': the single star over the empty throne.
CAMERA AND WHY: Mirror lesson 1 shot-for-shot: wide low angle on the sky, so viewers feel the circle closing; the
   camera then tips down to the court and back up to the one star, because the closing prayer is the point; ends on
   the star which also leads back to the first video's frame.
"""

LINES = [
    ("h1", "hook", "Years later, the dream from his childhood came true."),
    ("s1", "setup", "His family comes to Egypt, and bows to him."),
    ("s2", "setup", "Yusuf|Yūsuf says:"),
    ("d1", "dlg", "O my father, this is the explanation of my vision of before. My Lord has made it reality."),
    ("d2", "dlg", "Cause me to die a Muslim and join me with the righteous."),
    ("l1", "lesson", "Allah's|Allāh's timing is not ours."),
    ("l2", "lesson", "He gave the credit to his Lord."),
    ("l3", "lesson", "And at the top, he asked for a good ending."),
    ("e1", "end", "Ask for a good ending."),
]
CHECK = {"d1": ('quran', "y12_100a"), "d2": ('quran', "y12_101b")}
GAP = {"h1": 0.45, "s1": 0.25, "s2": 0.2, "d1": 0.6, "d2": 0.75, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.4}
META = {'name': 'v5_y12_15_the-dream-comes-true', 'title': "Years Later, the Childhood Dream Came True", 'follow': ''}
KEYS = {"h1": ["dream", "true."],
        "s1": ["bows"],
        "s2": ["Yūsuf"],
        "d1": ["explanation", "vision", "reality."],
        "d2": ["die", "Muslim", "righteous."],
        "l1": ["timing"],
        "l2": ["credit", "Lord."],
        "l3": ["good", "ending."],
        "e1": ["good", "ending."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Yūsuf says', 'Yūsuf prays')}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('Yūsuf says', 'Yūsuf prays')}]
