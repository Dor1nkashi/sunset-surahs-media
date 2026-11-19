"""v5 Short (lesson 4 of 15) of the series "15 Lessons from Surah Yusuf": "His Son Was Gone. Watch How the Father Answered" (Quran 12:16, 12:18).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: The family house at night from the front courtyard: an oil lamp on a ledge, a low wall, a heavy wooden door
   ajar; the dark hills behind.
TIME OF DAY: Night, only lamplight and a thin moon.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'His son was gone. Watch how the father answered.': frame 1 is the lamp-lit doorway, empty, the door swaying
    slightly; the courtyard is silent.
 - s1 (12:16 'came to their father at night, weeping'): the brothers' silhouettes arrive at the courtyard gate
    (backs to camera), shoulders shaking; they cluster at the door.
 - d1 (12:18a): in the lamp's pool of light, a plain tunic is held up and laid across a hand; the cloth is stained
    dark red (an object shot, no face, no violence).
 - d2 (12:18): camera pushes slowly from the brothers to the seated father at the door seen from behind, head bowed;
    his hand opens slowly on his knee.
 - l1-l3: the same lamp, steady; the stained shirt lying on the step; the father's open hand lifting toward the night
    sky.
 - e1 'Patience still feels the pain.': the lamp flame wavers once in a draught but does not go out.
CAMERA AND WHY: Static open on the doorway (loneliness); a handheld-feel shake while the brothers arrive; an object
   close-up of the shirt as the evidence beat; then one slow push-in on the father's back and open hand, because the
   lesson is in his stillness, not in a face; end on the wavering-but-lit flame.
"""

LINES = [
    ("h1", "hook", "His son was gone. Watch how the father answered."),
    ("s1", "setup", "And they came to their father at night, weeping."),
    ("d1", "dlg", "And they brought upon his shirt false blood."),
    ("d2", "dlg", "Rather, your souls have enticed you to something, so patience is most fitting. And Allah|Allāh is the one sought for help against that which you describe."),
    ("l1", "lesson", "He named the lie, calmly."),
    ("l2", "lesson", "Patience is not pretending."),
    ("l3", "lesson", "He took his pain to Allah|Allāh."),
    ("e1", "end", "Patience still feels the pain."),
]
CHECK = {"s1": ('quran', "y12_16"), "d1": ('quran', "y12_18a"), "d2": ('quran', "y12_18")}
GAP = {"h1": 0.45, "s1": 0.5, "d1": 0.45, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_04_beautiful-patience', 'title': "His Son Was Gone. Watch How the Father Answered", 'follow': ''}
KEYS = {"h1": ["son", "gone.", "father"],
        "s1": ["night,", "weeping."],
        "d1": ["shirt", "false", "blood."],
        "d2": ["patience", "fitting.", "Allāh"],
        "l1": ["lie,", "calmly."],
        "l2": ["Patience", "pretending."],
        "l3": ["pain", "Allāh."],
        "e1": ["Patience", "pain."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'card': "s1", 'label': 'Quran'}
DLG = {'labels': ('The brothers', 'Yaʿqūb replies')}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('The brothers', 'Yaʿqūb replies')}]
