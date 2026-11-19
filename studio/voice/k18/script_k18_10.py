"""v5 Short (lesson 10 of 15) of the series "15 Lessons from Surah Al-Kahf": "He Damaged a Poor People's Boat. Wait for the Reason" (Quran 18:71, 18:79).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: A small, weathered wooden fishing boat with a patched cloth sail, coiled nets, wooden floats and a bailing
   bucket, on a calm bright sea off a rocky coast. Aboard: two passengers seen from behind (a tall one in a plain
   cloak, a younger one in a head cloth) and one boatman at the tiller as a silhouette. Far out on the horizon: a big
   royal ship with a wide hull, a tall red-and-gold sail and a banner, seizing a smart boat alongside.
TIME OF DAY: Bright, clear morning, flat sea with small glints.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 "He damaged a poor people's boat. Wait for the reason.": frame 1 is the hull at the waterline, a dark gap
    opening where a plank is pried loose by a hand holding a short tool; water starts to bubble in.
 - s1 'At sea, the servant tears the boat open. Musa objects:': wide shot of the little boat on the sea; two
    passengers at the stern; one points down at the gap; the boatman's shape turns.
 - d1 (18:71, Musa's objection): inside the hull: water rising over the floorboards around the nets; the younger
    passenger's hands lifted in protest; the camera tilts from the floor up to the open sky.
 - d2 (18:79, the servant's reason: poor people, a king seizing every good ship): cut to the horizon: the royal ship
    with its red-and-gold sail pulls up beside a fine boat and takes it; then it passes our small damaged boat without
    a glance; the camera glides to the patched plank on our boat, and water stops coming in.
 - l1-l3: the gap in the plank in close-up; the royal ship sailing past, far away; the patch on the hull.
 - e1 'Wait for the reason.': the little patched boat afloat in clear light, nets steady.
CAMERA AND WHY: Macro on the damage so the hook is 'why would anyone do that?'; the raised-hands protest shot is
   Musa's feeling without a face; the reveal is the big ship passing by the damaged boat, which turns the harm into
   protection in one image; end on the small afloat boat.
"""

LINES = [
    ("h1", "hook", "He damaged a poor people's boat. Wait for the reason."),
    ("s1", "setup", "At sea, the servant tears the boat open. Musa|Mūsā objects:"),
    ("d1", "dlg", "Have you torn it open to drown its people? You have certainly done a grave thing."),
    ("d2", "dlg", "As for the ship, it belonged to poor people working at sea. So I intended to cause defect in it as there was after them a king who seized every good|[good] ship by force."),
    ("l1", "lesson", "It looked like harm."),
    ("l2", "lesson", "It was protection from a king."),
    ("l3", "lesson", "Not every damage is a loss."),
    ("e1", "end", "Wait for the reason."),
]
CHECK = {"d1": ('quran', "k18_71a"), "d2": ('quran', "k18_79")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.55, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_10_the-boat', 'title': "He Damaged a Poor People's Boat. Wait for the Reason", 'follow': ''}
KEYS = {"h1": ["damaged", "boat.", "reason."],
        "s1": ["tears", "boat", "objects:"],
        "d1": ["torn", "drown", "grave"],
        "d2": ["poor", "king", "force."],
        "l1": ["harm."],
        "l2": ["protection", "king."],
        "l3": ["damage", "loss."],
        "e1": ["reason."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Mūsā says', 'The servant says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('Mūsā says', 'The servant says')}]
