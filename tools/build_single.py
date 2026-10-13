#!/usr/bin/env python3
"""Regroupe le jeu (index.html + style.css + tous les scripts) en une seule page HTML.

Usage : python3 tools/build_single.py <sortie.html> [--fragment]
  --fragment : sans <!doctype>/<html>/<head>/<body> (page publiée comme Artifact,
               le squelette est ajouté à la publication).
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    out = Path(sys.argv[1])
    fragment = '--fragment' in sys.argv
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'style.css').read_text(encoding='utf-8')

    scripts = re.findall(r'<script src="([^"]+)"></script>', html)
    js = []
    for src in scripts:
        code = (ROOT / src).read_text(encoding='utf-8')
        if '</script' in code:
            raise SystemExit(f'{src} contient "</script" : impossible de l\'intégrer tel quel')
        js.append(f'// ---- {src}\n{code}')

    title = re.search(r'<title>(.*?)</title>', html).group(1)
    body = re.search(r'<body>(.*?)<!-- moteur -->', html, re.S).group(1).strip()
    style = (
        ':root { color-scheme: dark; --bg: #05030c; }\n'
        'html, body { height: 100%; }\n'
        'body { background: var(--bg); }\n' + css
    )
    parts = [
        f'<title>{title}</title>',
        f'<style>\n{style}</style>',
        body,
        '<script>\n' + '\n'.join(js) + '\n</script>',
    ]
    page = '\n'.join(parts)
    if not fragment:
        head = re.search(r'<head>(.*?)<title>', html, re.S).group(1)
        page = f'<!doctype html>\n<html lang="fr">\n<head>{head}' + page.replace('</style>\n', '</style>\n</head>\n<body>\n', 1) + '\n</body>\n</html>\n'
    out.write_text(page, encoding='utf-8')
    print(f'{out} : {len(page) / 1024:.0f} Ko, {len(scripts)} scripts')


if __name__ == '__main__':
    main()
