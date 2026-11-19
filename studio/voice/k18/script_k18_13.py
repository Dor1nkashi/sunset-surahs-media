"""v5 Short (lesson 13 of 15) of the series "15 Lessons from Surah Al-Kahf": "He Was Given a Way to Everything. See What He Chose" (Quran 18:84, 18:88).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: Three places in one journey: (1) a far western shore where the sun sinks into a dark, muddy lagoon, with
   reeds and mist; (2) an open eastern plain of bare, shadeless dry earth under a rising sun, a few cloth shelters;
   (3) a dusty meeting ground with a crowd of villagers (silhouettes) around a standing ruler seen only from behind in
   a long cloak and a simple head cloth, no crown shown, hand raised. A caravan column of small figures crosses a
   ridge far away.
TIME OF DAY: Sunset at the west shore, sunrise on the east plain, and an overcast, calm afternoon for the meeting.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'He was given a way to everything. See what he chose.': frame 1 is the sun's red disc touching the surface of a
    dark muddy lagoon, reeds in silhouette, mist rising.
 - s1 'Dhul-Qarnayn travels to where the sun sets, then to where it rises.': the west shore sun sinks; a hard cut to
    the east plain: the sun rises over bare dry earth with people under thin cloth shelters; the caravan column
    crosses a ridge in between.
 - d1 (18:84, established him on the earth, gave him a way to everything): slow aerial over the roads and shores of
    his journey: the lagoon, the plain, the ridge; thin golden lines of light trace the route.
 - d2 (18:88, ease for those who believe and do good): cut to the meeting ground: a crowd of villager silhouettes
    faces a standing ruler seen only from behind; low camera behind the ruler: his raised hand lowers and opens;
    villagers step forward and hands offer bread and water bowls toward each other in a relaxed circle; the mood
    relaxes.
 - l1-l3: the ruler's back, tall against the sky; a closed fist; an open hand with bread.
 - e1 'Power is a choice.': a pair of hands side by side, one fist and one open palm, the open one catching the light.
CAMERA AND WHY: Hook on the setting sun at the lagoon (a vivid visual question), a fast cut to the opposite horizon to
   show 'west and east' in two seconds, then a calm aerial that draws the route; the low camera behind the ruler keeps
   him faceless and makes the viewer stand with the villagers; the fist-or-open-hand image at the end carries 'power
   is a choice'.
"""

LINES = [
    ("h1", "hook", "He was given a way to everything. See what he chose."),
    ("s1", "setup", "Dhul-Qarnayn travels to where the sun sets, then to where it rises."),
    ("d1", "dlg", "Indeed We established him upon the earth, and We gave him to everything a way."),
    ("d2", "dlg", "But as for one who believes and does righteousness, he will have a reward of Paradise, and we will speak to him from our command with ease."),
    ("l1", "lesson", "He had power over people."),
    ("l2", "lesson", "He promised justice for wrongdoing."),
    ("l3", "lesson", "And ease for those who do good."),
    ("e1", "end", "Power is a choice."),
]
CHECK = {"d1": ('quran', "k18_84"), "d2": ('quran', "k18_88")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.55, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_13_the-journeys', 'title': "He Was Given a Way to Everything. See What He Chose", 'follow': ''}
KEYS = {"h1": ["way", "everything.", "chose."],
        "s1": ["Dhul-Qarnayn", "sets,", "rises."],
        "d1": ["established", "way."],
        "d2": ["believes", "righteousness,", "ease."],
        "l1": ["power"],
        "l2": ["justice", "wrongdoing."],
        "l3": ["ease", "good."],
        "e1": ["Power", "choice."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Allāh says', 'Dhul-Qarnayn says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('Allāh says', 'Dhul-Qarnayn says')}]
