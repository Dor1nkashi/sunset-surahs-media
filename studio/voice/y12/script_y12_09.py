"""v5 Short (lesson 9 of 15) of the series "15 Lessons from Surah Yusuf": "He Asked for One Favor. The Man Forgot" (Quran 12:42).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: Inside the Egyptian prison: a stone courtyard with a high barred window, a narrow strip of sky, a heavy gate;
   sleeping mats, a water jar.
TIME OF DAY: Morning at the gate, then a time-lapse through seasons.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'He asked for one favor. The man forgot.': frame 1 is the open prison gate with bright daylight beyond it; the
    silhouette of a man walking out, his back to camera.
 - s1 'In prison, he tells a man who will go free:': courtyard, the young man's silhouette seated by the wall, the
    other silhouette standing by the gate.
 - s2 'He had helped the man by explaining his dream.': a quick object beat: a wine cup shape in the light of the
    barred window (the freed man's dream was about pressing wine), nothing more.
 - d1 (12:42q 'Mention me before your master.'): the seated silhouette's hand rises; the freed man's back keeps
    walking toward the daylight.
 - d2 (12:42b): the gate closes; then a time-lapse: the shadow of the window bars sweeps across the wall, seasons
    shown by changing light (spring green leaves on a wall creeper, then summer glare, then winter grey, then dust),
    the water jar level dropping and being refilled, the mats worn.
 - l1-l3: the shadow-sweep slows and stops on a steady golden shaft of light on the wall.
 - e1 'Do your part, then wait on Allah.': the golden shaft, a hand placed in it.
CAMERA AND WHY: Locked camera inside the cell for the time-lapse (a fixed frame is how you perceive 'years pass');
   only the light and the objects change. The gate shot first and last gives the loop a visual rhyme: someone leaves;
   the speaker stays; the shaft of light means 'not forgotten'.
"""

LINES = [
    ("h1", "hook", "He asked for one favor. The man forgot."),
    ("s1", "setup", "In prison, he tells a man who will go free:"),
    ("s2", "setup", "He had helped the man by explaining his dream."),
    ("d1", "dlg", "Mention me before your master."),
    ("d2", "dlg", "But Satan made him forget the mention to|[to] his master, and Joseph remained in prison several years."),
    ("l1", "lesson", "People can forget you."),
    ("l2", "lesson", "Allah|Allāh does not."),
    ("l3", "lesson", "Waiting is not the same as being forgotten."),
    ("e1", "end", "Do your part, then wait on Allah.|Allāh."),
]
CHECK = {"d1": ('quran', "y12_42q"), "d2": ('quran', "y12_42b")}
GAP = {"h1": 0.45, "s1": 0.25, "s2": 0.3, "d1": 0.55, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_09_the-forgotten-favor', 'title': "He Asked for One Favor. The Man Forgot", 'follow': ''}
KEYS = {"h1": ["favor.", "forgot."],
        "s1": ["free:"],
        "s2": ["dream."],
        "d1": ["Mention", "master."],
        "d2": ["Satan", "forget", "several", "years."],
        "l1": ["forget"],
        "l2": ["Allāh", "not."],
        "l3": ["Waiting", "forgotten."],
        "e1": ["wait", "Allāh."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Yūsuf says', 'The Quran says')}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('Yūsuf says', 'The Quran says')}]
