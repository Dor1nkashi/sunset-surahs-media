"""v5 Short (lesson 4 of 15) of the series "15 Lessons from Surah Al-Kahf": "He Had Two Gardens, and It Went to His Head" (Quran 18:32, 18:34).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: Two adjoining walled gardens in open farmland: mud-brick walls with an arched wooden gate, tall date palms
   around the edges heavy with orange date clusters, grapevines on wooden trellises dripping with dark grape bunches,
   and between the two gardens a strip of green barley with a narrow stone-lined stream running through it. The owner
   is a broad man in a fine embroidered robe with rings on his fingers (seen from behind or waist-down); his friend is
   slim, in a plain cloak.
TIME OF DAY: Bright mid-morning, warm golden light, a few bees.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'He had two gardens, and it went to his head.': frame 1 is a macro of a heavy purple grape cluster with a bee on
    it; a hand in a jewelled ring reaches in and pulls the bunch toward the camera.
 - s1 'Allah describes a rich man.': high aerial pull-up from the cluster to reveal both walled gardens side by side,
    the barley strip and the stream glinting between them.
 - d1 (18:32, two gardens, palm trees, crops between): a low glide along the stream: first the grapevine trellises on
    the left, then the ring of date palms, then the barley strip; every named thing (grapes, palms, crops) gets a beat
    of sunlight.
 - d2 (18:34, the owner speaks): from behind at shoulder height: the owner and his friend walking the stream path; the
    owner's arm sweeps wide over his land, the friend (smaller, plain cloak) walks a half step behind, head slightly
    lowered.
 - l1-l3: a date cluster on a palm; the stream running in its channel; the owner's ring catching the sun.
 - e1 'A gift is not a rank.': one date palm alone against the blue sky, light on the fruit.
CAMERA AND WHY: A macro hook on the fruit and ring (wealth in one image), then an aerial to show scale; the low glide
   along the stream makes the viewer walk the garden; the camera at the friend's height behind the owner during the
   boast puts the viewer on the listener's side.
"""

LINES = [
    ("h1", "hook", "He had two gardens, and it went to his head."),
    ("s1", "setup", "Allah|Allāh describes a rich man."),
    ("d1", "dlg", "And present to them an example of two men: We granted to one of them two gardens of grapevines, and We bordered them with palm trees and placed between them fields|[fields of|of] crops."),
    ("d2", "dlg", "I am greater than you in wealth and mightier in numbers|[numbers of|of] men."),
    ("l1", "lesson", "Every tree was a gift."),
    ("l2", "lesson", "He still said: I am greater."),
    ("l3", "lesson", "Wealth can make a person look down."),
    ("e1", "end", "A gift is not a rank."),
]
CHECK = {"d1": ('quran', "k18_32"), "d2": ('quran', "k18_34a")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.6, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_04_two-gardens', 'title': "He Had Two Gardens, and It Went to His Head", 'follow': ''}
KEYS = {"h1": ["two", "gardens,", "head."],
        "s1": ["rich", "man."],
        "d1": ["two", "gardens", "palm"],
        "d2": ["greater", "wealth", "mightier"],
        "l1": ["gift."],
        "l2": ["greater."],
        "l3": ["look", "down."],
        "e1": ["gift", "rank."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Allāh says', 'The owner says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('Allāh says', 'The owner says')}]
