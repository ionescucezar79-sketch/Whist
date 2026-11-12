"""Construieste prototip/dist/index.html: un singur fisier cu motorul, stilul si interfata."""
import pathlib, subprocess, sys

aici = pathlib.Path(__file__).parent
radacina = aici.parent
motor = subprocess.run(
    ['npx', 'esbuild', 'src/engine/index.ts', '--bundle', '--format=iife', '--global-name=Whist', '--target=es2019', '--minify'],
    cwd=radacina, check=True, capture_output=True, text=True).stdout
html = f"""<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#1c1511">
<title>Whist românesc – prototip</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500;700&family=Alegreya+Sans:wght@400;500;700&display=swap">
<style>{(aici / 'stil.css').read_text(encoding='utf-8')}</style>
</head>
<body>
<div id="app"></div>
<script>{motor}</script>
<script>{(aici / 'ui.js').read_text(encoding='utf-8')}</script>
</body>
</html>
"""
(aici / 'dist').mkdir(exist_ok=True)
(aici / 'dist' / 'index.html').write_text(html, encoding='utf-8')
print('dist/index.html', len(html), 'bytes')
