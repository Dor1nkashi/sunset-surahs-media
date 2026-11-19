"""v5 Short (lesson 14 of 15) of the series "15 Lessons from Surah Al-Kahf": "He Built a Wall of Iron, Then Gave the Credit Away" (Quran 18:95, 18:98).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: A narrow windy pass between two steep, bare rock walls, a straight gap about forty paces wide. Piled on the
   ground: heavy flat sheets of dark iron, stacks of charcoal, big leather bellows with clay nozzles, a clay crucible
   on a fire pit full of glowing orange metal. Workers in plain sleeveless tunics and wraps (silhouettes, backs and
   arms only) haul sheets and work the bellows. A group of villagers in simple clothes stands to one side. The ruler
   is seen only from behind in a long cloak.
TIME OF DAY: Late afternoon with heat haze, building to a golden hour as the barrier is finished.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'He built an iron wall, then gave the credit away.': frame 1 is a thin stream of glowing molten copper pouring
    onto dark iron, hissing, sparks bouncing, steam curling.
 - s1 'A people ask Dhul-Qarnayn for a barrier against Gog and Magog.': a line of villager silhouettes at the mouth of
    the pass, a few pointing at the gap between the two rock walls; a hand pushes a small bag of coins forward.
 - d1 (18:95, 'that in which my Lord has established me is better; assist me with strength'): the ruler's back; his
    hand gently pushes the coin bag back; villagers step up and take hold of iron sheets with him; bellows pump, the
    fire pit glows; sheets are stacked edge to edge from rock wall to rock wall, layer after layer upward.
 - d2 (18:98, 'This is a mercy from my Lord'): low camera looking up the finished wall, copper glaze running down its
    seams, the sky between the mountains above; the ruler's hand rests flat on the cooled metal.
 - l1-l3: the coin bag pushed away (macro on the hand); a pair of hands working a bellows; the glowing copper seam
    cooling.
 - e1 'Give the credit away.': the cooled copper seam in warm light.
CAMERA AND WHY: A glowing, loud macro to hook (fire, sparks); a calm wide for the request; a low upward camera for the
   finished wall to make it huge, then the flat hand on the metal for a humble finish; the credit-giving line sits on
   a quiet, cooled seam.
"""

LINES = [
    ("h1", "hook", "He built an iron wall, then gave the credit away."),
    ("s1", "setup", "A people ask Dhul-Qarnayn for a barrier against Gog and Magog."),
    ("d1", "dlg", "That in which my Lord has established me is better than|[than what you offer,|offer], but assist me with strength; I will make between you and them a dam."),
    ("d2", "dlg", "This is a mercy from my Lord; but when the promise of my Lord comes, He will make it level, and ever is the promise of my Lord true."),
    ("l1", "lesson", "He turned down payment."),
    ("l2", "lesson", "He asked for effort."),
    ("l3", "lesson", "He called it a mercy."),
    ("e1", "end", "Give the credit away."),
]
CHECK = {"d1": ('quran', "k18_95a"), "d2": ('quran', "k18_98a")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.55, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_14_the-barrier', 'title': "He Built a Wall of Iron, Then Gave the Credit Away", 'follow': ''}
KEYS = {"h1": ["iron", "credit", "away."],
        "s1": ["barrier", "Gog", "Magog."],
        "d1": ["better", "assist", "strength;"],
        "d2": ["mercy", "promise", "true."],
        "l1": ["payment."],
        "l2": ["effort."],
        "l3": ["mercy."],
        "e1": ["credit", "away."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Dhul-Qarnayn says', 'Dhul-Qarnayn says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('Dhul-Qarnayn says', 'Dhul-Qarnayn says')}]
