"""v5 Short (lesson 9 of 15) of the series "15 Lessons from Surah Al-Kahf": "Losing the Fish Was What He Was Looking For" (Quran 18:61, 18:64).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: A flat-topped rock at a rocky shore where two bands of water meet in a visible seam: clear turquoise on one
   side, murky green on the other. On the rock: a woven reed basket holding a silver fish, a cloth bag, a skin water
   bottle. Two travellers, tall and young, seen only as silhouettes from behind or as hands. Wet sand beside the rock,
   with a double line of footprints.
TIME OF DAY: Bright midday glare on the water.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'Losing the fish was exactly what he was looking for.': frame 1 is a silver fish flipping out of a reed basket
    on the rock, sliding over wet stone in macro and dropping into the water, leaving a bright silver streak.
 - s1 'Musa and his servant travel on with a fish.': pull back: the two travellers sit at the rock, bags down,
    resting; the basket's lid ajar; they look out at the water (backs only).
 - d1 (18:61, they forgot their fish; it slipped away into the sea): close on the basket, now empty and tilted; the
    water at the seam ripples, a thin silver line darts away under the surface and is gone; the travellers' backs
    don't turn.
 - d2 (18:64, 'That is what we were seeking'; they return following footprints): one traveller's hand lifts and points
    out at the seam; both stand; the camera drops to the wet sand where their footprints lead away along the shore,
    and follows them back the way they came.
 - l1-l3: the empty basket on the rock; a hand pointing at the water; footprints filling with water.
 - e1 'Retrace your steps.': a single wet footprint at the water's edge slowly filling with sea water.
CAMERA AND WHY: A macro fish-escape is the hook (motion + a mystery); the two travellers stay still as backs so the
   viewer notices what they did not; the low camera following the footprints on the 'returned' beat is literally
   retracing steps; the last footprint shot mirrors the first splash.
"""

LINES = [
    ("h1", "hook", "Losing the fish was exactly what he was looking for."),
    ("s1", "setup", "Musa|Mūsā and his servant travel on with a fish."),
    ("d1", "dlg", "But when they reached the junction between them, they forgot their fish, and it took its course into the sea, slipping away."),
    ("d2", "dlg", "That is what we were seeking. So they returned, following their footprints."),
    ("l1", "lesson", "The thing they lost was the clue."),
    ("l2", "lesson", "So they turned around."),
    ("l3", "lesson", "Sometimes you retrace your steps."),
    ("e1", "end", "Retrace your steps."),
]
CHECK = {"d1": ('quran', "k18_61"), "d2": ('quran', "k18_64a")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.55, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_09_the-fish', 'title': "Losing the Fish Was What He Was Looking For", 'follow': ''}
KEYS = {"h1": ["fish", "looking", "for."],
        "s1": ["fish."],
        "d1": ["forgot", "fish,", "slipping"],
        "d2": ["seeking.", "returned,", "footprints."],
        "l1": ["lost", "clue."],
        "l2": ["turned", "around."],
        "l3": ["retrace", "steps."],
        "e1": ["Retrace", "steps."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('The Quran says', 'The Quran says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('The Quran says', 'The Quran says')}]
