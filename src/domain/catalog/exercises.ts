import type { EquipmentId, Exercise, Level, LoadType, MuscleId, Pattern } from '../types'

/**
 * Catálogo inicial. Textos redactados para esta app (no copiados).
 * Cada ejercicio con demoStatus 'verificada' tiene ilustraciones Everkinetic revisadas una a una
 * para comprobar que muestran ESTA variante (ver docs/CONTENIDOS_Y_LICENCIAS.md).
 */

interface Def {
  id: string
  name: string
  syn?: string[]
  p: MuscleId[]
  s?: MuscleId[]
  eq: EquipmentId[]
  pattern: Pattern
  cat: Exercise['category']
  lvl?: Level
  load: LoadType
  uni?: boolean
  reps: Exercise['repProfile']
  ins: string[]
  err: string[]
  easier?: string
  harder?: string
  note?: string
  demo?: Exercise['demoStatus']
}

function ex(d: Def): Exercise {
  const demoStatus = d.demo ?? 'verificada'
  return {
    id: d.id,
    name: d.name,
    synonyms: d.syn ?? [],
    primary: d.p,
    secondary: d.s ?? [],
    equipment: d.eq,
    pattern: d.pattern,
    category: d.cat,
    minLevel: d.lvl ?? 'beginner',
    loadType: d.load,
    unilateral: d.uni ?? false,
    repProfile: d.reps,
    instructions: d.ins,
    errors: d.err,
    media: demoStatus === 'verificada' ? [{ mediaId: `ek-${d.id}` }] : [],
    demoStatus,
    easier: d.easier,
    harder: d.harder,
    variantNote: d.note,
  }
}

