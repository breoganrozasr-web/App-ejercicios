"""Uso: python3 scripts/recipes_from_annex.py <prompt3.txt> src/domain/engine/recipes-data.ts
Lee el anexo A del encargo del 15/11/2026, comprueba los totales por sesión y genera los datos de las 26 recetas."""
import re, json, sys
src = open(sys.argv[1], encoding='utf-8').read()
a = src.index('ANEXO A. LAS 26 PLANTILLAS'); b = src.index('ANEXO B. MAPA EDITORIAL')
txt = src[a:b]
blocks = re.split(r'\n(?=A\d\d\. )', txt)[1:]
WD = {'L':0,'M':1,'X':2,'J':3,'V':4,'S':5,'D':6}
out = []
for blk in blocks:
    lines = [l.rstrip() for l in blk.strip().split('\n') if l.strip()]
    m = re.match(r'(A\d\d)\. (.+)$', lines[0]); code, title = m.group(1), m.group(2)
    ctx = re.match(r'Nivel/contexto: (.+?)\. Objetivo: (.+?)\. Material: (.+?)\.$', lines[1])
    rec = {'code': code, 'title': title, 'context': ctx.group(1), 'goalText': ctx.group(2), 'material': ctx.group(3), 'notes': [], 'sessions': []}
    for l in lines[2:]:
        dm = re.match(r'([LMXJVSD]) — (.+):$', l)
        im = re.match(r'\s*• (.+?) \[(?:NUEVO:)?([a-z_]+)\]: (\d+) × (\d+)–(\d+) (rep|s)( por lado)?\.$', l)
        if dm:
            rec['sessions'].append({'weekday': WD[dm.group(1)], 'name': dm.group(2), 'items': []}); continue
        if im:
            rec['sessions'][-1]['items'].append([im.group(2), int(im.group(3)), int(im.group(4)), int(im.group(5)), im.group(6)]); continue
        if l.startswith('Control editorial base'):
            c = {}
            for g, n, d in re.findall(r'(pecho|espalda|cuádriceps|isquios|glúteos) (\d+) \((\d+) d\)', l): c[g] = [int(n), int(d)]
            rec['controls'] = c; continue
        if l.startswith('Contribución secundaria del convencional'):
            q, h = re.findall(r'cuádriceps ([\d.]+); isquios ([\d.]+)', l)[0]
            rec['secondary'] = {'quads': float(q), 'hamstrings': float(h)}; continue
        if l.startswith('Series de trabajo por sesión'):
            rec['perSession'] = [int(x) for x in re.findall(r'(\d+)(?=[,.])', l.split(':',1)[1])]; continue
        if l.startswith('  •'): raise SystemExit('unparsed item: '+l)
        rec['notes'].append(l)
    out.append(rec)
assert len(out) == 26, len(out)
for r in out:
    for s in r['sessions']:
        assert s['items'], (r['code'], s['name'])
    assert len(r['perSession']) == len(r['sessions']), (r['code'], r['perSession'])
    assert [sum(i[1] for i in s['items']) for s in r['sessions']] == r['perSession'], (r['code'], [sum(i[1] for i in s['items']) for s in r['sessions']], r['perSession'])

d = out
L = []
L.append("/**\n * Recetas editoriales del anexo A (encargo del 15/11/2026): 26 plantillas con su dosis base adulta.\n * ARCHIVO GENERADO a partir del texto del anexo (scripts/recipes_from_annex.py): no editar a mano.\n * Cada fila: [id del ejercicio, series, mínimo, máximo, unidad ('rep' | 's')]. Unilaterales: series POR LADO.\n * Días: 0 = lunes … 6 = domingo. «controls»: control editorial de referencia (directas/semana y días), que las pruebas\n * comparan con el cálculo real; no sustituye al cálculo.\n */\n")
L.append("export type RecipeItem = [exerciseId: string, sets: number, min: number, max: number, unit: 'rep' | 's']\n")
L.append("export interface RecipeData {\n  code: string\n  title: string\n  context: string\n  goalText: string\n  material: string\n  editorialNotes: string[]\n  sessions: { weekday: number; name: string; items: RecipeItem[] }[]\n  controls: Record<'pecho' | 'espalda' | 'cuádriceps' | 'isquios' | 'glúteos', [number, number]>\n  secondary?: { quads: number; hamstrings: number }\n  perSession: number[]\n}\n")
L.append("export const RECIPE_DATA: RecipeData[] = [")
for r in d:
    L.append("  {")
    L.append(f"    code: {json.dumps(r['code'])}, title: {json.dumps(r['title'],ensure_ascii=False)},")
    L.append(f"    context: {json.dumps(r['context'],ensure_ascii=False)}, goalText: {json.dumps(r['goalText'],ensure_ascii=False)}, material: {json.dumps(r['material'],ensure_ascii=False)},")
    L.append(f"    editorialNotes: {json.dumps(r['notes'],ensure_ascii=False)},")
    L.append("    sessions: [")
    for s in r['sessions']:
        items=", ".join("["+json.dumps(i[0])+f", {i[1]}, {i[2]}, {i[3]}, '{i[4]}']" for i in s['items'])
        L.append(f"      {{ weekday: {s['weekday']}, name: {json.dumps(s['name'],ensure_ascii=False)}, items: [{items}] }},")
    L.append("    ],")
    c=r['controls']; L.append("    controls: { "+", ".join(f"{json.dumps(k,ensure_ascii=False) if k in ('cuádriceps','glúteos') else k}: [{v[0]}, {v[1]}]" for k,v in c.items())+" },")
    if 'secondary' in r: L.append(f"    secondary: {{ quads: {r['secondary']['quads']}, hamstrings: {r['secondary']['hamstrings']} }},")
    L.append(f"    perSession: {json.dumps(r['perSession'])},")
    L.append("  },")
L.append("]\n")
open(sys.argv[2],'w').write("\n".join(L))
print('ok', len(d), 'recetas')
