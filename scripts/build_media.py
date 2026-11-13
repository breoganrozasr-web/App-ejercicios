#!/usr/bin/env python3
"""
Genera las demostraciones (fotogramas WebP) y el manifiesto de medios a partir del repositorio
Everkinetic (https://github.com/everkinetic/data, CC BY-SA 4.0).

Uso (herramienta de desarrollo; el resultado ya está en el repositorio):
    git clone --depth 1 https://github.com/everkinetic/data /ruta/everkinetic
    python3 scripts/build_media.py /ruta/everkinetic

Requiere ImageMagick (`convert`) con soporte WebP.
Cada par de imágenes se revisó a mano para confirmar que muestra la variante exacta (ver docs/CONTENIDOS_Y_LICENCIAS.md).
"""
import json
import os
import subprocess
import sys

CHECKED_AT = '2026-11-13'
REPO_URL = 'https://github.com/everkinetic/data'
LICENSE = 'CC BY-SA 4.0'
LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/'
AUTHOR = 'Everkinetic (Greg Priday)'

# id del ejercicio en la app -> (nombre en Everkinetic, nota de verificación)
MAP = {
    'press_banca_barra': ('bench-press', ''),
    'press_banca_mancuernas': ('bench-press-dumbbell', ''),
    'press_inclinado_barra': ('incline-bench-press', ''),
    'press_inclinado_mancuernas': ('incline-dumbbell-press', ''),
    'press_pecho_maquina': ('machine-bench-press', 'Máquina de press sentado.'),
    'press_banca_multipower': ('smith-machine-bench-press', ''),
    'flexiones': ('push-ups', ''),
    'flexiones_pies_elevados': ('push-up-feet-elevated', ''),
    'fondos_asistidos': ('chest-dips', 'La ilustración muestra la máquina de fondos asistidos (rodillas apoyadas); el ejercicio se ha definido como esa variante.'),
    'aperturas_mancuernas': ('dumbbell-flys', ''),
    'cruce_poleas': ('cable-crossover', ''),
    'contractor_pecho': ('butterfly-machine', ''),
    'aperturas_banda': ('crossover-bands', ''),
    'dominadas': ('pull-ups', ''),
    'dominadas_supinas': ('chin-ups', ''),
    'jalon_pecho': ('wide-grip-lat-pull-down', 'Comprobado ampliando el fotograma: la barra baja por delante de la cara (no tras la nuca).'),
    'jalon_supino': ('underhand-pull-downs', ''),
    'jalon_estrecho': ('v-bar-pull-down', ''),
    'remo_polea_baja': ('seated-cable-rows', ''),
    'remo_barra_supino': ('reverse-grips-bent-over-barbell-rows', ''),
    'remo_mancuerna': ('rear-deltoid-row-dumbbell', 'El original se titula “rear deltoid row”, pero el dibujo muestra el remo a una mano apoyado en banco con el codo pegado; se usa para esa variante.'),
    'remo_invertido': ('body-row', ''),
    'pullover_polea': ('straight-arm-push-down', ''),
    'pullover_mancuerna': ('dumbbell-bent-arm-pullover', ''),
    'hiperextensiones': ('hyperextensions', ''),
    'superman': ('supermans', ''),
    'press_militar_barra_sentado': ('seated-military-press', ''),
    'press_hombro_mancuernas': ('dumbbell-shoulder-press', ''),
    'press_hombro_maquina': ('seated-shoulder-press-machine', ''),
    'press_arnold': ('arnold-press', ''),
    'press_hombro_unilateral': ('one-arm-dumbbell-shoulder-press', ''),
    'elevaciones_laterales': ('lateral-dumbbell-raises', ''),
    'pajaros_tumbado': ('lying-rear-lateral-raise', ''),
    'aperturas_posteriores_banda': ('back-flys-exercise-band', ''),
    'encogimientos_mancuernas': ('shoulder-shrugs', ''),
    'curl_barra': ('biceps-curls-with-barbell', ''),
    'curl_barra_z': ('ez-bar-curl-with-barbell', ''),
    'curl_mancuernas': ('biceps-curl-with-dumbbell', ''),
    'curl_martillo': ('biceps-hammer-curl-with-dumbbell', ''),
    'curl_inclinado': ('alternating-incline-curl-with-dumbbell', ''),
    'curl_polea': ('standing-biceps-curl-with-cable', ''),
    'curl_banda': ('quick-alternating-biceps-curls-with-band', ''),
    'curl_concentrado': ('concentration-curls-with-dumbbell', ''),
    'extension_triceps_polea': ('triceps-pushdown-with-cable', ''),
    'extension_triceps_cuerda': ('triceps-pushdown-with-rope-and-cable', ''),
    'press_frances': ('lying-triceps-press-with-barbell', ''),
    'extension_triceps_sobre_cabeza': ('seated-triceps-press-with-dumbbell', ''),
    'patada_triceps': ('triceps-kickback-with-dumbbell', ''),
    'fondos_entre_bancos': ('bench-dips', 'Pies elevados en un segundo banco.'),
    'flexiones_cerradas': ('close-triceps-pushup', ''),
    'press_banca_cerrado': ('close-grip-barbell-bench-press', ''),
    'sentadilla_barra': ('barbell-squat', ''),
    'sentadilla_frontal': ('front-squat-with-barbell', ''),
    'sentadilla_mancuernas': ('squats-using-dumbbells', ''),
    'sentadilla_banco_mancuernas': ('squat-to-bench-with-dumbbells', ''),
    'sentadilla_banco_barra': ('squat-to-bench-with-barbell', ''),
    'sentadilla_multipower': ('smith-machine-squats', ''),
    'sentadilla_sumo_mancuerna': ('pile-squat-with-dumbbell', ''),
    'sentadilla_banda': ('squats-with-exercise-bands', 'El fotograma de la posición baja está recortado a la altura de las rodillas en el original.'),
    'prensa': ('leg-press', ''),
    'extension_cuadriceps': ('leg-extensions', ''),
    'curl_femoral_tumbado': ('lying-leg-curl-machine', ''),
    'curl_femoral_sentado': ('seated-leg-curl', ''),
    'peso_muerto_rumano': ('romanian-dead-lift', ''),
    'peso_muerto_rumano_mancuernas': ('dumbbell-dead-lifts', 'El original se titula “dumbbell dead lifts”; el dibujo muestra rodillas casi extendidas y bisagra de cadera (peso muerto rumano).'),
    'zancadas_mancuernas': ('dumbbell-lunges', ''),
    'zancadas_barra': ('barbell-lunges', ''),
    'zancadas_caminando': ('walking-lunges', '4 fotogramas.'),
    'subidas_banco': ('step-ups-with-dumbbells', '3 fotogramas.'),
    'puente_gluteo': ('bridging', ''),
    'patada_gluteo_polea': ('one-legged-cable-kickback', ''),
    'abductores_maquina': ('thigh-abductor', ''),
    'aductores_maquina': ('thigh-adductor', ''),
    'gemelos_maquina_pie': ('standing-calf-raises-using-machine', 'Movimiento pequeño: los fotogramas difieren poco.'),
    'gemelos_sentado_maquina': ('seated-calf-raise-using-machine', 'Movimiento pequeño: los fotogramas difieren poco.'),
    'gemelos_prensa': ('calves-press-on-leg-machine', 'Movimiento pequeño: los fotogramas difieren poco.'),
    'gemelos_banda': ('calf-raises-with-band', ''),
    'plancha_lateral': ('side-plank', 'Isométrico: dos fotogramas casi iguales.'),
    'encogimientos_abdominales': ('crunches', ''),
    'elevacion_cadera_rodillas': ('bent-knee-hip-raise', ''),
    'elevaciones_piernas': ('flat-bench-leg-raises', ''),
    'crunch_polea': ('seated-ab-crunch-with-cable', ''),
    'rueda_abdominal_barra': ('ab-rollout-on-knees-with-barbell', ''),
    'bicicleta_abdominal': ('air-bike', ''),
}

