#!/usr/bin/env python3
"""Regenerate languages/raouf-academy.pot from every theme PHP file."""
import glob, hashlib, os, re

ROOT = '/home/user/raouf/wordpress-conversion/theme/raouf-academy'
OUT = os.path.join(ROOT, 'languages', 'raouf-academy.pot')
DOMAIN = 'raouf-academy'

# __(), _e(), esc_html__(), esc_attr__(), _x() -- single or double quoted first arg.
PATTERN = re.compile(
    r"(?:__|_e|esc_html__|esc_attr__|_x)\(\s*(?:'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\")\s*,\s*'" + DOMAIN + r"'",
    re.S,
)

strings = {}
for f in sorted(glob.glob(ROOT + '/**/*.php', recursive=True)):
    s = open(f, encoding='utf8').read()
    for m in PATTERN.finditer(s):
        raw = m.group(1) if m.group(1) is not None else m.group(2)
        text = raw.replace("\\'", "'").replace('\\"', '"').replace('\\\\', '\\')
        line = s[:m.start()].count('\n') + 1
        strings.setdefault(text, []).append(f'{os.path.relpath(f, ROOT)}:{line}')

header = [
    'msgid ""',
    'msgstr ""',
    '"Project-Id-Version: Raouf Academy 1.0.0\\n"',
    '"Report-Msgid-Bugs-To: \\n"',
    '"POT-Creation-Date: 2026-11-08 00:00+0000\\n"',
    '"MIME-Version: 1.0\\n"',
    '"Content-Type: text/plain; charset=UTF-8\\n"',
    '"Content-Transfer-Encoding: 8bit\\n"',
    '"Language: fa_IR\\n"',
    '"X-Domain: ' + DOMAIN + '\\n"',
    '',
]
body = []
for text in sorted(strings):
    for ref in sorted(set(strings[text])):
        body.append('#: ' + ref)
    body.append('msgid "' + text.replace('\\', '\\\\').replace('"', '\\"') + '"')
    body.append('msgstr ""')
    body.append('')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf8').write('\n'.join(header + body))
print('POT:', len(strings), 'unique strings,', len(glob.glob(ROOT + '/**/*.php', recursive=True)), 'PHP files')
