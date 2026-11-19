"""v5 Short (lesson 1 of 15) of the series "15 Lessons from Surah Yusuf": "Eleven Stars, the Sun and the Moon Bowed to a Boy" (Quran 12:4-5).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: Canaan hill country: a small stone-and-mud family house with a flat roof, a ladder of stone steps up the
   side, olive trees and a sheep pen behind it. Everything is in dry limestone and earth tones.
TIME OF DAY: Late night turning to the hour before dawn.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'Eleven stars, the sun and the moon, all bowing to a boy.': frame 1 is the night sky above the roof; eleven
    stars in a loose circle, the sun's golden disc and the moon's pale disc rising together, all slowly tilting/bowing
    toward a small silhouette on the roof edge (a child-sized figure seen from behind, wrapped in a plain cloak).
 - s1 'A boy named Yusuf wakes from a dream.': the sky dissolves to a close-up of a woollen blanket and a hand pushing
    it back, dawn grey in the doorway; the roof is empty and still.
 - s2 'He tells his father, Yaqub:': the boy's small silhouette crosses the roof toward a taller, seated silhouette in
    a long cloak, both seen from behind, lamp glow between them.
 - d1 (Yusuf, 12:4): behind the card, the dream sky replays softly: stars, sun, moon bowing, drawn as light, not as
    people.
 - d2 (Yaqub, 12:5): the seated figure's hand rises, palm toward the sleeping house and the sheep pen where the
    brothers' bedrolls lie; the camera follows the gesture to the row of bedrolls (no faces).
 - l1-l3: three slow beats of the same house at dawn: closed wooden door, a single lamp going out, the pen gate
    latched, so each lesson line sits on a quiet object.
 - e1 'Guard your best news.': close-up of the lamp flame cupped inside a hand.
CAMERA AND WHY: Start wide and low looking UP at the stars so the dream feels vast; then drop to eye level behind the
   two silhouettes (their backs, because no faces); during the warning push very slowly toward the row of bedrolls to
   make the viewer feel who the warning is about; finish on the cupped flame, a small private light = guarded news.
"""

LINES = [
    ("h1", "hook", "Eleven stars, the sun and the moon, all bowing to a boy."),
    ("s1", "setup", "A boy named Yusuf|Yūsuf wakes from a dream."),
    ("s2", "setup", "He tells his father, Yaqub:|Yaʿqūb:"),
    ("d1", "dlg", "O my father, indeed I have seen in|[in a dream|dream] eleven stars and the sun and the moon; I saw them prostrating to me."),
    ("d2", "dlg", "O my son, do not relate your vision to your brothers or they will contrive against you a plan."),
    ("l1", "lesson", "Not every dream is for everyone."),
    ("l2", "lesson", "Good news can stir envy."),
    ("l3", "lesson", "Choose who hears it."),
    ("e1", "end", "Guard your best news."),
]
CHECK = {"d1": ('quran', "y12_4q"), "d2": ('quran', "y12_5q")}
GAP = {"h1": 0.45, "s1": 0.2, "s2": 0.35, "d1": 0.55, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_01_the-dream', 'title': "Eleven Stars, the Sun and the Moon Bowed to a Boy", 'follow': ''}
KEYS = {"h1": ["Eleven", "stars,", "boy."],
        "s1": ["Yūsuf", "dream."],
        "s2": ["Yaʿqūb:"],
        "d1": ["eleven", "stars", "sun", "moon;"],
        "d2": ["do", "not", "relate", "brothers"],
        "l1": ["Not", "dream"],
        "l2": ["envy."],
        "l3": ["Choose", "hears"],
        "e1": ["Guard", "news."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Yūsuf says', 'Yaʿqūb answers')}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('Yūsuf says', 'Yaʿqūb answers')}]