EXCLUDED = {
    't-bar-rows': 'El dibujo no corresponde al ejercicio (muestra un encogimiento sobre fitball).',
    'hack-squat-machine': 'Los dos fotogramas son prácticamente idénticos: no demuestra el movimiento.',
    'barbell-dead-lifts': 'La posición baja muestra la espalda redondeada: no se usa como referencia técnica.',
    'one-leg-squat-with-barbell': 'No se puede confirmar la variante (apoyo trasero no visible).',
    'single-leg-squat-with-barbell': 'Variante poco clara.',
    'rear-lunges-with-dumbbell': 'Idéntico a la zancada al frente: no se distingue la dirección.',
    'standing-triceps-extension': 'Muestra un cable/banda aunque los datos dicen mancuerna.',
    'tricep-dips-using-body-weight': 'Muestra la máquina asistida aunque el título dice peso corporal.',
    'upright-band-rows': 'Es un remo al mentón, no un remo de espalda.',
}


def frames_for(ek_dir, slug, by_name):
    web = [os.path.join(ek_dir, 'src/images-web', f'{slug}-{i}.png') for i in range(1, 5)]
    web = [w for w in web if os.path.exists(w)]
    if len(web) >= 2:
        return web, [f'src/images-web/{os.path.basename(w)}' for w in web]
    e = by_name.get(slug)
    if e:
        r = os.path.join(ek_dir, 'dist/png', f"{e['id']}-relaxation.png")
        t = os.path.join(ek_dir, 'dist/png', f"{e['id']}-tension.png")
        if os.path.exists(r) and os.path.exists(t):
            return [r, t], [f"dist/png/{e['id']}-relaxation.png", f"dist/png/{e['id']}-tension.png"]
    raise SystemExit(f'Sin imágenes para {slug}')