export const EXERCISES: Exercise[] = [
  // ───────────── PECHO / EMPUJE HORIZONTAL ─────────────
  ex({
    id: 'press_banca_barra', name: 'Press de banca con barra', syn: ['press banca', 'bench press'],
    p: ['chest'], s: ['triceps', 'shoulders'], eq: ['barbell', 'bench', 'rack'], pattern: 'push_h', cat: 'compound',
    load: 'barbell_total', reps: 'heavy',
    ins: ['Túmbate con los ojos bajo la barra, pies firmes en el suelo y omóplatos juntos y hacia abajo.', 'Agarra la barra algo más abierta que los hombros y sácala con los brazos estirados sobre el pecho.', 'Baja controlando hasta rozar la parte media-baja del pecho con los codos a unos 45–70° del tronco.', 'Empuja hasta estirar los brazos sin perder la posición de los hombros.'],
    err: ['Rebotar la barra en el pecho.', 'Abrir los codos a 90° y adelantar los hombros.', 'Levantar los glúteos del banco.', 'Entrenar pesado sin topes de seguridad ni ayudante.'],
    easier: 'press_pecho_maquina',
  }),
  ex({
    id: 'press_banca_mancuernas', name: 'Press de banca con mancuernas', syn: ['press plano mancuernas'],
    p: ['chest'], s: ['triceps', 'shoulders'], eq: ['dumbbell', 'bench'], pattern: 'push_h', cat: 'compound',
    load: 'dumbbell_each', reps: 'moderate',
    ins: ['Siéntate con las mancuernas sobre los muslos y túmbate llevándolas al pecho.', 'Con los omóplatos juntos, empuja hacia arriba hasta estirar los brazos.', 'Baja despacio hasta sentir un estiramiento cómodo en el pecho, codos algo por debajo del banco.', 'Sube de nuevo sin chocar las mancuernas.'],
    err: ['Bajar más de lo que tu hombro tolera.', 'Dejar caer las mancuernas al final sin control.', 'Arquear la zona lumbar en exceso.'],
  }),
  ex({
    id: 'press_inclinado_barra', name: 'Press inclinado con barra', syn: ['press inclinado'],
    p: ['chest'], s: ['shoulders', 'triceps'], eq: ['barbell', 'bench', 'rack'], pattern: 'push_h', cat: 'compound',
    load: 'barbell_total', reps: 'heavy', lvl: 'returning',
    ins: ['Ajusta el banco a unos 30–45°.', 'Saca la barra con agarre algo más abierto que los hombros.', 'Bájala hacia la parte alta del pecho controlando.', 'Empuja hasta estirar los brazos.'],
    err: ['Inclinar el banco demasiado (se convierte en press de hombro).', 'Despegar la espalda del banco.', 'Bajar la barra hacia el cuello.'],
  }),
  ex({
    id: 'press_inclinado_mancuernas', name: 'Press inclinado con mancuernas',
    p: ['chest'], s: ['shoulders', 'triceps'], eq: ['dumbbell', 'bench'], pattern: 'push_h', cat: 'compound',
    load: 'dumbbell_each', reps: 'moderate',
    ins: ['Banco a 30–45°, mancuernas a la altura del pecho.', 'Empuja hacia arriba y ligeramente hacia dentro.', 'Baja controlando hasta un estiramiento cómodo.'],
    err: ['Usar una inclinación excesiva.', 'Perder el control al bajar.', 'Encoger los hombros hacia las orejas.'],
  }),
  ex({
    id: 'press_pecho_maquina', name: 'Press de pecho en máquina', syn: ['chest press'],
    p: ['chest'], s: ['triceps', 'shoulders'], eq: ['machine'], pattern: 'push_h', cat: 'compound',
    load: 'machine', reps: 'moderate', harder: 'press_banca_barra',
    ins: ['Ajusta el asiento para que las asas queden a la altura de la mitad del pecho.', 'Espalda apoyada y omóplatos atrás.', 'Empuja hasta casi estirar los codos y vuelve despacio.'],
    err: ['Asiento demasiado alto o bajo.', 'Separar la espalda del respaldo al empujar.', 'Dejar que el peso choque al volver.'],
    note: 'La carga que marca cada máquina no es comparable con otras máquinas ni con barra.',
  }),
  ex({
    id: 'press_banca_multipower', name: 'Press de banca en multipower', syn: ['press banca smith'],
    p: ['chest'], s: ['triceps', 'shoulders'], eq: ['smith', 'bench'], pattern: 'push_h', cat: 'compound',
    load: 'machine', reps: 'moderate',
    ins: ['Coloca el banco para que la barra baje a la parte media del pecho.', 'Desbloquea la barra girando las muñecas.', 'Baja controlando y empuja hasta estirar los brazos.', 'Ajusta los topes de seguridad antes de empezar.'],
    err: ['Banco mal colocado respecto a la barra.', 'No poner los topes.', 'Rebotar en el pecho.'],
    note: 'La barra del multipower puede pesar distinto según el modelo: anota siempre igual (solo discos o total).',
  }),
  ex({
    id: 'flexiones', name: 'Flexiones', syn: ['push-ups', 'lagartijas'],
    p: ['chest'], s: ['triceps', 'shoulders', 'abs'], eq: [], pattern: 'push_h', cat: 'compound',
    load: 'bodyweight', reps: 'light', harder: 'flexiones_pies_elevados', easier: 'press_pecho_maquina',
    ins: ['Manos algo más abiertas que los hombros, cuerpo en línea de cabeza a talones.', 'Baja el pecho hacia el suelo con los codos a unos 45° del tronco.', 'Empuja hasta estirar los brazos manteniendo el abdomen firme.'],
    err: ['Dejar caer la cadera.', 'Mover solo la cabeza en lugar del pecho.', 'Recorrido muy corto.'],
  }),
  ex({
    id: 'flexiones_pies_elevados', name: 'Flexiones con pies elevados', syn: ['flexiones declinadas'],
    p: ['chest'], s: ['shoulders', 'triceps', 'abs'], eq: ['chair'], pattern: 'push_h', cat: 'compound',
    load: 'bodyweight', reps: 'light', easier: 'flexiones', lvl: 'returning',
    ins: ['Apoya los pies en un banco o silla estable y las manos en el suelo.', 'Mantén el cuerpo recto y baja el pecho controlando.', 'Empuja hasta estirar los brazos.'],
    err: ['Usar un apoyo inestable.', 'Hundir la zona lumbar.', 'Bajar la cabeza antes que el pecho.'],
  }),
  ex({
    id: 'fondos_asistidos', name: 'Fondos en máquina asistida', syn: ['fondos asistidos', 'dips asistidos'],
    p: ['chest', 'triceps'], s: ['shoulders'], eq: ['machine'], pattern: 'push_v', cat: 'compound',
    load: 'assisted', reps: 'moderate',
    ins: ['Elige la asistencia (más kilos de asistencia = más fácil) y apoya las rodillas en la plataforma.', 'Agarra las asas con los brazos estirados.', 'Baja flexionando los codos con el tronco algo inclinado hasta un estiramiento cómodo.', 'Empuja hasta estirar los brazos.'],
    err: ['Bajar más allá de lo que tolera el hombro.', 'Encoger los hombros.', 'Interpretar más asistencia como más fuerza.'],
    note: 'La ilustración muestra la máquina de fondos asistidos (rodillas apoyadas).',
  }),
  ex({
    id: 'aperturas_mancuernas', name: 'Aperturas con mancuernas', syn: ['flyes', 'aperturas planas'],
    p: ['chest'], s: ['shoulders'], eq: ['dumbbell', 'bench'], pattern: 'chest_iso', cat: 'isolation',
    load: 'dumbbell_each', reps: 'light',
    ins: ['Túmbate con las mancuernas sobre el pecho y los codos ligeramente flexionados.', 'Abre los brazos en arco hasta notar estiramiento en el pecho.', 'Cierra el arco sin cambiar el ángulo de los codos.'],
    err: ['Convertirlo en un press doblando mucho los codos.', 'Bajar demasiado con peso alto.', 'Bloquear los codos.'],
  }),
  ex({
    id: 'cruce_poleas', name: 'Cruce de poleas', syn: ['cable crossover', 'aperturas en polea'],
    p: ['chest'], s: ['shoulders'], eq: ['cable'], pattern: 'chest_iso', cat: 'isolation',
    load: 'cable', reps: 'light',
    ins: ['Poleas altas, un pie adelantado y tronco algo inclinado.', 'Con codos ligeramente flexionados, junta las manos delante del cuerpo.', 'Vuelve abriendo despacio hasta un estiramiento cómodo.'],
    err: ['Tirar con los brazos rectos bloqueados.', 'Inclinarse en exceso.', 'Perder el control en la vuelta.'],
  }),
  ex({
    id: 'contractor_pecho', name: 'Contractor de pecho en máquina', syn: ['pec deck', 'mariposa'],
    p: ['chest'], s: [], eq: ['machine'], pattern: 'chest_iso', cat: 'isolation',
    load: 'machine', reps: 'light',
    ins: ['Ajusta el asiento para que los codos queden a la altura de los hombros.', 'Apoya antebrazos o manos y junta delante del pecho.', 'Vuelve despacio sin dejar que el peso choque.'],
    err: ['Asiento mal regulado.', 'Despegar la espalda del respaldo.', 'Rebotar en el punto de estiramiento.'],
  }),
  ex({
    id: 'aperturas_banda', name: 'Aperturas de pie con banda', syn: ['cruces con banda'],
    p: ['chest'], s: ['shoulders'], eq: ['bands'], pattern: 'chest_iso', cat: 'isolation',
    load: 'band', reps: 'light',
    ins: ['Ancla la banda detrás de ti a la altura del pecho.', 'Con los codos ligeramente flexionados, junta las manos delante.', 'Vuelve despacio controlando la tensión.'],
    err: ['Anclaje inseguro.', 'Doblar los codos para empujar.', 'Soltar la tensión de golpe.'],
  }),

  // ───────────── ESPALDA / TIRONES ─────────────
  ex({
    id: 'dominadas', name: 'Dominadas (agarre prono)', syn: ['pull-ups'],
    p: ['back'], s: ['biceps', 'forearms', 'shoulders'], eq: ['pullup_bar'], pattern: 'pull_v', cat: 'compound',
    load: 'bodyweight', reps: 'moderate', lvl: 'returning', easier: 'jalon_pecho',
    ins: ['Cuélgate con agarre prono algo más abierto que los hombros.', 'Lleva los hombros abajo y atrás y tira hasta acercar el pecho a la barra.', 'Baja controlando hasta estirar los brazos.'],
    err: ['Balancearse o dar patadas.', 'Recorrido parcial sin bajar del todo.', 'Encoger los hombros.'],
    note: 'Si aún no haces repeticiones completas, usa jalón o asistencia y anótala en el campo “asistencia”.',
  }),
  ex({
    id: 'dominadas_supinas', name: 'Dominadas supinas (chin-up)', syn: ['chin-ups'],
    p: ['back', 'biceps'], s: ['forearms'], eq: ['pullup_bar'], pattern: 'pull_v', cat: 'compound',
    load: 'bodyweight', reps: 'moderate', lvl: 'returning', easier: 'jalon_supino',
    ins: ['Agarra la barra con las palmas hacia ti, a la anchura de los hombros.', 'Tira hasta que la barbilla supere la barra.', 'Baja despacio hasta estirar los brazos.'],
    err: ['Balanceo.', 'Bajar solo a medias.', 'Adelantar la cabeza para “llegar”.'],
  }),
  ex({
    id: 'jalon_pecho', name: 'Jalón al pecho (agarre ancho)', syn: ['lat pulldown', 'jalón polea alta'],
    p: ['back'], s: ['biceps', 'shoulders'], eq: ['cable'], pattern: 'pull_v', cat: 'compound',
    load: 'cable', reps: 'moderate', harder: 'dominadas',
    ins: ['Ajusta el rodillo para fijar los muslos.', 'Agarra la barra más ancho que los hombros.', 'Tira llevando la barra hacia la parte alta del pecho, pecho alto y codos hacia abajo.', 'Sube controlando hasta estirar los brazos.'],
    err: ['Llevar la barra por detrás de la nuca.', 'Echarse muy atrás para mover más peso.', 'Tirar solo con los brazos.'],
  }),
  ex({
    id: 'jalon_supino', name: 'Jalón con agarre supino', syn: ['jalón supino'],
    p: ['back'], s: ['biceps'], eq: ['cable'], pattern: 'pull_v', cat: 'compound',
    load: 'cable', reps: 'moderate', harder: 'dominadas_supinas',
    ins: ['Agarra la barra con las palmas hacia ti, a la anchura de los hombros.', 'Tira hacia la parte alta del pecho bajando los codos.', 'Vuelve despacio arriba.'],
    err: ['Balancear el tronco.', 'Recorrido corto.', 'Encoger hombros.'],
  }),
  ex({
    id: 'jalon_estrecho', name: 'Jalón con agarre estrecho neutro', syn: ['jalón con triángulo', 'v-bar pulldown'],
    p: ['back'], s: ['biceps'], eq: ['cable'], pattern: 'pull_v', cat: 'compound',
    load: 'cable', reps: 'moderate',
    ins: ['Usa el agarre en V (triángulo).', 'Tira hacia la parte alta del pecho, codos pegados.', 'Sube estirando los brazos con control.'],
    err: ['Inclinarse demasiado hacia atrás.', 'Tirar con impulso.'],
  }),
  ex({
    id: 'remo_polea_baja', name: 'Remo en polea baja sentado', syn: ['remo gironda', 'seated cable row'],
    p: ['back'], s: ['biceps', 'shoulders', 'lower_back'], eq: ['cable'], pattern: 'pull_h', cat: 'compound',
    load: 'cable', reps: 'moderate',
    ins: ['Siéntate con rodillas algo flexionadas y espalda neutra.', 'Tira del agarre hacia el abdomen llevando los codos atrás.', 'Junta los omóplatos al final y vuelve estirando los brazos.'],
    err: ['Balancear el tronco adelante y atrás.', 'Redondear la espalda.', 'Encoger los hombros.'],
  }),
  ex({
    id: 'remo_barra_supino', name: 'Remo con barra agarre supino', syn: ['remo inclinado supino'],
    p: ['back'], s: ['biceps', 'lower_back', 'hamstrings'], eq: ['barbell'], pattern: 'pull_h', cat: 'compound',
    load: 'barbell_total', reps: 'moderate', lvl: 'returning',
    ins: ['Inclina el tronco desde la cadera con la espalda neutra y rodillas flexionadas.', 'Agarra la barra con las palmas hacia delante.', 'Tira de la barra hacia el abdomen y bájala controlando.'],
    err: ['Redondear la espalda.', 'Levantar el tronco en cada repetición.', 'Usar impulso.'],
  }),
  ex({
    id: 'remo_mancuerna', name: 'Remo con mancuerna a una mano', syn: ['remo unilateral'],
    p: ['back'], s: ['biceps', 'shoulders'], eq: ['dumbbell', 'chair'], pattern: 'pull_h', cat: 'compound',
    load: 'dumbbell_each', uni: true, reps: 'moderate',
    note: 'La ilustración usa un banco; en casa sirve como apoyo una silla o sofá estables.',
    ins: ['Apoya una mano y la rodilla del mismo lado en el banco, espalda neutra.', 'Tira de la mancuerna hacia la cadera llevando el codo atrás.', 'Baja controlando hasta estirar el brazo. Repite con el otro lado.'],
    err: ['Girar el tronco para subir el peso.', 'Tirar hacia el hombro en vez de hacia la cadera.', 'Redondear la espalda.'],
  }),
  ex({
    id: 'remo_invertido', name: 'Remo invertido en barra', syn: ['australian pull-up', 'body row'],
    p: ['back'], s: ['biceps', 'shoulders', 'abs'], eq: ['low_bar'], pattern: 'pull_h', cat: 'compound',
    load: 'bodyweight', reps: 'moderate', harder: 'dominadas',
    ins: ['Colócate bajo una barra firme a la altura de la cadera y agárrala con los brazos estirados.', 'Con el cuerpo recto, tira del pecho hacia la barra.', 'Baja controlando. Cuanto más horizontal el cuerpo, más difícil.'],
    err: ['Dejar caer la cadera.', 'Barra o soporte inestable.', 'Recorrido corto.'],
  }),
  ex({
    id: 'pullover_polea', name: 'Pullover en polea alta (brazos rectos)', syn: ['straight-arm pulldown'],
    p: ['back'], s: ['triceps'], eq: ['cable'], pattern: 'lats_iso', cat: 'isolation',
    load: 'cable', reps: 'light',
    ins: ['De pie frente a la polea alta, brazos casi estirados.', 'Lleva la barra hacia los muslos moviendo solo los hombros.', 'Vuelve despacio arriba.'],
    err: ['Doblar los codos y convertirlo en un press.', 'Balancear el tronco.'],
  }),
  ex({
    id: 'pullover_mancuerna', name: 'Pullover con mancuerna', syn: ['pullover'],
    p: ['back', 'chest'], s: ['triceps'], eq: ['dumbbell', 'bench'], pattern: 'lats_iso', cat: 'isolation',
    load: 'dumbbell_each', reps: 'light', lvl: 'returning',
    ins: ['Túmbate con una mancuerna sujeta con ambas manos sobre el pecho.', 'Bájala por detrás de la cabeza con los codos ligeramente flexionados.', 'Vuelve a la posición inicial.'],
    err: ['Bajar más de lo que el hombro tolera.', 'Arquear mucho la espalda.'],
  }),
  ex({
    id: 'hiperextensiones', name: 'Hiperextensiones a 45°', syn: ['extensiones lumbares', 'back extension'],
    p: ['glutes', 'hamstrings'], s: ['lower_back'], eq: ['hyper_bench'], pattern: 'back_ext', cat: 'isolation',
    load: 'bodyweight', reps: 'light',
    ins: ['Ajusta el apoyo para que la cadera quede libre.', 'Baja el tronco flexionando la cadera con la espalda neutra.', 'Sube hasta alinear tronco y piernas, sin hiperextender.'],
    err: ['Subir más allá de la línea del cuerpo.', 'Hacerlo con rebote.'],
  }),
  ex({
    id: 'superman', name: 'Superman en el suelo', syn: ['supermans'],
    p: ['lower_back'], s: ['glutes'], eq: [], pattern: 'back_ext', cat: 'core',
    load: 'bodyweight', reps: 'light',
    ins: ['Túmbate boca abajo con los brazos estirados delante.', 'Eleva a la vez brazos, pecho y piernas unos centímetros.', 'Mantén 1–2 segundos y baja despacio.'],
    err: ['Forzar la extensión de cuello.', 'Subir con tirón brusco.'],
    note: 'Ejercicio de resistencia lumbar; no sustituye a un tirón con carga.',
  }),

  // ───────────── HOMBROS ─────────────
  ex({
    id: 'press_militar_barra_sentado', name: 'Press militar sentado con barra', syn: ['press de hombros con barra'],
    p: ['shoulders'], s: ['triceps'], eq: ['barbell', 'bench', 'rack'], pattern: 'push_v', cat: 'compound',
    load: 'barbell_total', reps: 'heavy', lvl: 'returning',
    ins: ['Siéntate con respaldo vertical y la barra a la altura de la clavícula.', 'Empuja la barra hacia arriba pasando cerca de la cara.', 'Baja controlando hasta la parte alta del pecho.'],
    err: ['Arquear mucho la zona lumbar.', 'Bajar la barra por detrás de la nuca.'],
  }),
  ex({
    id: 'press_hombro_mancuernas', name: 'Press de hombro con mancuernas sentado',
    p: ['shoulders'], s: ['triceps'], eq: ['dumbbell', 'bench'], pattern: 'push_v', cat: 'compound',
    load: 'dumbbell_each', reps: 'moderate',
    ins: ['Siéntate con la espalda apoyada y las mancuernas a la altura de los hombros.', 'Empuja hacia arriba hasta casi estirar los brazos.', 'Baja controlando.'],
    err: ['Arquear la espalda.', 'Chocar las mancuernas arriba con impulso.'],
  }),
  ex({
    id: 'press_hombro_maquina', name: 'Press de hombro en máquina',
    p: ['shoulders'], s: ['triceps'], eq: ['machine'], pattern: 'push_v', cat: 'compound',
    load: 'machine', reps: 'moderate',
    ins: ['Ajusta el asiento para que las asas queden a la altura de los hombros.', 'Empuja hacia arriba sin bloquear los codos de golpe.', 'Vuelve despacio.'],
    err: ['Asiento mal regulado.', 'Separar la espalda del respaldo.'],
  }),
  ex({
    id: 'press_arnold', name: 'Press Arnold',
    p: ['shoulders'], s: ['triceps'], eq: ['dumbbell', 'bench'], pattern: 'push_v', cat: 'compound',
    load: 'dumbbell_each', reps: 'moderate', lvl: 'returning',
    ins: ['Empieza con las mancuernas delante de la cara y las palmas hacia ti.', 'Mientras empujas hacia arriba, gira las palmas hacia delante.', 'Baja deshaciendo el giro.'],
    err: ['Hacer el giro con prisa.', 'Arquear la espalda.'],
  }),
  ex({
    id: 'press_hombro_unilateral', name: 'Press de hombro a una mano de pie',
    p: ['shoulders'], s: ['triceps', 'abs', 'obliques'], eq: ['dumbbell'], pattern: 'push_v', cat: 'compound',
    load: 'dumbbell_each', uni: true, reps: 'moderate',
    ins: ['De pie, una mancuerna a la altura del hombro.', 'Empuja hacia arriba sin inclinar el tronco.', 'Baja controlando y cambia de lado.'],
    err: ['Inclinarse hacia el lado contrario.', 'Arquear la espalda.'],
  }),
  ex({
    id: 'elevaciones_laterales', name: 'Elevaciones laterales con mancuernas', syn: ['laterales'],
    p: ['shoulders'], s: ['traps'], eq: ['dumbbell'], pattern: 'shoulder_lat', cat: 'isolation',
    load: 'dumbbell_each', reps: 'light',
    ins: ['De pie, mancuernas a los lados y codos ligeramente flexionados.', 'Eleva los brazos hacia los lados hasta la altura de los hombros.', 'Baja despacio.'],
    err: ['Balancear el cuerpo.', 'Subir los hombros hacia las orejas.', 'Usar más peso del que controlas.'],
  }),
  ex({
    id: 'pajaros_tumbado', name: 'Pájaros tumbado boca abajo', syn: ['elevaciones posteriores', 'reverse fly'],
    p: ['shoulders'], s: ['back', 'traps'], eq: ['dumbbell', 'bench'], pattern: 'shoulder_rear', cat: 'isolation',
    load: 'dumbbell_each', reps: 'light',
    ins: ['Túmbate boca abajo en un banco con las mancuernas colgando.', 'Abre los brazos hacia los lados con los codos ligeramente flexionados.', 'Baja controlando.'],
    err: ['Tirar con los brazos en lugar de abrir.', 'Levantar el pecho del banco.'],
  }),
  ex({
    id: 'aperturas_posteriores_banda', name: 'Aperturas posteriores con banda', syn: ['pájaros con banda'],
    p: ['shoulders'], s: ['back', 'traps'], eq: ['bands'], pattern: 'shoulder_rear', cat: 'isolation',
    load: 'band', reps: 'light',
    ins: ['Ancla la banda delante a la altura del pecho o sujétala con ambas manos.', 'Con los brazos casi estirados, sepáralos hacia atrás.', 'Vuelve despacio.'],
    err: ['Encoger los hombros.', 'Arquear la espalda.'],
  }),
  ex({
    id: 'encogimientos_mancuernas', name: 'Encogimientos de hombros con mancuernas', syn: ['shrugs'],
    p: ['traps'], s: ['forearms'], eq: ['dumbbell'], pattern: 'traps', cat: 'isolation',
    load: 'dumbbell_each', reps: 'light',
    ins: ['De pie con las mancuernas a los lados.', 'Eleva los hombros hacia las orejas sin doblar los codos.', 'Baja despacio.'],
    err: ['Girar los hombros en círculo.', 'Doblar los codos.'],
  }),

  // ───────────── BRAZOS ─────────────
  ex({
    id: 'curl_barra', name: 'Curl de bíceps con barra',
    p: ['biceps'], s: ['forearms'], eq: ['barbell'], pattern: 'biceps', cat: 'isolation',
    load: 'barbell_total', reps: 'light',
    ins: ['De pie, barra con agarre supino a la anchura de los hombros.', 'Flexiona los codos sin moverlos hacia delante.', 'Baja controlando hasta estirar los brazos.'],
    err: ['Balancear el tronco.', 'Adelantar los codos.'],
  }),
  ex({
    id: 'curl_barra_z', name: 'Curl con barra Z',
    p: ['biceps'], s: ['forearms'], eq: ['ez_bar'], pattern: 'biceps', cat: 'isolation',
    load: 'barbell_total', reps: 'light',
    ins: ['Agarra la barra Z por los tramos inclinados.', 'Sube flexionando los codos pegados al cuerpo.', 'Baja despacio.'],
    err: ['Impulso con la espalda.', 'Recorrido corto.'],
  }),
  ex({
    id: 'curl_mancuernas', name: 'Curl de bíceps con mancuernas',
    p: ['biceps'], s: ['forearms'], eq: ['dumbbell'], pattern: 'biceps', cat: 'isolation',
    load: 'dumbbell_each', reps: 'light',
    ins: ['De pie, mancuernas a los lados con las palmas hacia delante.', 'Flexiona los codos sin moverlos.', 'Baja hasta estirar los brazos.'],
    err: ['Balanceo.', 'Subir los codos.'],
  }),
  ex({
    id: 'curl_martillo', name: 'Curl martillo',
    p: ['biceps'], s: ['forearms'], eq: ['dumbbell'], pattern: 'biceps', cat: 'isolation',
    load: 'dumbbell_each', reps: 'light',
    ins: ['Mancuernas con las palmas mirándose (agarre neutro).', 'Flexiona los codos manteniendo el agarre.', 'Baja despacio.'],
    err: ['Impulso con el cuerpo.', 'Mover los codos.'],
  }),
  ex({
    id: 'curl_inclinado', name: 'Curl inclinado con mancuernas',
    p: ['biceps'], s: ['forearms'], eq: ['dumbbell', 'bench'], pattern: 'biceps', cat: 'isolation',
    load: 'dumbbell_each', reps: 'light', lvl: 'returning',
    ins: ['Siéntate en un banco inclinado con los brazos colgando.', 'Flexiona los codos sin adelantarlos.', 'Baja hasta estirar del todo.'],
    err: ['Despegar la espalda.', 'Usar demasiado peso (tensiona el hombro).'],
  }),
  ex({
    id: 'curl_polea', name: 'Curl de bíceps en polea baja',
    p: ['biceps'], s: ['forearms'], eq: ['cable'], pattern: 'biceps', cat: 'isolation',
    load: 'cable', reps: 'light',
    ins: ['De pie frente a la polea baja con barra recta.', 'Flexiona los codos pegados al cuerpo.', 'Baja controlando.'],
    err: ['Echarse atrás.', 'Mover los codos.'],
  }),
  ex({
    id: 'curl_banda', name: 'Curl de bíceps con banda',
    p: ['biceps'], s: ['forearms'], eq: ['bands'], pattern: 'biceps', cat: 'isolation',
    load: 'band', reps: 'light',
    ins: ['Pisa la banda y sujeta los extremos.', 'Flexiona los codos (alternando o a la vez).', 'Baja controlando la tensión.'],
    err: ['Soltar la tensión de golpe.', 'Balancear el tronco.'],
  }),
  ex({
    id: 'curl_concentrado', name: 'Curl concentrado',
    p: ['biceps'], s: [], eq: ['dumbbell', 'chair'], pattern: 'biceps', cat: 'isolation',
    load: 'dumbbell_each', uni: true, reps: 'light',
    ins: ['Sentado, apoya el codo en la cara interna del muslo.', 'Sube la mancuerna flexionando el codo.', 'Baja despacio. Cambia de brazo.'],
    err: ['Mover el hombro.', 'Bajar sin control.'],
  }),
  ex({
    id: 'extension_triceps_polea', name: 'Extensión de tríceps en polea (barra)', syn: ['jalón de tríceps', 'pushdown'],
    p: ['triceps'], s: [], eq: ['cable'], pattern: 'triceps', cat: 'isolation',
    load: 'cable', reps: 'light',
    ins: ['De pie frente a la polea alta, codos pegados al cuerpo.', 'Estira los codos llevando la barra hacia los muslos.', 'Vuelve hasta que los antebrazos queden algo por encima de la horizontal.'],
    err: ['Separar los codos del cuerpo.', 'Inclinarse para empujar con el peso del cuerpo.'],
  }),
  ex({
    id: 'extension_triceps_cuerda', name: 'Extensión de tríceps en polea con cuerda',
    p: ['triceps'], s: [], eq: ['cable'], pattern: 'triceps', cat: 'isolation',
    load: 'cable', reps: 'light',
    ins: ['Agarra la cuerda con los codos pegados.', 'Estira los codos y separa ligeramente los extremos abajo.', 'Vuelve despacio.'],
    err: ['Mover los hombros.', 'Recorrido corto.'],
  }),
  ex({
    id: 'press_frances', name: 'Press francés con barra', syn: ['rompecráneos', 'skull crusher'],
    p: ['triceps'], s: [], eq: ['barbell', 'bench'], pattern: 'triceps', cat: 'isolation',
    load: 'barbell_total', reps: 'light', lvl: 'returning',
    ins: ['Túmbate con la barra sobre el pecho y los brazos estirados.', 'Flexiona los codos llevando la barra hacia la frente.', 'Estira los codos sin mover los brazos.'],
    err: ['Abrir los codos.', 'Usar demasiado peso (molestias de codo).'],
  }),
  ex({
    id: 'extension_triceps_sobre_cabeza', name: 'Extensión de tríceps sobre la cabeza con mancuerna',
    p: ['triceps'], s: [], eq: ['dumbbell', 'bench'], pattern: 'triceps', cat: 'isolation',
    load: 'dumbbell_each', reps: 'light',
    ins: ['Sentado con respaldo, sujeta una mancuerna con ambas manos sobre la cabeza.', 'Baja la mancuerna detrás de la cabeza flexionando los codos.', 'Estira los codos sin arquear la espalda.'],
    err: ['Abrir mucho los codos.', 'Arquear la zona lumbar.'],
    note: 'Se registra el peso de la única mancuerna que sujetas.',
  }),
  ex({
    id: 'patada_triceps', name: 'Patada de tríceps con mancuerna', syn: ['kickback'],
    p: ['triceps'], s: [], eq: ['dumbbell', 'chair'], pattern: 'triceps', cat: 'isolation',
    load: 'dumbbell_each', uni: true, reps: 'light',
    ins: ['Apoya mano y rodilla en el banco con el tronco paralelo al suelo.', 'Con el codo pegado al cuerpo, estira el brazo hacia atrás.', 'Vuelve despacio. Cambia de lado.'],
    err: ['Bajar el codo.', 'Balancear el brazo.'],
  }),
  ex({
    id: 'fondos_entre_bancos', name: 'Fondos de tríceps entre bancos', syn: ['bench dips'],
    p: ['triceps'], s: ['chest', 'shoulders'], eq: ['chair'], pattern: 'triceps', cat: 'compound',
    load: 'bodyweight', reps: 'moderate',
    ins: ['Apoya las manos en un banco o silla estable detrás de ti y los talones en otro apoyo.', 'Baja flexionando los codos hasta unos 90°.', 'Empuja hasta estirar los brazos.'],
    err: ['Bajar demasiado (estrés en el hombro).', 'Apoyos inestables.', 'Abrir los codos.'],
    note: 'La ilustración muestra los pies elevados en un segundo banco; con los pies en el suelo es más fácil.',
  }),
  ex({
    id: 'flexiones_cerradas', name: 'Flexiones cerradas (tríceps)', syn: ['flexiones diamante'],
    p: ['triceps', 'chest'], s: ['shoulders'], eq: [], pattern: 'push_h', cat: 'compound',
    load: 'bodyweight', reps: 'light', lvl: 'returning', easier: 'flexiones',
    ins: ['Manos juntas bajo el pecho.', 'Baja con los codos pegados al cuerpo.', 'Empuja hasta estirar los brazos.'],
    err: ['Abrir los codos.', 'Hundir la cadera.'],
  }),
  ex({
    id: 'press_banca_cerrado', name: 'Press de banca agarre cerrado',
    p: ['triceps', 'chest'], s: ['shoulders'], eq: ['barbell', 'bench', 'rack'], pattern: 'push_h', cat: 'compound',
    load: 'barbell_total', reps: 'moderate', lvl: 'returning',
    ins: ['Agarre a la anchura de los hombros.', 'Baja la barra a la parte baja del pecho con los codos cerca del cuerpo.', 'Empuja hasta estirar.'],
    err: ['Agarre demasiado estrecho (muñecas).', 'Abrir los codos.'],
  }),

  // ───────────── PIERNAS ─────────────
  ex({
    id: 'sentadilla_barra', name: 'Sentadilla con barra', syn: ['sentadilla trasera', 'back squat'],
    p: ['quads', 'glutes'], s: ['adductors', 'lower_back', 'hamstrings'], eq: ['barbell', 'rack'], pattern: 'squat', cat: 'compound',
    load: 'barbell_total', reps: 'heavy', easier: 'sentadilla_banco_barra',
    ins: ['Barra apoyada en la parte alta de la espalda, pies a la anchura de los hombros o algo más.', 'Baja flexionando cadera y rodillas a la vez, rodillas en la dirección de los pies.', 'Desciende hasta donde mantengas la espalda neutra y los talones apoyados.', 'Sube empujando el suelo.'],
    err: ['Rodillas hacia dentro.', 'Levantar los talones.', 'Redondear la zona lumbar al final del descenso.', 'No usar los soportes de seguridad.'],
  }),
  ex({
    id: 'sentadilla_frontal', name: 'Sentadilla frontal con barra', syn: ['front squat'],
    p: ['quads'], s: ['glutes', 'abs', 'adductors'], eq: ['barbell', 'rack'], pattern: 'squat', cat: 'compound',
    load: 'barbell_total', reps: 'heavy', lvl: 'intermediate',
    ins: ['Barra sobre la parte delantera de los hombros con los codos altos.', 'Baja con el tronco erguido.', 'Sube manteniendo los codos arriba.'],
    err: ['Dejar caer los codos.', 'Inclinar el tronco en exceso.'],
  }),
  ex({
    id: 'sentadilla_mancuernas', name: 'Sentadilla con mancuernas',
    p: ['quads', 'glutes'], s: ['adductors', 'hamstrings'], eq: ['dumbbell'], pattern: 'squat', cat: 'compound',
    load: 'dumbbell_each', reps: 'moderate',
    ins: ['De pie con una mancuerna en cada mano a los lados.', 'Baja flexionando cadera y rodillas con el pecho alto.', 'Sube empujando el suelo.'],
    err: ['Rodillas hacia dentro.', 'Despegar los talones.'],
  }),
  ex({
    id: 'sentadilla_banco_mancuernas', name: 'Sentadilla a banco con mancuernas', syn: ['box squat con mancuernas'],
    p: ['quads', 'glutes'], s: ['adductors', 'hamstrings'], eq: ['dumbbell', 'chair'], pattern: 'squat', cat: 'compound',
    load: 'dumbbell_each', reps: 'moderate',
    ins: ['Colócate delante de un banco o silla estable con una mancuerna en cada mano.', 'Baja controlando hasta rozar el asiento sin dejarte caer.', 'Sube empujando el suelo.'],
    err: ['Sentarse del todo y relajar el tronco.', 'Rebotar en el banco.'],
    note: 'Buena opción para aprender la profundidad de la sentadilla.',
  }),
  ex({
    id: 'sentadilla_banco_barra', name: 'Sentadilla a banco con barra', syn: ['box squat'],
    p: ['quads', 'glutes'], s: ['adductors', 'hamstrings', 'lower_back'], eq: ['barbell', 'rack', 'bench'], pattern: 'squat', cat: 'compound',
    load: 'barbell_total', reps: 'heavy', harder: 'sentadilla_barra',
    ins: ['Banco detrás de ti a una altura que te permita llegar con la espalda neutra.', 'Baja controlando hasta rozar el banco.', 'Sube sin rebotar.'],
    err: ['Dejarse caer sobre el banco.', 'Perder la tensión del tronco.'],
  }),
  ex({
    id: 'sentadilla_multipower', name: 'Sentadilla en multipower', syn: ['sentadilla smith'],
    p: ['quads', 'glutes'], s: ['adductors'], eq: ['smith'], pattern: 'squat', cat: 'compound',
    load: 'machine', reps: 'moderate',
    ins: ['Barra en la parte alta de la espalda y pies ligeramente adelantados.', 'Desbloquea y baja controlando.', 'Sube y bloquea la barra al terminar.', 'Coloca los topes de seguridad.'],
    err: ['Pies demasiado atrás.', 'No usar topes.'],
  }),
  ex({
    id: 'sentadilla_sumo_mancuerna', name: 'Sentadilla sumo con mancuerna', syn: ['sentadilla plié'],
    p: ['quads', 'glutes', 'adductors'], s: ['hamstrings'], eq: ['dumbbell'], pattern: 'squat', cat: 'compound',
    load: 'dumbbell_each', reps: 'moderate',
    ins: ['Pies más abiertos que los hombros y puntas hacia fuera.', 'Sujeta una mancuerna con ambas manos entre las piernas.', 'Baja con el tronco erguido y rodillas hacia fuera; sube.'],
    err: ['Rodillas hacia dentro.', 'Inclinar el tronco hacia delante.'],
    note: 'Se anota el peso de la única mancuerna.',
  }),
  ex({
    id: 'sentadilla_banda', name: 'Sentadilla con banda elástica',
    p: ['quads', 'glutes'], s: ['adductors'], eq: ['bands'], pattern: 'squat', cat: 'compound',
    load: 'band', reps: 'moderate',
    ins: ['Pisa la banda con ambos pies y sujeta los extremos a la altura de los hombros.', 'Baja en sentadilla manteniendo el pecho alto.', 'Sube contra la resistencia de la banda.'],
    err: ['Banda mal pisada (puede escaparse).', 'Rodillas hacia dentro.'],
    note: 'La ilustración original está recortada a la altura de las rodillas en la posición baja.',
  }),
  ex({
    id: 'prensa', name: 'Prensa de piernas', syn: ['prensa 45°', 'leg press'],
    p: ['quads', 'glutes'], s: ['adductors', 'hamstrings'], eq: ['machine'], pattern: 'squat', cat: 'compound',
    load: 'machine', reps: 'moderate',
    ins: ['Espalda y cadera bien apoyadas; pies a la anchura de la cadera en la plataforma.', 'Quita los seguros y baja flexionando las rodillas sin despegar la pelvis.', 'Empuja sin bloquear las rodillas de golpe.'],
    err: ['Despegar la zona lumbar al bajar.', 'Bloquear las rodillas con fuerza.', 'Olvidar los seguros.'],
  }),
  ex({
    id: 'extension_cuadriceps', name: 'Extensión de cuádriceps en máquina', syn: ['leg extension'],
    p: ['quads'], s: [], eq: ['machine'], pattern: 'knee_ext', cat: 'isolation',
    load: 'machine', reps: 'light',
    ins: ['Ajusta el respaldo para alinear la rodilla con el eje de la máquina.', 'Estira las rodillas hasta casi extenderlas.', 'Baja despacio.'],
    err: ['Dar patadas con impulso.', 'Rodillo mal colocado.'],
  }),
  ex({
    id: 'curl_femoral_tumbado', name: 'Curl femoral tumbado', syn: ['leg curl'],
    p: ['hamstrings'], s: ['calves'], eq: ['machine'], pattern: 'knee_flex', cat: 'isolation',
    load: 'machine', reps: 'light',
    ins: ['Túmbate boca abajo con el rodillo por encima de los talones.', 'Flexiona las rodillas llevando los talones hacia los glúteos.', 'Baja controlando.'],
    err: ['Levantar la cadera.', 'Bajar de golpe.'],
  }),
  ex({
    id: 'curl_femoral_sentado', name: 'Curl femoral sentado',
    p: ['hamstrings'], s: ['calves'], eq: ['machine'], pattern: 'knee_flex', cat: 'isolation',
    load: 'machine', reps: 'light',
    ins: ['Siéntate con la rodilla alineada con el eje y el rodillo sobre los tobillos.', 'Flexiona las rodillas.', 'Vuelve despacio.'],
    err: ['Despegar la cadera del asiento.', 'Recorrido parcial.'],
  }),
  ex({
    id: 'peso_muerto_rumano', name: 'Peso muerto rumano con barra', syn: ['RDL'],
    p: ['hamstrings', 'glutes'], s: ['lower_back', 'forearms'], eq: ['barbell'], pattern: 'hinge', cat: 'compound',
    load: 'barbell_total', reps: 'moderate',
    ins: ['De pie con la barra en las manos y rodillas ligeramente flexionadas.', 'Lleva la cadera atrás bajando la barra pegada a las piernas con la espalda neutra.', 'Baja hasta notar tensión en los isquios (normalmente a media tibia) y sube extendiendo la cadera.'],
    err: ['Redondear la espalda.', 'Doblar mucho las rodillas (se convierte en sentadilla).', 'Separar la barra de las piernas.'],
  }),
  ex({
    id: 'peso_muerto_rumano_mancuernas', name: 'Peso muerto rumano con mancuernas',
    p: ['hamstrings', 'glutes'], s: ['lower_back', 'forearms'], eq: ['dumbbell'], pattern: 'hinge', cat: 'compound',
    load: 'dumbbell_each', reps: 'moderate',
    ins: ['Mancuernas delante de los muslos, rodillas ligeramente flexionadas.', 'Lleva la cadera atrás con la espalda neutra bajando las mancuernas cerca de las piernas.', 'Sube extendiendo la cadera.'],
    err: ['Redondear la espalda.', 'Bajar más de lo que permite tu movilidad.'],
  }),
  ex({
    id: 'zancadas_mancuernas', name: 'Zancadas con mancuernas', syn: ['lunges', 'estocadas'],
    p: ['quads', 'glutes'], s: ['hamstrings', 'adductors'], eq: ['dumbbell'], pattern: 'lunge', cat: 'compound',
    load: 'dumbbell_each', uni: true, reps: 'moderate',
    ins: ['De pie con una mancuerna en cada mano.', 'Da un paso al frente y baja hasta que la rodilla de atrás se acerque al suelo.', 'Empuja con la pierna delantera para volver. Alterna o completa un lado.'],
    err: ['Paso demasiado corto.', 'Rodilla delantera hacia dentro.', 'Golpear la rodilla trasera contra el suelo.'],
  }),
  ex({
    id: 'zancadas_barra', name: 'Zancadas con barra',
    p: ['quads', 'glutes'], s: ['hamstrings', 'adductors'], eq: ['barbell', 'rack'], pattern: 'lunge', cat: 'compound',
    load: 'barbell_total', uni: true, reps: 'moderate', lvl: 'intermediate',
    ins: ['Barra en la parte alta de la espalda.', 'Da un paso al frente y baja controlando.', 'Vuelve empujando con la pierna delantera.'],
    err: ['Perder el equilibrio por un paso estrecho.', 'Tronco muy inclinado.'],
  }),
  ex({
    id: 'zancadas_caminando', name: 'Zancadas caminando con mancuernas', syn: ['walking lunges'],
    p: ['quads', 'glutes'], s: ['hamstrings', 'adductors'], eq: ['dumbbell'], pattern: 'lunge', cat: 'compound',
    load: 'dumbbell_each', uni: true, reps: 'moderate', lvl: 'returning',
    ins: ['Avanza dando zancadas alternas con una mancuerna en cada mano.', 'Baja hasta que la rodilla de atrás se acerque al suelo.', 'Lleva el pie de atrás al frente para la siguiente zancada.'],
    err: ['Pasos cortos con el tronco inclinado.', 'Hacerlo en un espacio con obstáculos.'],
  }),
  ex({
    id: 'subidas_banco', name: 'Subidas al banco con mancuernas', syn: ['step-ups'],
    p: ['quads', 'glutes'], s: ['hamstrings'], eq: ['dumbbell', 'bench'], pattern: 'lunge', cat: 'compound',
    load: 'dumbbell_each', uni: true, reps: 'moderate',
    ins: ['Frente a un banco estable con una mancuerna en cada mano.', 'Sube apoyando todo el pie y empujando con la pierna de arriba.', 'Baja controlando. Completa un lado y cambia.'],
    err: ['Impulsarse con la pierna de abajo.', 'Banco demasiado alto o inestable.'],
  }),
  ex({
    id: 'puente_gluteo', name: 'Puente de glúteo en el suelo', syn: ['glute bridge', 'puente'],
    p: ['glutes'], s: ['hamstrings'], eq: [], pattern: 'glute', cat: 'isolation',
    load: 'bodyweight', reps: 'light',
    ins: ['Túmbate boca arriba con las rodillas flexionadas y los pies apoyados.', 'Eleva la cadera apretando los glúteos hasta alinear rodillas, cadera y hombros.', 'Baja despacio.'],
    err: ['Arquear la zona lumbar en lugar de extender la cadera.', 'Pies demasiado lejos.'],
    note: 'Se puede añadir carga sobre la cadera; anótala como lastre.',
  }),
  ex({
    id: 'patada_gluteo_polea', name: 'Patada de glúteo en polea',
    p: ['glutes'], s: ['hamstrings'], eq: ['cable'], pattern: 'glute', cat: 'isolation',
    load: 'cable', uni: true, reps: 'light',
    ins: ['Tobillera enganchada a la polea baja, manos apoyadas.', 'Lleva la pierna hacia atrás extendiendo la cadera.', 'Vuelve despacio. Cambia de lado.'],
    err: ['Arquear la zona lumbar.', 'Balancear la pierna.'],
  }),
  ex({
    id: 'abductores_maquina', name: 'Abducción de cadera en máquina', syn: ['abductores'],
    p: ['abductors'], s: ['glutes'], eq: ['machine'], pattern: 'hip_abd', cat: 'isolation',
    load: 'machine', reps: 'light',
    ins: ['Siéntate con la espalda apoyada y las almohadillas por fuera de las rodillas.', 'Separa las piernas.', 'Vuelve despacio.'],
    err: ['Usar impulso.', 'Despegar la espalda.'],
  }),
  ex({
    id: 'aductores_maquina', name: 'Aducción de cadera en máquina', syn: ['aductores'],
    p: ['adductors'], s: [], eq: ['machine'], pattern: 'hip_add', cat: 'isolation',
    load: 'machine', reps: 'light',
    ins: ['Almohadillas por dentro de las rodillas, apertura cómoda.', 'Junta las piernas.', 'Vuelve despacio.'],
    err: ['Empezar con más apertura de la tolerada.', 'Rebotes.'],
  }),
  ex({
    id: 'gemelos_maquina_pie', name: 'Elevación de talones de pie en máquina', syn: ['gemelos de pie'],
    p: ['calves'], s: [], eq: ['machine'], pattern: 'calves', cat: 'isolation',
    load: 'machine', reps: 'light',
    ins: ['Hombros bajo las almohadillas y punta de los pies en el escalón.', 'Baja los talones hasta un estiramiento cómodo.', 'Sube lo más alto posible y mantén un instante.'],
    err: ['Rebotar abajo.', 'Doblar las rodillas para ayudarte.'],
    note: 'El movimiento es pequeño: la animación muestra un cambio sutil.',
  }),
  ex({
    id: 'gemelos_sentado_maquina', name: 'Elevación de talones sentado en máquina', syn: ['sóleo'],
    p: ['calves'], s: [], eq: ['machine'], pattern: 'calves', cat: 'isolation',
    load: 'machine', reps: 'light',
    ins: ['Siéntate con el apoyo sobre los muslos y las puntas en la plataforma.', 'Baja los talones y sube al máximo.', 'Controla la bajada.'],
    err: ['Recorrido corto.', 'Rebotes.'],
    note: 'El movimiento es pequeño: la animación muestra un cambio sutil.',
  }),
  ex({
    id: 'gemelos_prensa', name: 'Gemelos en prensa',
    p: ['calves'], s: [], eq: ['machine'], pattern: 'calves', cat: 'isolation',
    load: 'machine', reps: 'light',
    ins: ['En la prensa, apoya solo la parte delantera de los pies en el borde inferior.', 'Con las rodillas casi estiradas, empuja con las puntas.', 'Vuelve despacio. Mantén los seguros accesibles.'],
    err: ['Doblar las rodillas.', 'Que los pies resbalen de la plataforma.'],
  }),
  ex({
    id: 'gemelos_banda', name: 'Elevación de talones con banda',
    p: ['calves'], s: [], eq: ['bands'], pattern: 'calves', cat: 'isolation',
    load: 'band', reps: 'light',
    ins: ['Pisa la banda con la parte delantera de los pies y sujeta los extremos.', 'Sube los talones lo máximo posible.', 'Baja despacio.'],
    err: ['Banda mal colocada.', 'Rebotes.'],
  }),

  // ───────────── CORE ─────────────
  ex({
    id: 'plancha_lateral', name: 'Plancha lateral', syn: ['side plank'],
    p: ['obliques', 'abs'], s: ['shoulders', 'glutes'], eq: [], pattern: 'core_stab', cat: 'core',
    load: 'time', uni: true, reps: 'light',
    ins: ['Túmbate de lado con el antebrazo bajo el hombro.', 'Eleva la cadera hasta alinear el cuerpo y mantén la posición.', 'Respira con normalidad y cambia de lado.'],
    err: ['Dejar caer la cadera.', 'Hombro lejos del codo.'],
    note: 'Ejercicio isométrico: las dos imágenes son casi iguales porque la posición se mantiene.',
  }),
  ex({
    id: 'encogimientos_abdominales', name: 'Encogimiento abdominal con piernas apoyadas', syn: ['crunch'],
    p: ['abs'], s: [], eq: ['chair'], pattern: 'core_flex', cat: 'core',
    load: 'bodyweight', reps: 'light',
    ins: ['Túmbate con las piernas apoyadas sobre un banco o silla.', 'Despega los hombros del suelo acercando las costillas a la pelvis.', 'Baja despacio sin tirar del cuello.'],
    err: ['Tirar de la cabeza con las manos.', 'Movimientos rápidos con impulso.'],
  }),
  ex({
    id: 'elevacion_cadera_rodillas', name: 'Encogimiento inverso con rodillas flexionadas', syn: ['reverse crunch'],
    p: ['abs'], s: [], eq: [], pattern: 'core_flex', cat: 'core',
    load: 'bodyweight', reps: 'light',
    ins: ['Túmbate boca arriba con las rodillas flexionadas.', 'Lleva las rodillas hacia el pecho despegando ligeramente la pelvis.', 'Baja controlando.'],
    err: ['Usar impulso de piernas.', 'Despegar la zona media de la espalda de golpe.'],
  }),
  ex({
    id: 'elevaciones_piernas', name: 'Elevaciones de piernas tumbado',
    p: ['abs'], s: [], eq: [], pattern: 'core_flex', cat: 'core',
    load: 'bodyweight', reps: 'light', lvl: 'returning', easier: 'elevacion_cadera_rodillas',
    ins: ['Túmbate boca arriba con las piernas estiradas.', 'Eleva las piernas sin arquear la zona lumbar.', 'Baja despacio sin tocar el suelo si lo controlas.'],
    err: ['Arquear la zona lumbar.', 'Bajar sin control.'],
  }),
  ex({
    id: 'crunch_polea', name: 'Crunch en polea alta',
    p: ['abs'], s: [], eq: ['cable'], pattern: 'core_flex', cat: 'core',
    load: 'cable', reps: 'light',
    ins: ['Con la cuerda junto a la cabeza, flexiona el tronco acercando costillas a pelvis.', 'Vuelve despacio sin perder la tensión.'],
    err: ['Tirar con los brazos.', 'Mover la cadera en lugar del tronco.'],
  }),
  ex({
    id: 'rueda_abdominal_barra', name: 'Rodamiento con barra de rodillas', syn: ['ab rollout'],
    p: ['abs'], s: ['back', 'shoulders'], eq: ['barbell'], pattern: 'core_stab', cat: 'core',
    load: 'bodyweight', reps: 'light', lvl: 'intermediate',
    ins: ['De rodillas, manos en la barra cargada con discos redondos.', 'Rueda hacia delante manteniendo el abdomen firme.', 'Vuelve sin arquear la zona lumbar.'],
    err: ['Hundir la zona lumbar.', 'Ir más lejos de lo que controlas.'],
  }),
  ex({
    id: 'bicicleta_abdominal', name: 'Bicicleta abdominal', syn: ['air bike'],
    p: ['abs', 'obliques'], s: [], eq: [], pattern: 'core_flex', cat: 'core',
    load: 'bodyweight', reps: 'light',
    ins: ['Túmbate boca arriba con las manos junto a la cabeza.', 'Acerca un codo a la rodilla contraria mientras estiras la otra pierna.', 'Alterna de forma controlada.'],
    err: ['Tirar del cuello.', 'Hacerlo deprisa sin control.'],
  }),

  // ───────────── SIN DEMOSTRACIÓN VERIFICADA (pendiente real, ver docs/ESTADO.md) ─────────────
  ex({
    id: 'sentadilla_peso_corporal', name: 'Sentadilla con peso corporal', syn: ['air squat', 'sentadilla libre'],
    p: ['quads', 'glutes'], s: ['adductors', 'hamstrings'], eq: [], pattern: 'squat', cat: 'compound',
    load: 'bodyweight', reps: 'light', demo: 'pendiente', harder: 'sentadilla_mancuernas',
    ins: ['Pies a la anchura de los hombros o algo más, puntas ligeramente hacia fuera.', 'Baja llevando la cadera atrás y abajo, rodillas en la dirección de los pies y brazos al frente para equilibrarte.', 'Desciende hasta donde mantengas la espalda neutra y los talones apoyados; sube empujando el suelo.'],
    err: ['Rodillas hacia dentro.', 'Levantar los talones.', 'Bajar deprisa sin control.'],
    note: 'Demostración pendiente: no hay ilustración con licencia verificada de esta variante exacta. Como referencia aproximada, la sentadilla con mancuernas muestra el mismo movimiento de piernas con carga.',
  }),
  ex({
    id: 'zancada_atras_peso_corporal', name: 'Zancada atrás con peso corporal', syn: ['reverse lunge'],
    p: ['quads', 'glutes'], s: ['hamstrings', 'adductors'], eq: [], pattern: 'lunge', cat: 'compound',
    load: 'bodyweight', uni: true, reps: 'light', demo: 'pendiente', harder: 'zancadas_mancuernas',
    ins: ['De pie, da un paso largo hacia atrás.', 'Baja hasta que la rodilla de atrás se acerque al suelo, con el tronco erguido.', 'Vuelve empujando con la pierna delantera. Alterna o completa un lado.'],
    err: ['Paso demasiado corto.', 'Rodilla delantera hacia dentro.'],
    note: 'Demostración pendiente: no hay ilustración con licencia verificada de esta variante exacta. Referencia aproximada: zancadas con mancuernas.',
  }),
  ex({
    id: 'plancha_frontal', name: 'Plancha frontal', syn: ['plank'],
    p: ['abs'], s: ['shoulders', 'glutes'], eq: [], pattern: 'core_stab', cat: 'core',
    load: 'time', reps: 'light', demo: 'pendiente',
    ins: ['Apoya antebrazos y puntas de los pies, codos bajo los hombros.', 'Mantén el cuerpo en línea recta apretando abdomen y glúteos.', 'Respira con normalidad.'],
    err: ['Dejar caer la cadera.', 'Elevar mucho los glúteos.', 'Aguantar la respiración.'],
    note: 'Demostración pendiente: no hay ilustración con licencia verificada de esta variante. La plancha lateral sí tiene demostración.',
  }),
  ex({
    id: 'flexiones_inclinadas', name: 'Flexiones inclinadas (manos elevadas)', syn: ['flexiones en banco', 'incline push-up'],
    p: ['chest'], s: ['triceps', 'shoulders', 'abs'], eq: ['chair'], pattern: 'push_h', cat: 'compound',
    load: 'bodyweight', reps: 'light', demo: 'pendiente', harder: 'flexiones',
    ins: ['Apoya las manos en un banco, mesa o encimera estable, algo más abiertas que los hombros.', 'Con el cuerpo recto, baja el pecho hacia el apoyo.', 'Empuja hasta estirar los brazos. Cuanto más alto el apoyo, más fácil.'],
    err: ['Apoyo que se mueve.', 'Cadera hundida.'],
    note: 'Demostración pendiente: no hay ilustración con licencia verificada de esta variante. Referencia aproximada: flexiones.',
  }),
]

