"""v5 Short (lesson 5 of 15) of the series "15 Lessons from Surah Al-Kahf": "Everything He Bragged About Was Gone" (Quran 18:39, 18:42).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: The garden of the previous lesson, shown twice: first intact at its arched wooden gate with palms and vines
   behind it, then ruined: trellises fallen flat in a tangle, vines withered brown, grapes rotted on the ground, date
   clusters shrivelled, the stream channel dry and cracked, palms bare. The owner again in the fine embroidered robe
   (from behind); his friend in a plain cloak.
TIME OF DAY: A bright, hard noon at the gate; then flat grey, dust-hazed light over the ruin.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'Everything he bragged about was gone.': frame 1 is the collapsed trellis in grey light: dry vines on the
    ground, a rotten grape cluster, a cracked stream bed, dust drifting.
 - s1 'His friend told him what to say on entering his garden:': flash back to bright colour at the arched gate: the
    friend stands at the gate, the owner stepping through from behind; the camera sits on the threshold stone.
 - d1 (18:39, what Allah willed): close-up of the owner's hand brushing the wooden gate post as he passes; sunlight on
    the grapes behind; the hand pauses on the post, then drops.
 - d2 (18:42, the fruits are ruined): cut to the ruin: the owner from behind stands in the middle of the collapsed
    trellises; his hands turn over and over, wringing, then hang; dust blows, a loose vine rolls; slow orbit around
    him at knee height.
 - l1-l3: the gate post with the empty threshold; a dry date branch on the ground; the cracked stream bed.
 - e1 'Say it while you have it.': the arched gate again, open, in clear gentle light, nobody in frame.
CAMERA AND WHY: Opens on the ruin so the viewer asks how; flashback to the gate sets the missed moment; the low orbit
   around the man's back at the end puts the loss at the center of the frame; the last shot returns to the open gate =
   a chance still waiting.
"""

LINES = [
    ("h1", "hook", "Everything he bragged about was gone."),
    ("s1", "setup", "His friend told him what to say on entering his garden:"),
    ("d1", "dlg", "What Allah|Allāh willed has|[has occurred;|occurred]; there is no power except in Allah|Allāh"),
    ("d2", "dlg", "And his fruits were encompassed by|[by ruin,|ruin], so he began to turn his hands about in|[in dismay|dismay] over what he had spent on it, while it had collapsed upon its trellises, and said, Oh, I wish I had not associated with my Lord anyone."),
    ("l1", "lesson", "Say it when you walk in."),
    ("l2", "lesson", "Not when it is gone."),
    ("l3", "lesson", "Nothing you own can defend you."),
    ("e1", "end", "Say it while you have it."),
]
CHECK = {"d1": ('quran', "k18_39a"), "d2": ('quran', "k18_42")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.5, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_05_the-ruin', 'title': "Everything He Bragged About Was Gone", 'follow': ''}
KEYS = {"h1": ["bragged", "gone."],
        "s1": ["garden:"],
        "d1": ["Allāh", "willed", "power"],
        "d2": ["ruin],", "collapsed", "anyone."],
        "l1": ["walk", "in."],
        "l2": ["gone."],
        "l3": ["defend", "you."],
        "e1": ["while", "have", "it."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('The companion says', 'The Quran says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('The companion says', 'The Quran says')}]
