"""v5 Short (lesson 5 of 15) of the series "15 Lessons from Surah Yusuf": "Sold for a Few Coins. Not His Real Worth" (Quran 12:19-20).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: First a dusty caravan route between rocky hills: a line of camels with striped saddle blankets, water skins,
   a wayside well. Then, for the sale, a busy Egyptian slave-market lane: mud-brick stalls, reed awnings, grain sacks,
   brass scales, a stone block as the sale platform. (Slavery is shown only as the story context: objects and
   silhouettes, nothing graphic.)
TIME OF DAY: Late afternoon on the road, then bright market morning.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'He was sold for a few coins.': frame 1 is a close-up of a palm holding a few small silver dirham-like coins,
    light glinting; the palm closes.
 - s1 'A caravan stops at the well and finds a boy.': wide: camels kneel, a man lowers a leather bucket on a rope into
    the well (real process: rope pays out, bucket drops, water pulls it taut); the rope comes up heavy.
 - d1 (12:19q 'Good news! Here is a boy.'): the rope's weight shown by two hands hauling; a hand reaches over the rim
    (no face).
 - d2 (12:20): cut to the market: the coins counted one by one onto a brass scale pan, the pan tipping only slightly;
    the stone block in the sun with a cloaked figure's back standing on it.
 - d3 (12:19b 'Allah was knowing of what they did'): the camera rises over the market, dust and sunlight, everything
    small below; one patch of light stays steady on the boy's silhouette.
 - l1-l3: the scale's pan swinging, then still; a coin dropping; the light patch widening.
 - e1 'Their price was never the truth.': the scale's empty pan in close-up, steady, lit.
CAMERA AND WHY: Coins first (frame-1 curiosity: whose coins, for what?); then the long road/well sequence for the
   story fact; then a rising crane over the market to show 'seen from above' while d3 says Allah was knowing what they
   did; the final static scale shot mirrors the first coin shot so the loop reads cleanly.
"""

LINES = [
    ("h1", "hook", "He was sold for a few coins."),
    ("s1", "setup", "A caravan stops at the well and finds a boy."),
    ("d1", "dlg", "Good news! Here is a boy."),
    ("d2", "dlg", "And they sold him for a reduced price |- a few dirhams |- and they were, concerning him, of those content with little."),
    ("d3", "dlg", "and Allah|Allāh was knowing of what they did."),
    ("l1", "lesson", "They put a price on him."),
    ("l2", "lesson", "It had nothing to do with his worth."),
    ("l3", "lesson", "Allah|Allāh was watching all of it."),
    ("e1", "end", "Their price was never the truth."),
]
CHECK = {"d1": ('quran', "y12_19q"), "d2": ('quran', "y12_20"), "d3": ('quran', "y12_19b")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.45, "d2": 0.7, "d3": 0.65, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_05_the-price', 'title': "Sold for a Few Coins. Not His Real Worth", 'follow': ''}
KEYS = {"h1": ["sold", "few", "coins."],
        "s1": ["caravan", "well"],
        "d1": ["Good", "news!", "boy."],
        "d2": ["sold", "reduced", "price", "dirhams"],
        "d3": ["Allāh", "knowing"],
        "l1": ["price"],
        "l2": ["worth."],
        "l3": ["Allāh", "watching"],
        "e1": ["price", "truth."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('The water drawer says',)}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('The water drawer says',)}, {'top': 'd3', 'labels': ('The Quran says',)}]