/** Para ejercicios con demostración pendiente: ejercicio con demo que sirve de referencia APROXIMADA (otra variante). */
export const APPROX_REFERENCE: Record<string, string> = {
  sentadilla_peso_corporal: 'sentadilla_mancuernas',
  zancada_atras_peso_corporal: 'zancadas_mancuernas',
  plancha_frontal: 'plancha_lateral',
  flexiones_inclinadas: 'flexiones',
}

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

export const MUSCLE_LABEL: Record<MuscleId, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiosurales',
  glutes: 'Glúteos',
  calves: 'Gemelos',
  abs: 'Abdomen',
  traps: 'Trapecio',
  lower_back: 'Zona lumbar',
  forearms: 'Antebrazos',
  adductors: 'Aductores',
  abductors: 'Abductores',
  obliques: 'Oblicuos',
}

/** Grupos con objetivo de volumen semanal propio. */
export const MAJOR_MUSCLES: MuscleId[] = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'calves', 'abs']

export const EQUIPMENT_LABEL: Record<EquipmentId, string> = {
  barbell: 'Barra y discos',
  ez_bar: 'Barra Z',
  rack: 'Rack o soportes',
  dumbbell: 'Mancuernas',
  bench: 'Banco',
  machine: 'Máquinas guiadas',
  cable: 'Poleas',
  smith: 'Multipower',
  pullup_bar: 'Barra de dominadas',
  low_bar: 'Barra baja (remo invertido)',
  bands: 'Bandas elásticas',
  hyper_bench: 'Banco de hiperextensiones',
  chair: 'Silla o banco estable',
}