def main():
    ek_dir = sys.argv[1]
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, 'public/media/ek')
    os.makedirs(out_dir, exist_ok=True)
    commit = subprocess.run(['git', '-C', ek_dir, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip() or 'desconocido'
    by_name = {e['name']: e for e in json.load(open(os.path.join(ek_dir, 'dist/exercises.json')))}
    items = []
    for ex_id, (slug, note) in MAP.items():
        srcs, rel = frames_for(ek_dir, slug, by_name)
        files = []
        total = 0
        for i, src in enumerate(srcs, start=1):
            name = f'{ex_id}-{i}.webp'
            dst = os.path.join(out_dir, name)
            subprocess.run(['convert', src, '-background', 'white', '-alpha', 'remove', '-colorspace', 'Gray', '-resize', 'x480>', '-quality', '80', dst], check=True, stderr=subprocess.DEVNULL)
            total += os.path.getsize(dst)
            files.append(f'media/ek/{name}')
        items.append({
            'id': f'ek-{ex_id}',
            'exerciseId': ex_id,
            'kind': 'frames',
            'provider': 'everkinetic',
            'frames': files,
            'sourceUrl': f'{REPO_URL}/tree/{commit}',
            'sourceFiles': [f'{REPO_URL}/blob/{commit}/{r}' for r in rel],
            'author': AUTHOR,
            'license': LICENSE,
            'licenseUrl': LICENSE_URL,
            'attribution': f'Ilustración: {AUTHOR}, everkinetic/data, {LICENSE}. Adaptada (escala de grises, WebP, animación alternando fotogramas).',
            'modifications': 'Reescalada a 480 px de alto, convertida a escala de grises y WebP; se anima alternando los fotogramas; en tema oscuro se invierten los colores.',
            'cachePolicy': 'offline_permitido',
            'checkedAt': CHECKED_AT,
            'verification': 'Revisión visual manual de los fotogramas: corresponden a la variante del ejercicio.' + (f' Nota: {note}' if note else ''),
            'bytes': total,
        })
    manifest = {
        'generatedAt': CHECKED_AT,
        'source': {'repo': REPO_URL, 'commit': commit, 'license': LICENSE, 'licenseUrl': LICENSE_URL, 'author': AUTHOR},
        'excluded': EXCLUDED,
        'items': items,
    }
    with open(os.path.join(root, 'src/domain/catalog/media-manifest.json'), 'w') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    with open(os.path.join(root, 'docs/media-manifest.json'), 'w') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print(len(items), 'ejercicios,', sum(i['bytes'] for i in items), 'bytes')


if __name__ == '__main__':
    main()
