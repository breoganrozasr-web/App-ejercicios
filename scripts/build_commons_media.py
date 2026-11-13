#!/usr/bin/env python3
"""
Genera las demostraciones procedentes de Wikimedia Commons y su manifiesto.

Uso (herramienta de desarrollo; el resultado ya está en el repositorio):
    python3 scripts/build_commons_media.py <carpeta con los archivos descargados de Commons>

La carpeta debe contener los originales (nombres de Commons con '_' en vez de espacios) y
`Plank_exercise_render.png` (render del SVG a 900x572 con fondo blanco).
Cada archivo se revisó a mano: licencia en su ficha de Commons y que muestra la variante exacta.
"""
import json
import os
import subprocess
import sys
import tempfile

CHECKED_AT = '2026-11-13'
COMMONS = 'https://commons.wikimedia.org/wiki/File:'

PD_CDC = {
    'author': 'Centers for Disease Control and Prevention (CDC), «Growing Stronger – Strength Training for Older Adults»',
    'license': 'Dominio público',
    'licenseUrl': 'https://commons.wikimedia.org/wiki/Template:PD-USGov-HHS-CDC',
}

ITEMS = [
    # exerciseId, archivo, tipo, licencia/autor, opciones, nota de verificación
    ('sentadilla_peso_corporal', 'Squats.gif', 'gif_negate', {
        'author': 'Wensceslao', 'license': 'CC BY-SA 4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/'},
        {'step': 3, 'ms': 120}, 'Silueta (vídeo trazado) de una sentadilla con peso corporal, brazos al frente. Baja hasta una sentadilla profunda.'),
    ('plancha_frontal', 'Plank_exercise.svg', 'svg_render', {
        'author': 'Pk0001', 'license': 'CC BY-SA 4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/'},
        {}, 'Plancha frontal sobre antebrazos (posición mantenida, una imagen).'),
    ('sentadilla_silla', 'Squat-CDC_strength_training_for_older_adults.gif', 'gif_color', PD_CDC, {},
        'Sentadilla hacia una silla con brazos al frente, sin carga.'),
    ('zancada_apoyo', 'Lunge-CDC_strength_training_for_older_adults.gif', 'gif_color', PD_CDC, {},
        'Zancada al frente con una mano en una barandilla, sin carga; rodilla trasera cerca del suelo.'),
    ('subida_escalon', 'Step_up-CDC_strength_training_for_older_adults.gif', 'gif_color', PD_CDC, {},
        'Subida a un escalón con apoyo en el pasamanos, sin carga.'),
    ('gemelos_peso_corporal', 'Toe_stand-CDC_strength_training_for_older_adults.gif', 'gif_color', PD_CDC, {},
        'Elevación de talones de pie con las manos apoyadas en un mueble (2 fotogramas, movimiento pequeño).'),
    ('flexiones_pared', 'Wallpushup-CDC_strength_training_for_older_adults.gif', 'gif_color', PD_CDC, {},
        'Flexiones con las manos en la pared.'),
]


def run(*a):
    subprocess.run(a, check=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)


def gif_delays(path):
    out = subprocess.run(['identify', '-format', '%T,', path], capture_output=True, text=True).stdout
    return [max(80, int(x) * 10) for x in out.strip(',').split(',') if x]


def main():
    src = sys.argv[1]
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, 'public/media/wc')
    os.makedirs(out_dir, exist_ok=True)
    items = []
    for ex_id, fname, kind, lic, opt, note in ITEMS:
        path = os.path.join(src, fname)
        files, durations = [], None
        with tempfile.TemporaryDirectory() as tmp:
            if kind in ('gif_negate', 'gif_color'):
                run('convert', path, '-coalesce', os.path.join(tmp, 'f_%03d.png'))
                frames = sorted(f for f in os.listdir(tmp) if f.startswith('f_'))
                delays = gif_delays(path)
                if kind == 'gif_negate':
                    step = opt['step']
                    frames = frames[::step]
                    durations = [opt['ms']] * len(frames)
                    # recorte común (unión de cajas) para centrar la figura
                    run('convert', *[os.path.join(tmp, f) for f in frames], '-evaluate-sequence', 'max', '-trim', '-format', '%@', 'info:')
                    bbox = subprocess.run(['convert', *[os.path.join(tmp, f) for f in frames], '-evaluate-sequence', 'max', '-fuzz', '10%', '-format', '%@', 'info:'], capture_output=True, text=True).stdout.strip()
                else:
                    durations = delays[:len(frames)]
                    bbox = None
                for i, f in enumerate(frames, start=1):
                    name = f'{ex_id}-{i}.webp'
                    dst = os.path.join(out_dir, name)
                    args = ['convert', os.path.join(tmp, f)]
                    if kind == 'gif_negate':
                        if bbox:
                            w, rest = bbox.split('x'); h, x, y = rest.replace('+', ' ').split()
                            pad = 24
                            args += ['-crop', f'{int(w)+2*pad}x{int(h)+2*pad}+{max(0,int(x)-pad)}+{max(0,int(y)-pad)}', '+repage']
                        args += ['-colorspace', 'Gray', '-negate', '-resize', 'x420>', '-quality', '82']
                    else:
                        args += ['-background', 'white', '-alpha', 'remove', '-quality', '90']
                    run(*args, dst)
                    files.append(f'media/wc/{name}')
            elif kind == 'svg_render':
                render = os.path.join(src, 'Plank_exercise_render.png')
                name = f'{ex_id}-1.webp'
                run('convert', render, '-trim', '-bordercolor', 'white', '-border', '20', '-resize', '720x>', '-quality', '88', os.path.join(out_dir, name))
                files.append(f'media/wc/{name}')
        total = sum(os.path.getsize(os.path.join(root, 'public', f)) for f in files)
        page = COMMONS + fname
        items.append({
            'id': f'wc-{ex_id}',
            'exerciseId': ex_id,
            'kind': 'frames',
            'provider': 'wikimedia-commons',
            'frames': files,
            'frameDurationsMs': durations,
            'colored': kind != 'gif_negate',
            'sourceUrl': page,
            'sourceFiles': [page],
            'author': lic['author'],
            'license': lic['license'],
            'licenseUrl': lic['licenseUrl'],
            'attribution': f"{'Animación' if kind != 'svg_render' else 'Ilustración'}: {lic['author']}, vía Wikimedia Commons ({fname.replace('_', ' ')}), {lic['license']}.",
            'modifications': 'Fotogramas extraídos y convertidos a WebP' + ('; recortados, en escala de grises e invertidos (líneas oscuras sobre fondo claro); se reproduce 1 de cada 3 fotogramas' if kind == 'gif_negate' else '') + ('; SVG rasterizado' if kind == 'svg_render' else '') + '.',
            'cachePolicy': 'offline_permitido',
            'checkedAt': CHECKED_AT,
            'verification': 'Licencia comprobada en la ficha de Commons (API extmetadata) y revisión visual manual de los fotogramas. ' + note,
            'bytes': total,
        })
    manifest = {'generatedAt': CHECKED_AT, 'source': {'site': 'https://commons.wikimedia.org'}, 'items': items}
    for p in ('src/domain/catalog/media-manifest-commons.json', 'docs/media-manifest-commons.json'):
        with open(os.path.join(root, p), 'w') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=1)
    print(len(items), 'ejercicios,', sum(i['bytes'] for i in items), 'bytes')


if __name__ == '__main__':
    main()
