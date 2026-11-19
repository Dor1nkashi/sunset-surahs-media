"""v5 Short (lesson 7 of 15) of the series "15 Lessons from Surah Yusuf": "A Torn Shirt Proved the Truth" (Quran 12:25, 12:27).
Standalone Short AND a chapter of the long-form video. Hooks stay standalone (no lesson numbers spoken).

VISUAL BRIEF (for the 3D animator; faceless: people only as clothing/build silhouettes or from behind, no prophet is ever shown)
SETTING: The same Egyptian house: the carved outer door, a stone threshold, the husband arriving at the door, the
   courtyard with the pond. Plain linen tunic as the key object.
TIME OF DAY: Morning, bright flat daylight (contrast with last night's lamplight).
WHAT HAPPENS ON SCREEN, LINE BY LINE (lesson lines and the end line sit on calm object shots, never on people):
 - h1 'A torn shirt told the truth.': frame 1 is a linen tunic held up by the shoulders, the tear clearly visible in
    the back panel, backlit so threads glow.
 - s1 'A witness from her family points to the shirt.': a robed figure's back at the threshold gestures at the tunic;
    a couple of other silhouettes stand in the doorway.
 - d1 (12:25): replay as a fast, quiet, wordless scene: two silhouettes racing for the door, a hand grabbing cloth
    from behind, the husband's shape at the door; each beat 0.7 s.
 - d2 (12:27): the tunic is turned slowly in the light: tear in the BACK panel highlighted by a thin gold line tracing
    the rip; a second tunic (for contrast) with front panel intact.
 - l1-l3: macro on threads; the tunic folded; the door standing open in clean morning light.
 - e1 'The truth is in the details.': macro of a torn thread end in the light, perfectly sharp.
CAMERA AND WHY: A rotating object shot of the tunic (because the lesson IS the object); the quick race-to-the-door
   flashback is handheld and brief so it does not linger on the incident; then a locked-off, clean daylight frame to
   say 'the truth is calm, not noisy'; macro finish.
"""

LINES = [
    ("h1", "hook", "A torn shirt told the truth."),
    ("s1", "setup", "A witness from her family points to the shirt."),
    ("d1", "dlg", "And they both raced to the door, and she tore his shirt from the back, and they found her husband at the door."),
    ("d2", "dlg", "But if his shirt is torn from the back, then she has lied, and he is of the truthful."),
    ("l1", "lesson", "Truth leaves evidence."),
    ("l2", "lesson", "The shirt spoke for him."),
    ("l3", "lesson", "Stay honest, and the details will back you."),
    ("e1", "end", "The truth is in the details."),
]
CHECK = {"d1": ('quran', "y12_25a"), "d2": ('quran', "y12_27")}
GAP = {"h1": 0.45, "s1": 0.3, "d1": 0.6, "d2": 0.7, "l1": 0.3, "l2": 0.3, "l3": 0.5, "e1": 1.3}
META = {'name': 'v5_y12_07_the-torn-shirt', 'title': "A Torn Shirt Proved the Truth", 'follow': ''}
KEYS = {"h1": ["torn", "shirt", "truth."],
        "s1": ["witness", "shirt."],
        "d1": ["raced", "tore", "shirt", "back,"],
        "d2": ["shirt", "torn", "back,", "truthful."],
        "l1": ["Truth", "evidence."],
        "l2": ["shirt", "spoke"],
        "l3": ["honest,", "details"],
        "e1": ["truth", "details."]}
# (SETUP/DLG/EXCHANGES are not used by the v5 caption page)
SETUP = {'label': 'Quran'}
DLG = {'labels': ('The Quran says', 'Her witness said')}
EXCHANGES = [{'top': 'd1', 'bottom': 'd2', 'labels': ('The Quran says', 'Her witness said')}]