export const PATTERN_LABEL: Record<Exercise['pattern'], string> = {
  squat: 'Sentadilla (rodilla)',
  lunge: 'Zancada / unilateral',
  hinge: 'Bisagra de cadera',
  glute: 'Extensión de cadera',
  push_h: 'Empuje horizontal',
  push_v: 'Empuje vertical',
  pull_h: 'Tirón horizontal',
  pull_v: 'Tirón vertical',
  lats_iso: 'Dorsal (aislamiento)',
  chest_iso: 'Pecho (aislamiento)',
  shoulder_lat: 'Hombro lateral',
  shoulder_rear: 'Hombro posterior',
  traps: 'Trapecio',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  knee_ext: 'Extensión de rodilla',
  knee_flex: 'Flexión de rodilla',
  hip_abd: 'Abducción de cadera',
  hip_add: 'Aducción de cadera',
  calves: 'Gemelos',
  core_flex: 'Core (flexión)',
  core_stab: 'Core (estabilidad)',
  back_ext: 'Extensión de espalda',
}

export const LOAD_LABEL: Record<LoadType, { field: string; help: string }> = {
  barbell_total: { field: 'kg totales', help: 'Carga total: barra + discos. Ej.: barra de 20 kg con un disco de 10 kg a cada lado = 40 kg.' },
  dumbbell_each: { field: 'kg por mancuerna', help: 'Peso de UNA mancuerna. Si usas dos de 12 kg, anota 12 (no 24).' },
  machine: { field: 'kg de la máquina', help: 'La carga que marca la máquina. No es comparable con otras máquinas ni con barra.' },
  cable: { field: 'kg de la polea', help: 'La carga que marca la polea. Cambia entre poleas distintas.' },
  bodyweight: { field: 'lastre / asistencia', help: 'Solo peso corporal. Si añades peso, anótalo como lastre; si usas ayuda, como asistencia.' },
  assisted: { field: 'kg de asistencia', help: 'Kilos de ayuda de la máquina. MÁS asistencia = MÁS fácil. Progresar es reducirla.' },
  band: { field: 'banda', help: 'Anota la banda usada (color o nivel). Las bandas no tienen kg comparables.' },
  time: { field: 'segundos', help: 'Tiempo manteniendo la posición con buena técnica.' },
}

export const LEVEL_RANK: Record<Level, number> = { beginner: 0, returning: 1, intermediate: 2 }
