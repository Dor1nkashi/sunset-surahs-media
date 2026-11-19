"""v5 Short (lesson 12 of 15) of the series "15 Lessons from Surah Al-Kahf": "A Town Refused Them Food. He Repaired Its Wall Anyway" (Quran 18:82).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: The edge of a dry hill town: shuttered wooden doors and window screens on flat-roofed mud-brick houses, and
   one long crumbling mud-brick wall, leaning outward with a bulge and cracks running through it. A single thorn tree
   gives shade. The two travellers sit under it, tired, backs to camera. At the foot of the wall, half-buried: a large
   sealed clay jar. Two small children's silhouettes sit on a step across the lane.
TIME OF DAY: Midday glare with hard shadows, then a long soft golden evening; a final shot years later in clean
   afternoon light.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'A town refused them food. He repaired its wall anyway.': frame 1: a hairline crack in the leaning wall slowly
    widening, dry dust trickling, a hand pressing a palm flat against it.
 - s1 'A wall is about to collapse. Musa says he could have asked for payment.': shuttered doors one after another,
    closed; the two travellers under the thorn tree; then a hand lifting fresh mud bricks and plastering the bulge
    with a trowel; camera tracking along the wall as it straightens.
 - d1 (18:82a, two orphan boys, a treasure under the wall, a righteous father): a gentle dissolve down through the
    earth at the wall's foot to the sealed clay jar; across the lane the two small silhouettes of children on the
    step, backs to camera.
 - d2 (18:82b, so they reach maturity and extract their treasure): time passes: the sun moves and the wall stays
    upright; two taller silhouettes (the boys now young men, from behind) kneel at its foot and lift the jar out of
    the earth, golden light on the clay.
 - l1-l3: the sealed jar in the earth; the straight wall in warm light; the repaired plaster in macro.
 - e1 'Do good anyway.': the straightened wall at sunset, its long shadow across the lane.
CAMERA AND WHY: A macro crack to start (suspense: it's about to fall), a long tracking shot along the wall for the
   repair so the viewer watches it straighten, a vertical dissolve down into the earth for the hidden treasure
   (impossible to show any other way without faces), and a held wide at the end that proves the wall stands.
"""

LINES = [
    ("h1", "hook", "A town refused them food. He repaired its wall anyway."),
    ("s1", "setup", "A wall is about to collapse. Musa|Mūsā says he could have asked for payment."),
    ("d1", "dlg", "And as for the wall, it belonged to two orphan boys in the city, and there was beneath it a treasure for them, and their father had been righteous."),
    ("d2", "dlg", "So your Lord intended that they reach maturity and extract their treasure, as a mercy from your Lord."),
    ("l1", "lesson", "A wall guarded a treasure."),
    ("l2", "lesson", "Their father had been righteous."),
    ("l3", "lesson", "Good can outlive you."),
    ("e1", "end", "Do good anyway."),
]
CHECK = {"d1": ('quran', "k18_82a"), "d2": ('quran', "k18_82b")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.6, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_12_the-wall', 'title': "A Town Refused Them Food. He Repaired Its Wall Anyway", 'follow': ''}
KEYS = {"h1": ["refused", "wall"],
        "s1": ["collapse.", "payment."],
        "d1": ["orphan", "treasure", "righteous."],
        "d2": ["maturity", "treasure,", "mercy"],
        "l1": ["wall", "treasure."],
        "l2": ["father", "righteous."],
        "l3": ["outlive", "you."],
        "e1": ["good", "anyway."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('The servant says', 'The servant says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('The servant says', 'The servant says')}]
