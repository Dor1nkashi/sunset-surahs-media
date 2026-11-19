"""v5 Short (lesson 11 of 15) of the series "15 Lessons from Surah Al-Kahf": "Musa Was Shocked. Then He Heard the Other Side" (Quran 18:80-81).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet, no Khidr and no Dhul-Qarnayn is ever shown as a face)
SETTING: A narrow dirt lane between mud-brick houses and old olive trees on a hillside edge of a village. A child's
   small silhouette runs ahead, a wooden toy hoop rolling beside him. The two travellers follow (backs only, one tall
   in a plain cloak with a staff). At the end of the lane: a family house with a wooden door, a lamp in the doorway,
   and two older parents as seated silhouettes from behind. No violence is shown on screen.
TIME OF DAY: Late afternoon golden light fading to dusk with a lamp-lit doorway.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'Musa was shocked. Then he heard the other side.': frame 1 is a tight close-up of a hand gripping a wooden staff
    so hard the knuckles whiten; dust drifts across.
 - s1 'On the road, the servant kills a boy. Musa protests.': wide of the lane: the child's silhouette runs ahead with
    the hoop; the two travellers walk behind him in the lane; the camera cuts away to the olive branches and then to
    the empty lane, the hoop rolling slowly to a stop; the tall traveller's staff hand is clenched.
 - d1 (18:80, the parents were believers; they feared transgression and disbelief): the doorway lamp and two older
    silhouettes seated on the step, backs to camera, a small empty space between them; the lamp flame sways.
 - d2 (18:81, a better one in purity, nearer to mercy): slow push through the doorway into the room; a window opens to
    the first morning light across the floor; the lamp is steady.
 - l1-l3: the clenched hand loosening on the staff; a hand cupped around the lamp flame; the open window with light.
 - e1 'Trust the bigger picture.': the lamp in the window, steady in the dawn light.
CAMERA AND WHY: Close on the clenched hand first (feeling before explanation), then a wide lane for the story fact;
   the cutaway to olives and the rolling hoop keeps everything off-screen with respect; the push through the door into
   morning light is the 'other side' arriving; the shot ends on the steady lamp.
"""

LINES = [
    ("h1", "hook", "Musa|Mūsā was shocked. Then he heard the other side."),
    ("s1", "setup", "On the road, the servant kills a boy. Musa|Mūsā protests."),
    ("d1", "dlg", "And as for the boy, his parents were believers, and we feared that he would overburden them by transgression and disbelief."),
    ("d2", "dlg", "So we intended that their Lord should substitute for them one better than him in purity and nearer to mercy."),
    ("l1", "lesson", "Musa|Mūsā saw only the moment."),
    ("l2", "lesson", "The servant knew more."),
    ("l3", "lesson", "Allah|Allāh knows all of it."),
    ("e1", "end", "Trust the bigger picture."),
]
CHECK = {"d1": ('quran', "k18_80"), "d2": ('quran', "k18_81")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.55, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_k18_11_the-boy', 'title': "Musa Was Shocked. Then He Heard the Other Side", 'follow': ''}
KEYS = {"h1": ["shocked.", "other", "side."],
        "s1": ["kills", "protests."],
        "d1": ["believers,", "feared", "disbelief."],
        "d2": ["better", "purity", "mercy."],
        "l1": ["moment."],
        "l2": ["knew", "more."],
        "l3": ["Allāh", "all"],
        "e1": ["bigger", "picture."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('The servant says', 'The servant says')}
EXCHANGES = [{'top': "d1", 'bottom': "d2", 'labels': ('The servant says', 'The servant says')}]
