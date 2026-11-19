"""v5 Short (lesson 8 of 15) of the series "15 Lessons from Surah Yusuf": "He Chose Prison. On Purpose" (Quran 12:33-34).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: A narrow Egyptian city lane of mud-brick houses with latticed windows, ending at a squat stone prison with a
   low wooden door and iron-bound bolts; torches in wall brackets.
TIME OF DAY: Late afternoon fading to torchlit dusk.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'He chose prison. On purpose.': frame 1 is the heavy prison door in hard side light, its bolt sliding back.
 - s1 'Pressure keeps coming from every side.': the lane: latticed windows with the dark outlines of women's cloaks
    behind them, whispers shown by flickering lamp light; no faces.
 - s2 'He turns to Allah and says:': the young man's silhouette stops mid-lane, back to us, and lifts his open hands
    slightly.
 - d1 (12:33a): his silhouette walks toward the prison door instead of away from the lane; light from the lane falls
    behind him, torchlight ahead.
 - d2 (12:33b): his open hands again, shot from behind; the lattice shadows crawl across his cloak.
 - d3 (12:34a, 'So his Lord responded'): the lane's shadow lattice falls off him like a net lifting; the torch ahead
    steadies.
 - l1-l3: bolt, open hand, door; then a wide shot of the door closing with a warm light spilling on the threshold.
 - e1 'Ask before you slip.': the open palm lit by a torch, held out.
CAMERA AND WHY: Lateral dolly along the lane (pressure = a repeating-window rhythm); the moment he decides the camera
   swings to follow him toward the prison, which is the surprising turn the title promises; the 'lifting net' of
   shadow on d3 shows the response without any animation of the divine.
"""

LINES = [
    ("h1", "hook", "He chose prison. On purpose."),
    ("s1", "setup", "Pressure keeps coming from every side."),
    ("s2", "setup", "He turns to Allah|Allāh and says:"),
    ("d1", "dlg", "My Lord, prison is more to my liking than that to which they invite me."),
    ("d2", "dlg", "And if You do not avert from me their plan, I might incline toward them and thus|[thus] be of the ignorant."),
    ("d3", "dlg", "So his Lord responded to him and averted from him their plan."),
    ("l1", "lesson", "He admitted he could slip."),
    ("l2", "lesson", "Then he asked for help."),
    ("l3", "lesson", "Be honest with Allah|Allāh about your weak spots."),
    ("e1", "end", "Ask before you slip."),
]
CHECK = {"d1": ('quran', "y12_33a"), "d2": ('quran', "y12_33b"), "d3": ('quran', "y12_34a")}
GAP = {"h1": 0.45, "s1": 0.2, "s2": 0.3, "d1": 0.45, "d2": 0.55, "d3": 0.65, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_08_the-prison-choice', 'title': "He Chose Prison. On Purpose", 'follow': ''}
KEYS = {"h1": ["chose", "prison."],
        "s1": ["Pressure"],
        "s2": ["Allāh"],
        "d1": ["prison", "liking"],
        "d2": ["avert", "incline"],
        "d3": ["Lord", "responded", "averted"],
        "l1": ["slip."],
        "l2": ["asked", "help."],
        "l3": ["honest", "Allāh"],
        "e1": ["Ask", "slip."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Yūsuf prays', 'Yūsuf prays')}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('Yūsuf prays', 'Yūsuf prays')}, {'top': 'd3', 'labels': ('The Quran says',)}]
