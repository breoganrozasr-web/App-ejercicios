/**
 * Recetas editoriales del anexo A (encargo del 15/11/2026): 26 plantillas con su dosis base adulta.
 * ARCHIVO GENERADO a partir del texto del anexo (scripts/recipes_from_annex.py): no editar a mano.
 * Cada fila: [id del ejercicio, series, mínimo, máximo, unidad ('rep' | 's')]. Unilaterales: series POR LADO.
 * Días: 0 = lunes … 6 = domingo. «controls»: control editorial de referencia (directas/semana y días), que las pruebas
 * comparan con el cálculo real; no sustituye al cálculo.
 */

export type RecipeItem = [exerciseId: string, sets: number, min: number, max: number, unit: 'rep' | 's']

export interface RecipeData {
  code: string
  title: string
  context: string
  goalText: string
  material: string
  editorialNotes: string[]
  sessions: { weekday: number; name: string; items: RecipeItem[] }[]
  controls: Record<'pecho' | 'espalda' | 'cuádriceps' | 'isquios' | 'glúteos', [number, number]>
  secondary?: { quads: number; hamstrings: number }
  perSession: number[]
}

export const RECIPE_DATA: RecipeData[] = [
  {
    code: "A01", title: "Cuerpo completo · 2 días",
    context: "inicio/retorno/intermedio", goalText: "músculo/mixto", material: "gimnasio completo",
    editorialNotes: [],
    sessions: [
      { weekday: 0, name: "Cuerpo completo A", items: [["sentadilla_barra", 3, 6, 10, 'rep'], ["press_banca_barra", 3, 6, 10, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep']] },
      { weekday: 3, name: "Cuerpo completo B", items: [["peso_muerto_rumano", 3, 6, 10, 'rep'], ["press_inclinado_mancuernas", 3, 8, 12, 'rep'], ["jalon_pecho", 3, 8, 12, 'rep'], ["prensa", 3, 10, 15, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
    ],
    controls: { pecho: [6, 2], espalda: [6, 2], "cuádriceps": [6, 2], isquios: [6, 2], "glúteos": [9, 2] },
    perSession: [16, 16],
  },
  {
    code: "A02", title: "Cuerpo completo · 3 días",
    context: "inicio/retorno/intermedio", goalText: "músculo", material: "gimnasio completo",
    editorialNotes: [],
    sessions: [
      { weekday: 0, name: "Cuerpo completo A", items: [["sentadilla_barra", 3, 6, 10, 'rep'], ["press_banca_barra", 3, 6, 10, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep']] },
      { weekday: 2, name: "Cuerpo completo B", items: [["peso_muerto_rumano", 3, 6, 10, 'rep'], ["press_inclinado_mancuernas", 3, 8, 12, 'rep'], ["jalon_pecho", 3, 8, 12, 'rep'], ["prensa", 3, 10, 15, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 4, name: "Cuerpo completo C", items: [["prensa", 3, 8, 12, 'rep'], ["press_banca_mancuernas", 3, 8, 12, 'rep'], ["remo_pecho_apoyado", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
    ],
    controls: { pecho: [9, 3], espalda: [9, 3], "cuádriceps": [9, 3], isquios: [9, 3], "glúteos": [12, 3] },
    perSession: [16, 16, 16],
  },
  {
    code: "A03", title: "Cuerpo completo breve · 2 días",
    context: "inicio/retorno/intermedio", goalText: "general/músculo con poco tiempo", material: "gimnasio completo",
    editorialNotes: ["Dosis reducida elegida; no se anuncia como equivalente a la estándar."],
    sessions: [
      { weekday: 0, name: "Cuerpo completo breve A", items: [["prensa", 2, 8, 12, 'rep'], ["press_pecho_maquina", 2, 8, 12, 'rep'], ["remo_polea_baja", 2, 8, 12, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep']] },
      { weekday: 3, name: "Cuerpo completo breve B", items: [["peso_muerto_rumano_mancuernas", 2, 8, 12, 'rep'], ["press_banca_mancuernas", 2, 8, 12, 'rep'], ["jalon_pecho", 2, 8, 12, 'rep'], ["sentadilla_mancuernas", 2, 10, 15, 'rep']] },
    ],
    controls: { pecho: [4, 2], espalda: [4, 2], "cuádriceps": [4, 2], isquios: [4, 2], "glúteos": [6, 2] },
    perSession: [8, 8],
  },
  {
    code: "A04", title: "Cuerpo completo breve · 3 días",
    context: "inicio/retorno/intermedio", goalText: "general/músculo con poco tiempo", material: "gimnasio completo",
    editorialNotes: [],
    sessions: [
      { weekday: 0, name: "Cuerpo completo breve A", items: [["prensa", 2, 8, 12, 'rep'], ["press_pecho_maquina", 2, 8, 12, 'rep'], ["remo_polea_baja", 2, 8, 12, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep']] },
      { weekday: 2, name: "Cuerpo completo breve B", items: [["peso_muerto_rumano_mancuernas", 2, 8, 12, 'rep'], ["press_banca_mancuernas", 2, 8, 12, 'rep'], ["jalon_pecho", 2, 8, 12, 'rep'], ["sentadilla_mancuernas", 2, 10, 15, 'rep']] },
      { weekday: 4, name: "Cuerpo completo breve C", items: [["prensa", 2, 8, 12, 'rep'], ["press_pecho_maquina", 2, 8, 12, 'rep'], ["jalon_estrecho", 2, 8, 12, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep']] },
    ],
    controls: { pecho: [6, 3], espalda: [6, 3], "cuádriceps": [6, 3], isquios: [6, 3], "glúteos": [8, 3] },
    perSession: [8, 8, 8],
  },
  {
    code: "A05", title: "Cuerpo completo en máquinas · 3 días",
    context: "inicio/retorno/intermedio", goalText: "músculo", material: "máquinas y poleas",
    editorialNotes: ["Sin necesidad de barra libre. No promete cubrir directamente todos los músculos en cada sesión."],
    sessions: [
      { weekday: 0, name: "Máquinas A", items: [["prensa", 3, 8, 12, 'rep'], ["press_pecho_maquina", 3, 8, 12, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep']] },
      { weekday: 2, name: "Máquinas B", items: [["extension_cuadriceps", 3, 10, 15, 'rep'], ["contractor_pecho", 3, 10, 15, 'rep'], ["jalon_pecho", 3, 8, 12, 'rep'], ["curl_femoral_tumbado", 3, 10, 15, 'rep'], ["press_hombro_maquina", 2, 8, 12, 'rep']] },
      { weekday: 4, name: "Máquinas C", items: [["prensa", 3, 10, 15, 'rep'], ["press_pecho_maquina", 3, 8, 12, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep']] },
    ],
    controls: { pecho: [9, 3], espalda: [9, 3], "cuádriceps": [9, 3], isquios: [7, 3], "glúteos": [6, 2] },
    perSession: [13, 14, 13],
  },
  {
    code: "A06", title: "Torso / pierna · 4 días",
    context: "retorno/intermedio; inicio con adaptación", goalText: "músculo", material: "gimnasio completo",
    editorialNotes: [],
    sessions: [
      { weekday: 0, name: "Torso A", items: [["press_banca_barra", 3, 6, 10, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["press_inclinado_mancuernas", 2, 8, 12, 'rep'], ["jalon_pecho", 2, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 1, name: "Pierna A", items: [["sentadilla_barra", 3, 6, 10, 'rep'], ["peso_muerto_rumano", 3, 8, 12, 'rep'], ["extension_cuadriceps", 2, 10, 15, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 3, 10, 20, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
      { weekday: 3, name: "Torso B", items: [["press_banca_mancuernas", 3, 8, 12, 'rep'], ["jalon_estrecho", 3, 8, 12, 'rep'], ["remo_pecho_apoyado", 2, 8, 12, 'rep'], ["contractor_pecho", 2, 10, 15, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["pajaros_tumbado", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 4, name: "Pierna B", items: [["prensa", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["zancadas_mancuernas", 2, 8, 12, 'rep'], ["hip_thrust_barra", 2, 8, 12, 'rep'], ["gemelos_sentado_maquina", 3, 10, 20, 'rep'], ["plancha_lateral", 2, 15, 30, 's']] },
    ],
    controls: { pecho: [10, 2], espalda: [10, 2], "cuádriceps": [10, 2], isquios: [8, 2], "glúteos": [13, 2] },
    perSession: [16, 15, 18, 15],
  },
  {
    code: "A07", title: "Torso / pierna breve · 4 días",
    context: "inicio/retorno/intermedio", goalText: "general/músculo con poco tiempo", material: "gimnasio completo",
    editorialNotes: [],
    sessions: [
      { weekday: 0, name: "Torso breve A", items: [["press_banca_barra", 3, 6, 10, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep']] },
      { weekday: 1, name: "Pierna breve A", items: [["sentadilla_barra", 3, 6, 10, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep']] },
      { weekday: 3, name: "Torso breve B", items: [["press_banca_mancuernas", 3, 8, 12, 'rep'], ["jalon_pecho", 3, 8, 12, 'rep'], ["press_hombro_mancuernas", 2, 8, 12, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 4, name: "Pierna breve B", items: [["peso_muerto_rumano", 3, 8, 12, 'rep'], ["prensa", 3, 8, 12, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
    ],
    controls: { pecho: [6, 2], espalda: [6, 2], "cuádriceps": [6, 2], isquios: [6, 2], "glúteos": [9, 2] },
    perSession: [10, 8, 10, 8],
  },
  {
    code: "A08", title: "Torso / pierna / cuerpo completo · 3 días",
    context: "inicio/retorno/intermedio", goalText: "músculo", material: "gimnasio completo",
    editorialNotes: ["Alternativa de tres días con dos exposiciones a los grandes grupos."],
    sessions: [
      { weekday: 0, name: "Torso A", items: [["press_banca_barra", 3, 6, 10, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["press_inclinado_mancuernas", 2, 8, 12, 'rep'], ["jalon_pecho", 2, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 2, name: "Pierna A", items: [["sentadilla_barra", 3, 6, 10, 'rep'], ["peso_muerto_rumano", 3, 8, 12, 'rep'], ["extension_cuadriceps", 2, 10, 15, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 3, 10, 20, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
      { weekday: 4, name: "Cuerpo completo C", items: [["prensa", 3, 8, 12, 'rep'], ["press_banca_mancuernas", 3, 8, 12, 'rep'], ["remo_pecho_apoyado", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
    ],
    controls: { pecho: [8, 2], espalda: [8, 2], "cuádriceps": [8, 2], isquios: [8, 2], "glúteos": [9, 2] },
    perSession: [16, 15, 16],
  },
  {
    code: "A09", title: "PPL · 3 días",
    context: "retorno/intermedio; inicio con adaptación", goalText: "músculo", material: "gimnasio completo",
    editorialNotes: ["Empuje, tirón y pierna una vez; frecuencia directa 1 para los grandes grupos. Preferencia válida, no inferior por definición."],
    sessions: [
      { weekday: 0, name: "Empuje concentrado", items: [["press_banca_barra", 3, 6, 10, 'rep'], ["press_inclinado_mancuernas", 3, 8, 12, 'rep'], ["contractor_pecho", 2, 10, 15, 'rep'], ["press_hombro_mancuernas", 2, 8, 12, 'rep'], ["elevaciones_laterales", 3, 12, 20, 'rep'], ["extension_triceps_cuerda", 3, 10, 15, 'rep']] },
      { weekday: 2, name: "Tirón concentrado", items: [["jalon_pecho", 3, 8, 12, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["remo_pecho_apoyado", 2, 10, 15, 'rep'], ["pajaros_tumbado", 3, 12, 20, 'rep'], ["curl_mancuernas", 3, 10, 15, 'rep']] },
      { weekday: 4, name: "Pierna completa", items: [["sentadilla_barra", 3, 6, 10, 'rep'], ["peso_muerto_rumano", 3, 8, 12, 'rep'], ["extension_cuadriceps", 3, 10, 15, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["gemelos_maquina_pie", 3, 10, 20, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
    ],
    controls: { pecho: [8, 1], espalda: [8, 1], "cuádriceps": [6, 1], isquios: [6, 1], "glúteos": [6, 1] },
    perSession: [16, 14, 17],
  },
  {
    code: "A10", title: "PPL · 6 días",
    context: "intermedio", goalText: "músculo", material: "gimnasio completo",
    editorialNotes: ["Solo elección explícita; no recomendar automáticamente. Cada día tiene menos dosis que PPL 3. Seis días no implica por sí solo más series semanales."],
    sessions: [
      { weekday: 0, name: "Empuje A", items: [["press_banca_barra", 3, 6, 10, 'rep'], ["press_inclinado_mancuernas", 2, 8, 12, 'rep'], ["press_hombro_mancuernas", 2, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 1, name: "Tirón A", items: [["jalon_pecho", 3, 8, 12, 'rep'], ["remo_polea_baja", 2, 8, 12, 'rep'], ["pajaros_tumbado", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep']] },
      { weekday: 2, name: "Pierna A", items: [["sentadilla_barra", 3, 6, 10, 'rep'], ["peso_muerto_rumano", 3, 8, 12, 'rep'], ["extension_cuadriceps", 2, 10, 15, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 3, 10, 20, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
      { weekday: 3, name: "Empuje B", items: [["press_banca_mancuernas", 3, 8, 12, 'rep'], ["contractor_pecho", 2, 10, 15, 'rep'], ["press_hombro_maquina", 2, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["extension_triceps_sobre_cabeza", 2, 10, 15, 'rep']] },
      { weekday: 4, name: "Tirón B", items: [["jalon_estrecho", 3, 8, 12, 'rep'], ["remo_pecho_apoyado", 2, 8, 12, 'rep'], ["pajaros_tumbado", 2, 12, 20, 'rep'], ["curl_martillo", 2, 10, 15, 'rep']] },
      { weekday: 5, name: "Pierna B", items: [["prensa", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["zancadas_mancuernas", 2, 8, 12, 'rep'], ["hip_thrust_barra", 2, 8, 12, 'rep'], ["gemelos_sentado_maquina", 3, 10, 20, 'rep'], ["plancha_lateral", 2, 15, 30, 's']] },
    ],
    controls: { pecho: [10, 2], espalda: [10, 2], "cuádriceps": [10, 2], isquios: [8, 2], "glúteos": [13, 2] },
    perSession: [11, 9, 15, 11, 9, 15],
  },
  {
    code: "A11", title: "PPL + torso / pierna · 5 días",
    context: "intermedio", goalText: "músculo", material: "gimnasio completo",
    editorialNotes: ["Híbrida de cinco días, con dos sesiones de pierna."],
    sessions: [
      { weekday: 0, name: "Empuje A", items: [["press_banca_barra", 3, 6, 10, 'rep'], ["press_inclinado_mancuernas", 2, 8, 12, 'rep'], ["press_hombro_mancuernas", 2, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 1, name: "Tirón A", items: [["jalon_pecho", 3, 8, 12, 'rep'], ["remo_polea_baja", 2, 8, 12, 'rep'], ["pajaros_tumbado", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep']] },
      { weekday: 2, name: "Pierna A", items: [["sentadilla_barra", 3, 6, 10, 'rep'], ["peso_muerto_rumano", 3, 8, 12, 'rep'], ["extension_cuadriceps", 2, 10, 15, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 3, 10, 20, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
      { weekday: 4, name: "Torso B", items: [["press_banca_mancuernas", 3, 8, 12, 'rep'], ["jalon_estrecho", 3, 8, 12, 'rep'], ["remo_pecho_apoyado", 2, 8, 12, 'rep'], ["contractor_pecho", 2, 10, 15, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["pajaros_tumbado", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 5, name: "Pierna B", items: [["prensa", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["zancadas_mancuernas", 2, 8, 12, 'rep'], ["hip_thrust_barra", 2, 8, 12, 'rep'], ["gemelos_sentado_maquina", 3, 10, 20, 'rep'], ["plancha_lateral", 2, 15, 30, 's']] },
    ],
    controls: { pecho: [10, 2], espalda: [10, 2], "cuádriceps": [10, 2], isquios: [8, 2], "glúteos": [13, 2] },
    perSession: [11, 9, 15, 18, 15],
  },
  {
    code: "A12", title: "Anterior / posterior · 4 días",
    context: "intermedio", goalText: "músculo", material: "gimnasio completo",
    editorialNotes: ["Son énfasis prácticos, no compartimentos anatómicos: glúteos participan en sentadilla y bisagra. Advertir solapamiento en días consecutivos y ofrecer L X V D con revisión domingo→lunes; no prometer separación perfecta."],
    sessions: [
      { weekday: 0, name: "Anterior A", items: [["sentadilla_barra", 3, 6, 10, 'rep'], ["press_banca_barra", 3, 6, 10, 'rep'], ["extension_cuadriceps", 2, 10, 15, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep']] },
      { weekday: 1, name: "Posterior A", items: [["peso_muerto_rumano", 3, 6, 10, 'rep'], ["jalon_pecho", 3, 8, 12, 'rep'], ["remo_pecho_apoyado", 2, 8, 12, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
      { weekday: 3, name: "Anterior B", items: [["prensa", 3, 8, 12, 'rep'], ["press_banca_mancuernas", 3, 8, 12, 'rep'], ["extension_cuadriceps", 2, 10, 15, 'rep'], ["press_hombro_mancuernas", 2, 8, 12, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep']] },
      { weekday: 4, name: "Posterior B", items: [["hip_thrust_barra", 3, 8, 12, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["jalon_estrecho", 2, 8, 12, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["pajaros_tumbado", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep']] },
    ],
    controls: { pecho: [6, 2], espalda: [10, 2], "cuádriceps": [10, 2], isquios: [8, 2], "glúteos": [12, 4] },
    perSession: [14, 14, 14, 15],
  },
  {
    code: "A13", title: "Torso / pierna: anterior y posterior · 4 días",
    context: "retorno/intermedio; inicio con adaptación", goalText: "músculo", material: "gimnasio completo",
    editorialNotes: ["Día anterior con algo de curl; día posterior con algo de cuádriceps. Cada día de pierna tiene énfasis, no exclusividad."],
    sessions: [
      { weekday: 0, name: "Torso A", items: [["press_banca_barra", 3, 6, 10, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["press_inclinado_mancuernas", 2, 8, 12, 'rep'], ["jalon_pecho", 2, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 1, name: "Pierna con énfasis anterior", items: [["sentadilla_barra", 3, 6, 10, 'rep'], ["prensa", 2, 10, 15, 'rep'], ["extension_cuadriceps", 2, 10, 15, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 3, 10, 20, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
      { weekday: 3, name: "Torso B", items: [["press_banca_mancuernas", 3, 8, 12, 'rep'], ["jalon_estrecho", 3, 8, 12, 'rep'], ["remo_pecho_apoyado", 2, 8, 12, 'rep'], ["contractor_pecho", 2, 10, 15, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["pajaros_tumbado", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 4, name: "Pierna con énfasis posterior", items: [["peso_muerto_rumano", 3, 6, 10, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["hip_thrust_barra", 2, 8, 12, 'rep'], ["zancadas_mancuernas", 2, 8, 12, 'rep'], ["gemelos_sentado_maquina", 3, 10, 20, 'rep'], ["plancha_lateral", 2, 15, 30, 's']] },
    ],
    controls: { pecho: [10, 2], espalda: [10, 2], "cuádriceps": [9, 2], isquios: [8, 2], "glúteos": [12, 2] },
    perSession: [16, 14, 18, 15],
  },
  {
    code: "A14", title: "Fuerza + hipertrofia · 3 días",
    context: "retorno con experiencia/intermedio", goalText: "mixto", material: "barra, discos, rack seguro, banco, mancuernas, máquinas y poleas",
    editorialNotes: ["Referencias: sentadilla, banca y peso muerto convencional. El remo/jalón completa tirón de torso; no es un cuarto levantamiento de powerlifting."],
    sessions: [
      { weekday: 0, name: "Sentadilla y banca de apoyo", items: [["sentadilla_barra", 3, 4, 6, 'rep'], ["press_banca_barra", 3, 6, 8, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep']] },
      { weekday: 2, name: "Peso muerto y torso", items: [["peso_muerto_convencional", 2, 4, 6, 'rep'], ["press_hombro_mancuernas", 3, 6, 8, 'rep'], ["jalon_pecho", 3, 8, 12, 'rep'], ["prensa", 3, 10, 12, 'rep'], ["press_inclinado_mancuernas", 2, 8, 12, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep']] },
      { weekday: 4, name: "Banca y pierna de apoyo", items: [["press_banca_barra", 3, 4, 6, 'rep'], ["sentadilla_barra", 2, 6, 8, 'rep'], ["peso_muerto_rumano", 2, 8, 10, 'rep'], ["remo_polea_baja", 2, 8, 12, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep']] },
    ],
    controls: { pecho: [8, 3], espalda: [8, 3], "cuádriceps": [8, 3], isquios: [6, 2], "glúteos": [12, 3] },
    secondary: { quads: 1.0, hamstrings: 1.0 },
    perSession: [15, 15, 15],
  },
  {
    code: "A15", title: "Fuerza + hipertrofia · 4 días",
    context: "retorno con experiencia/intermedio", goalText: "mixto", material: "gimnasio completo con rack seguro",
    editorialNotes: ["Opción destacada para quien pide básicos y accesorios. Sentadilla 1, banca 2, peso muerto 1 exposiciones específicas; RDL no se cuenta como práctica del convencional."],
    sessions: [
      { weekday: 0, name: "Torso: banca de fuerza", items: [["press_banca_barra", 3, 4, 6, 'rep'], ["remo_polea_baja", 3, 6, 10, 'rep'], ["press_inclinado_mancuernas", 2, 8, 12, 'rep'], ["jalon_pecho", 2, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 1, name: "Pierna: sentadilla de fuerza", items: [["sentadilla_barra", 3, 4, 6, 'rep'], ["peso_muerto_rumano", 2, 8, 10, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["extension_cuadriceps", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 3, 10, 20, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
      { weekday: 3, name: "Torso: banca y volumen", items: [["press_banca_barra", 3, 8, 10, 'rep'], ["jalon_pecho", 3, 8, 12, 'rep'], ["press_inclinado_mancuernas", 2, 10, 12, 'rep'], ["remo_pecho_apoyado", 2, 10, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 4, name: "Pierna: peso muerto y volumen", items: [["peso_muerto_convencional", 2, 4, 6, 'rep'], ["prensa", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["extension_cuadriceps", 2, 12, 15, 'rep'], ["gemelos_maquina_pie", 3, 10, 20, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
    ],
    controls: { pecho: [10, 2], espalda: [10, 2], "cuádriceps": [10, 2], isquios: [7, 2], "glúteos": [10, 2] },
    secondary: { quads: 1.0, hamstrings: 1.0 },
    perSession: [16, 14, 16, 15],
  },
  {
    code: "A16", title: "Fuerza + hipertrofia · 5 días",
    context: "intermedio", goalText: "mixto", material: "gimnasio completo con rack seguro",
    editorialNotes: ["Redistribuye hombros y brazos a un quinto día; no apila ARMS sobre la plantilla completa de cuatro días."],
    sessions: [
      { weekday: 0, name: "Torso: banca de fuerza, compacto", items: [["press_banca_barra", 3, 4, 6, 'rep'], ["remo_polea_baja", 3, 6, 10, 'rep'], ["press_inclinado_mancuernas", 2, 8, 12, 'rep'], ["jalon_pecho", 2, 8, 12, 'rep']] },
      { weekday: 1, name: "Pierna: sentadilla de fuerza", items: [["sentadilla_barra", 3, 4, 6, 'rep'], ["peso_muerto_rumano", 2, 8, 10, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["extension_cuadriceps", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 3, 10, 20, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
      { weekday: 3, name: "Torso: banca y volumen, compacto", items: [["press_banca_barra", 3, 8, 10, 'rep'], ["jalon_pecho", 3, 8, 12, 'rep'], ["press_inclinado_mancuernas", 2, 10, 12, 'rep'], ["remo_pecho_apoyado", 2, 10, 12, 'rep']] },
      { weekday: 4, name: "Pierna: peso muerto y volumen", items: [["peso_muerto_convencional", 2, 4, 6, 'rep'], ["prensa", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["extension_cuadriceps", 2, 12, 15, 'rep'], ["gemelos_maquina_pie", 3, 10, 20, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
      { weekday: 5, name: "Hombros y brazos", items: [["elevaciones_laterales", 4, 12, 20, 'rep'], ["curl_mancuernas", 4, 10, 15, 'rep'], ["extension_triceps_cuerda", 4, 10, 15, 'rep'], ["pajaros_tumbado", 2, 12, 20, 'rep']] },
    ],
    controls: { pecho: [10, 2], espalda: [10, 2], "cuádriceps": [10, 2], isquios: [7, 2], "glúteos": [10, 2] },
    secondary: { quads: 1.0, hamstrings: 1.0 },
    perSession: [10, 14, 10, 15, 14],
  },
  {
    code: "A17", title: "Fuerza SBD · 3 días",
    context: "intermedio; retorno mediante readaptación", goalText: "fuerza", material: "gimnasio completo con rack seguro",
    editorialNotes: ["Practica sentadilla 2, banca 3 y peso muerto convencional 1 días. Desarrollo de fuerza, sin pico competitivo ni test máximo obligatorio."],
    sessions: [
      { weekday: 0, name: "Sentadilla y banca", items: [["sentadilla_barra", 3, 4, 6, 'rep'], ["press_banca_barra", 3, 4, 6, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
      { weekday: 2, name: "Peso muerto y banca de apoyo", items: [["peso_muerto_convencional", 3, 4, 6, 'rep'], ["press_banca_barra", 3, 6, 8, 'rep'], ["jalon_pecho", 3, 8, 12, 'rep'], ["zancadas_mancuernas", 2, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep']] },
      { weekday: 4, name: "Sentadilla de apoyo y banca", items: [["sentadilla_barra", 3, 6, 8, 'rep'], ["press_banca_barra", 3, 4, 6, 'rep'], ["peso_muerto_rumano", 2, 8, 10, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep']] },
    ],
    controls: { pecho: [9, 3], espalda: [9, 3], "cuádriceps": [8, 3], isquios: [4, 2], "glúteos": [13, 3] },
    secondary: { quads: 1.5, hamstrings: 1.5 },
    perSession: [13, 13, 13],
  },
  {
    code: "A18", title: "Fuerza SBD · 4 días",
    context: "intermedio; retorno mediante readaptación", goalText: "fuerza", material: "gimnasio completo con rack seguro",
    editorialNotes: ["Sentadilla 2, banca 2 y peso muerto convencional 1 días. Accesorios deliberadamente moderados."],
    sessions: [
      { weekday: 0, name: "Banca A", items: [["press_banca_barra", 3, 4, 6, 'rep'], ["remo_polea_baja", 3, 6, 10, 'rep'], ["jalon_pecho", 2, 8, 12, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 1, name: "Sentadilla principal", items: [["sentadilla_barra", 3, 4, 6, 'rep'], ["peso_muerto_rumano", 2, 6, 10, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep']] },
      { weekday: 3, name: "Banca B", items: [["press_banca_barra", 3, 6, 8, 'rep'], ["jalon_pecho", 3, 8, 12, 'rep'], ["press_banca_mancuernas", 2, 8, 12, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep']] },
      { weekday: 4, name: "Peso muerto principal", items: [["peso_muerto_convencional", 3, 4, 6, 'rep'], ["sentadilla_barra", 2, 6, 8, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
    ],
    controls: { pecho: [8, 2], espalda: [8, 2], "cuádriceps": [5, 2], isquios: [6, 2], "glúteos": [10, 2] },
    secondary: { quads: 1.5, hamstrings: 1.5 },
    perSession: [10, 9, 12, 9],
  },
  {
    code: "A19", title: "Torso / pierna con prioridad de tren inferior · 5 días",
    context: "intermedio", goalText: "músculo; prioridad explícita de pierna/glúteos", material: "gimnasio completo",
    editorialNotes: ["Tres sesiones inferiores con dosis repartida. No añadir automáticamente a otra rutina ni prescribir por sexo."],
    sessions: [
      { weekday: 0, name: "Pierna: cuádriceps", items: [["sentadilla_barra", 3, 6, 10, 'rep'], ["extension_cuadriceps", 2, 10, 15, 'rep'], ["curl_femoral_sentado", 2, 10, 15, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep']] },
      { weekday: 1, name: "Torso A", items: [["press_banca_barra", 3, 6, 10, 'rep'], ["remo_polea_baja", 3, 8, 12, 'rep'], ["press_inclinado_mancuernas", 2, 8, 12, 'rep'], ["jalon_pecho", 2, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 2, name: "Pierna: bisagra", items: [["peso_muerto_rumano", 3, 8, 12, 'rep'], ["prensa", 3, 10, 15, 'rep'], ["gemelos_maquina_pie", 2, 10, 20, 'rep'], ["plancha_lateral", 2, 15, 30, 's']] },
      { weekday: 4, name: "Torso B", items: [["press_banca_mancuernas", 3, 8, 12, 'rep'], ["jalon_estrecho", 3, 8, 12, 'rep'], ["remo_pecho_apoyado", 2, 8, 12, 'rep'], ["contractor_pecho", 2, 10, 15, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["pajaros_tumbado", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_cuerda", 2, 10, 15, 'rep']] },
      { weekday: 5, name: "Pierna: glúteos y curl", items: [["hip_thrust_barra", 3, 8, 12, 'rep'], ["curl_femoral_sentado", 3, 10, 15, 'rep'], ["abductores_maquina", 2, 12, 20, 'rep'], ["extension_cuadriceps", 2, 10, 15, 'rep'], ["crunch_polea", 2, 10, 15, 'rep']] },
    ],
    controls: { pecho: [10, 2], espalda: [10, 2], "cuádriceps": [10, 3], isquios: [8, 3], "glúteos": [12, 3] },
    perSession: [9, 16, 10, 18, 12],
  },
  {
    code: "A20", title: "Casa con mancuernas y banco · 2 días",
    context: "inicio/retorno/intermedio", goalText: "músculo", material: "mancuernas ajustables, banco estable e inclinable",
    editorialNotes: ["Sin tirón vertical. Sí hay tirón horizontal; mostrar esa diferencia, sin declarar espalda ausente."],
    sessions: [
      { weekday: 0, name: "Mancuernas A", items: [["sentadilla_mancuernas", 3, 8, 12, 'rep'], ["press_banca_mancuernas", 3, 8, 12, 'rep'], ["remo_mancuerna", 3, 8, 12, 'rep'], ["peso_muerto_rumano_mancuernas", 2, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["gemelos_peso_corporal", 2, 12, 20, 'rep']] },
      { weekday: 3, name: "Mancuernas B", items: [["peso_muerto_rumano_mancuernas", 3, 8, 12, 'rep'], ["press_inclinado_mancuernas", 3, 8, 12, 'rep'], ["remo_pecho_apoyado", 3, 8, 12, 'rep'], ["zancadas_mancuernas", 3, 8, 12, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_sobre_cabeza", 2, 10, 15, 'rep']] },
    ],
    controls: { pecho: [6, 2], espalda: [6, 2], "cuádriceps": [6, 2], isquios: [5, 2], "glúteos": [11, 2] },
    perSession: [15, 16],
  },
  {
    code: "A21", title: "Casa con mancuernas y banco · 3 días",
    context: "inicio/retorno/intermedio", goalText: "músculo", material: "mancuernas ajustables, banco estable e inclinable",
    editorialNotes: ["Las piernas pueden quedar limitadas por la carga disponible; ofrecer variantes con confirmación, sin repeticiones interminables."],
    sessions: [
      { weekday: 0, name: "Mancuernas A", items: [["sentadilla_mancuernas", 3, 8, 12, 'rep'], ["press_banca_mancuernas", 3, 8, 12, 'rep'], ["remo_mancuerna", 3, 8, 12, 'rep'], ["peso_muerto_rumano_mancuernas", 2, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["gemelos_peso_corporal", 2, 12, 20, 'rep']] },
      { weekday: 2, name: "Mancuernas B", items: [["peso_muerto_rumano_mancuernas", 3, 8, 12, 'rep'], ["press_inclinado_mancuernas", 3, 8, 12, 'rep'], ["remo_pecho_apoyado", 3, 8, 12, 'rep'], ["zancadas_mancuernas", 3, 8, 12, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_sobre_cabeza", 2, 10, 15, 'rep']] },
      { weekday: 4, name: "Mancuernas C", items: [["sentadilla_mancuernas", 3, 10, 15, 'rep'], ["press_banca_mancuernas", 3, 10, 15, 'rep'], ["remo_mancuerna", 3, 10, 15, 'rep'], ["peso_muerto_rumano_mancuernas", 2, 10, 15, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["elevacion_cadera_rodillas", 2, 10, 20, 'rep']] },
    ],
    controls: { pecho: [9, 3], espalda: [9, 3], "cuádriceps": [9, 3], isquios: [7, 3], "glúteos": [16, 3] },
    perSession: [15, 16, 15],
  },
  {
    code: "A22", title: "Casa: torso / pierna con mancuernas · 4 días",
    context: "retorno/intermedio; inicio con adaptación", goalText: "músculo", material: "mancuernas ajustables, banco estable e inclinable",
    editorialNotes: [],
    sessions: [
      { weekday: 0, name: "Torso con mancuernas A", items: [["press_banca_mancuernas", 3, 8, 12, 'rep'], ["remo_mancuerna", 3, 8, 12, 'rep'], ["press_hombro_mancuernas", 2, 8, 12, 'rep'], ["elevaciones_laterales", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_sobre_cabeza", 2, 10, 15, 'rep']] },
      { weekday: 1, name: "Pierna con mancuernas A", items: [["sentadilla_mancuernas", 3, 8, 12, 'rep'], ["peso_muerto_rumano_mancuernas", 3, 8, 12, 'rep'], ["zancadas_mancuernas", 2, 10, 15, 'rep'], ["gemelos_peso_corporal", 3, 12, 20, 'rep'], ["plancha_frontal", 2, 20, 40, 's']] },
      { weekday: 3, name: "Torso con mancuernas B", items: [["press_inclinado_mancuernas", 3, 8, 12, 'rep'], ["remo_pecho_apoyado", 3, 8, 12, 'rep'], ["flexiones", 2, 6, 15, 'rep'], ["pajaros_tumbado", 2, 12, 20, 'rep'], ["curl_mancuernas", 2, 10, 15, 'rep'], ["extension_triceps_sobre_cabeza", 2, 10, 15, 'rep']] },
      { weekday: 4, name: "Pierna con mancuernas B", items: [["peso_muerto_rumano_mancuernas", 3, 8, 12, 'rep'], ["zancadas_mancuernas", 3, 8, 12, 'rep'], ["sentadilla_mancuernas", 2, 10, 15, 'rep'], ["gemelos_peso_corporal", 3, 12, 20, 'rep'], ["elevacion_cadera_rodillas", 2, 10, 20, 'rep']] },
    ],
    controls: { pecho: [8, 2], espalda: [6, 2], "cuádriceps": [10, 2], isquios: [6, 2], "glúteos": [16, 2] },
    perSession: [14, 13, 14, 13],
  },
  {
    code: "A23", title: "Casa con material mixto · 3 días",
    context: "retorno/intermedio; inicio con sustituciones", goalText: "músculo/general", material: "mancuernas, bandas, anclaje homologado y barra de dominadas",
    editorialNotes: ["Todos los elementos son requisitos reales. Si faltan anclaje o barra, ofrecer plantilla de mancuernas; no improvisar anclajes en muebles."],
    sessions: [
      { weekday: 0, name: "Casa mixta A", items: [["sentadilla_mancuernas", 3, 8, 12, 'rep'], ["flexiones", 3, 6, 15, 'rep'], ["remo_banda_anclaje", 3, 10, 15, 'rep'], ["peso_muerto_rumano_mancuernas", 2, 8, 12, 'rep'], ["curl_banda", 2, 10, 20, 'rep']] },
      { weekday: 2, name: "Casa mixta B", items: [["peso_muerto_rumano_mancuernas", 3, 8, 12, 'rep'], ["dominadas", 3, 6, 10, 'rep'], ["zancadas_mancuernas", 3, 8, 12, 'rep'], ["press_hombro_unilateral", 2, 8, 12, 'rep'], ["flexiones", 2, 6, 15, 'rep'], ["plancha_frontal", 2, 20, 40, 's']] },
      { weekday: 4, name: "Casa mixta C", items: [["sentadilla_mancuernas", 3, 10, 15, 'rep'], ["flexiones", 3, 6, 15, 'rep'], ["remo_banda_anclaje", 3, 10, 15, 'rep'], ["peso_muerto_rumano_mancuernas", 2, 10, 15, 'rep'], ["aperturas_posteriores_banda", 2, 12, 20, 'rep'], ["gemelos_peso_corporal", 2, 12, 20, 'rep']] },
    ],
    controls: { pecho: [8, 3], espalda: [9, 3], "cuádriceps": [9, 3], isquios: [7, 3], "glúteos": [16, 3] },
    perSession: [13, 15, 15],
  },
  {
    code: "A24", title: "Casa sin material · 3 días",
    context: "inicio/retorno", goalText: "general; hipertrofia limitada por material", material: "suelo y espacio libre",
    editorialNotes: ["Cobertura parcial: sin tirón cargado para espalda ni trabajo específico resistido de isquios. El puente no sustituye al curl o al RDL. Mostrar limitación y material que la resolvería, sin garantizar programa completo de hipertrofia."],
    sessions: [
      { weekday: 0, name: "Sin material A", items: [["sentadilla_peso_corporal", 3, 10, 20, 'rep'], ["flexiones", 3, 6, 15, 'rep'], ["puente_gluteo", 3, 10, 20, 'rep'], ["plancha_frontal", 2, 15, 30, 's'], ["gemelos_peso_corporal", 2, 12, 20, 'rep']] },
      { weekday: 2, name: "Sin material B", items: [["zancada_atras_peso_corporal", 3, 8, 15, 'rep'], ["flexiones", 3, 6, 15, 'rep'], ["puente_gluteo", 3, 10, 20, 'rep'], ["plancha_lateral", 2, 15, 30, 's'], ["gemelos_peso_corporal", 2, 12, 20, 'rep']] },
      { weekday: 4, name: "Sin material C", items: [["sentadilla_peso_corporal", 3, 10, 20, 'rep'], ["flexiones", 3, 6, 15, 'rep'], ["puente_gluteo", 3, 10, 20, 'rep'], ["elevacion_cadera_rodillas", 2, 10, 20, 'rep'], ["gemelos_peso_corporal", 2, 12, 20, 'rep']] },
    ],
    controls: { pecho: [9, 3], espalda: [0, 0], "cuádriceps": [9, 3], isquios: [0, 0], "glúteos": [18, 3] },
    perSession: [13, 13, 13],
  },
  {
    code: "A25", title: "Parque / calistenia · 2 días",
    context: "retorno/intermedio; inicio con variantes accesibles", goalText: "general/músculo con peso corporal", material: "barra alta, barra baja y banco o escalón estable",
    editorialNotes: ["Cobertura de isquios limitada; no contar el puente como curl. Elegir asistencia o sustitución si no se llega al rango, nunca forzar 6 dominadas. Las piernas pueden necesitar resistencia adicional."],
    sessions: [
      { weekday: 0, name: "Parque A", items: [["dominadas", 3, 6, 10, 'rep'], ["flexiones", 3, 6, 15, 'rep'], ["zancada_atras_peso_corporal", 3, 8, 15, 'rep'], ["remo_invertido", 2, 8, 15, 'rep'], ["puente_gluteo", 2, 10, 20, 'rep'], ["plancha_frontal", 2, 20, 40, 's']] },
      { weekday: 3, name: "Parque B", items: [["remo_invertido", 3, 8, 15, 'rep'], ["flexiones_inclinadas", 3, 8, 15, 'rep'], ["subida_escalon", 3, 8, 15, 'rep'], ["dominadas", 2, 6, 10, 'rep'], ["puente_gluteo", 2, 10, 20, 'rep'], ["gemelos_peso_corporal", 2, 12, 20, 'rep']] },
    ],
    controls: { pecho: [6, 2], espalda: [10, 2], "cuádriceps": [6, 2], isquios: [0, 0], "glúteos": [10, 2] },
    perSession: [15, 15],
  },
  {
    code: "A26", title: "Parque / calistenia · 3 días",
    context: "retorno/intermedio; inicio con variantes accesibles", goalText: "general/músculo con peso corporal", material: "barra alta, barra baja y banco o escalón estable",
    editorialNotes: ["Mismas limitaciones de isquios y progresión de pierna que la versión de dos días."],
    sessions: [
      { weekday: 0, name: "Parque A", items: [["dominadas", 3, 6, 10, 'rep'], ["flexiones", 3, 6, 15, 'rep'], ["zancada_atras_peso_corporal", 3, 8, 15, 'rep'], ["remo_invertido", 2, 8, 15, 'rep'], ["puente_gluteo", 2, 10, 20, 'rep'], ["plancha_frontal", 2, 20, 40, 's']] },
      { weekday: 2, name: "Parque B", items: [["remo_invertido", 3, 8, 15, 'rep'], ["flexiones_inclinadas", 3, 8, 15, 'rep'], ["subida_escalon", 3, 8, 15, 'rep'], ["dominadas", 2, 6, 10, 'rep'], ["puente_gluteo", 2, 10, 20, 'rep'], ["gemelos_peso_corporal", 2, 12, 20, 'rep']] },
      { weekday: 4, name: "Parque C", items: [["dominadas", 2, 6, 10, 'rep'], ["flexiones", 3, 6, 15, 'rep'], ["sentadilla_peso_corporal", 3, 10, 20, 'rep'], ["remo_invertido", 2, 8, 15, 'rep'], ["puente_gluteo", 2, 10, 20, 'rep'], ["plancha_lateral", 2, 15, 30, 's']] },
    ],
    controls: { pecho: [9, 3], espalda: [14, 3], "cuádriceps": [9, 3], isquios: [0, 0], "glúteos": [15, 3] },
    perSession: [15, 15, 14],
  },
]
