"""v5 Short (intro) of the series "15 Lessons from Surah Yusuf": "The Best of Stories in Fifteen Lessons" (Quran 12:3).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: Canaan hill country at the end of night: terraced limestone slopes, a few olive trees, one small stone-and-
   mud house with a flat roof in the middle distance, a round stone-rimmed well off to one side. No people in frame.
TIME OF DAY: Deep blue pre-dawn, a thin band of first light on the eastern ridge, stars still bright.
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'The best of stories, in fifteen lessons.': frame 1 is already the full scene, stars shimmering and eleven stars
    slightly brighter than the rest, drifting very slowly; a breeze moves the olive leaves and a thin ground mist
    crawls over the terraces.
 - s1 'In Surah Yusuf, Allah says:': the sky holds still; the sun is a faint glow under the ridge and the moon sits
    low opposite it. The eleven bright stars arrange into a loose arc above the roof.
 - d1 (12:3 card): camera glides down from the stars to the flat roof and the well, light rising, so the 'best of
    stories' card lands on a calm settled picture.
 - l1 'A dream, a well, a prison, a palace.': four quick match-cut glimpses, each 0.8 s, of OBJECTS only: dream stars,
    the stone well rim with rope, a barred prison window with torchlight, a palace column and Nile light. Each cut
    keeps the same warm gold highlight so they read as one story.
 - l2 'Fifteen lessons, in order.': the shots stack as fifteen small lights in a row on the horizon.
 - e1 'Start with the dream.': pull back to the first frame composition so the stars of frame 1 return (loop into the
    first lesson, which opens on the same sky).
CAMERA AND WHY: Slow vertical crane from sky to roof (about 6 s total), then a quick match-cut montage, then a pull-
   back to frame 1. The crane move says 'we are entering a story from above'; the montage previews the series as
   objects, never faces; the return to frame 1 loops the Short.
"""

LINES = [
    ("h1", "hook", "The best of stories, in fifteen lessons."),
    ("s1", "setup", "In Surah|Sūrah Yusuf,|Yūsuf, Allah|Allāh says:"),
    ("d1", "dlg", "We relate to you, O|[O Muhammad,|Muhammad], the best of stories"),
    ("l1", "lesson", "A dream, a well, a prison, a palace."),
    ("l2", "lesson", "Fifteen lessons, in order."),
    ("e1", "end", "Start with the dream."),
]
CHECK = {"d1": ('quran', "y12_3a")}
GAP = {"h1": 0.45, "s1": 0.25, "d1": 0.7, "l1": 0.3, "l2": 0.5, "e1": 1.2}
META = {'name': 'v5_y12_00_intro', 'title': "The Best of Stories in Fifteen Lessons", 'follow': ''}
KEYS = {"h1": ["best", "stories,", "fifteen"],
        "s1": ["Yūsuf,"],
        "d1": ["best", "stories"],
        "l1": ["dream,", "prison,"],
        "l2": ["Fifteen", "order."],
        "e1": ["dream."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('Allāh says',)}
EXCHANGES = [{'top': 'd1', 'labels': ('Allāh says',)}]
