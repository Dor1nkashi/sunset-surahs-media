"""v5 Short (lesson 12 of 15) of the series "15 Lessons from Surah Yusuf": "A Hidden Bowl in a Bag Changed Everything" (Quran 12:70, 12:77, 12:76).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: The granary's loading yard at the edge of an Egyptian town: camels kneeling, grain sacks and travel bags
   (saddlebags) laid out, a gate with torches. The key object: a gold measuring bowl (a small hemispherical gold
   vessel with a handle).
TIME OF DAY: Dusk into evening, torchlight.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'A hidden bowl in a bag changed everything.': frame 1 is the gold bowl glinting on a cloth, a hand's shadow
    passing over it, then lifting it out of frame.
 - s1 (12:70): a hand (no face, cloak sleeve) lowers the bowl into the mouth of a saddlebag among the grain; the bag's
    flap is folded over; camels shift behind.
 - s2 'The brothers sneer: a brother of his stole before.': a group of travellers' silhouettes at the gate, one
    pointing; the bag is lifted down and opened by a guard-like silhouette; the bowl is pulled out (real process: hand
    in, gold glint, held up to torchlight).
 - d1 (12:77a): the young man's silhouette stands very still in the background, hands folded at his chest, torch
    flames flicker but his posture does not.
 - d2 (12:76b): slow upward tilt from the bag and bowl to the night sky full of stars; the viewer sees small to vast.
 - l1-l3: the folded hands, the bowl set back on the cloth, a star above the gate.
 - e1 'Not every insult needs an answer.': the quiet folded hands in the torchlight.
CAMERA AND WHY: Macro on the bowl first (curiosity: what's this, why hidden?); the reveal is staged as an object
   search so we never need faces; the held shot on his unmoving silhouette is the lesson (restraint); the tilt to the
   stars on the 'more knowing' line shows humility as scale.
"""

LINES = [
    ("h1", "hook", "A hidden bowl in a bag changed everything."),
    ("s1", "setup", "So when he had furnished them with their supplies, he put the gold|[gold measuring|measuring] bowl into the bag of his brother."),
    ("s2", "setup", "The brothers sneer: a brother of his stole before."),
    ("d1", "dlg", "But Joseph kept it within himself and did not reveal it to them."),
    ("d2", "dlg", "We raise in degrees whom We will, but over every possessor of knowledge is one more|[more] knowing."),
    ("l1", "lesson", "He swallowed the insult."),
    ("l2", "lesson", "Every expert has someone who knows more."),
    ("l3", "lesson", "Stay humble, wherever you stand."),
    ("e1", "end", "Not every insult needs an answer."),
]
CHECK = {"s1": ('quran', "y12_70a"), "d1": ('quran', "y12_77a"), "d2": ('quran', "y12_76b")}
GAP = {"h1": 0.45, "s1": 0.5, "s2": 0.3, "d1": 0.6, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_12_the-hidden-bowl', 'title': "A Hidden Bowl in a Bag Changed Everything", 'follow': ''}
KEYS = {"h1": ["hidden", "bowl", "bag"],
        "s1": ["bowl", "bag"],
        "s2": ["stole"],
        "d1": ["kept", "within", "himself"],
        "d2": ["degrees", "knowledge", "knowing."],
        "l1": ["swallowed", "insult."],
        "l2": ["expert", "more."],
        "l3": ["humble,"],
        "e1": ["insult", "answer."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'card': "s1", 'label': 'Quran'}
DLG = {'labels': ('The Quran says', 'The Quran says')}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('The Quran says', 'The Quran says')}]
