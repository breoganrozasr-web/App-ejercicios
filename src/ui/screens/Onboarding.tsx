import { ArrowLeft, HeartPulse, Info, ShieldCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useApp } from '../../App'
import { db } from '../../data/db'
import { saveProfile } from '../../data/repo'
import { GYM_EQUIPMENT, HOME_BASIC_EQUIPMENT, HOME_NONE_EQUIPMENT, OUTDOOR_EQUIPMENT, allExercises } from '../../domain/catalog'
import { EQUIPMENT_LABEL, MAJOR_MUSCLES, MUSCLE_LABEL } from '../../domain/catalog/exercises'
import { checkScope } from '../../domain/engine/scope'
import { defaultProfile } from '../../domain/profile'
import type { AgeBand, EquipmentId, FrequencyPref, Goal, Level, Location, MuscleId, Profile } from '../../domain/types'
import { WEEKDAY_NAME, WEEKDAY_SHORT, newId, toLocalDate } from '../../domain/util'
import { Chip, Choice, DecimalInput, Segmented, Toggle } from '../components/inputs'
import { useConfirm, useToast } from '../components/overlay'
import { back, go } from '../router'

const LEVELS: { v: Level; t: string; d: string }[] = [
  { v: 'beginner', t: 'Empiezo desde cero', d: 'Nunca he entrenado fuerza o casi nada' },
  { v: 'returning', t: 'Vuelvo tras una pausa', d: 'Entrené antes y lo dejé un tiempo' },
  { v: 'intermediate', t: 'Intermedio', d: 'Llevo meses entrenando con constancia' },
]
const GOALS: { v: Goal; t: string; d: string }[] = [
  { v: 'hypertrophy', t: 'Ganar músculo', d: 'Hipertrofia' },
  { v: 'strength', t: 'Ganar fuerza', d: 'Mover más carga en básicos' },
  { v: 'mixed', t: 'Ambas cosas', d: 'Fuerza + músculo' },
  { v: 'general', t: 'Condición física', d: 'Salud y forma general' },
]
const AGES: { v: AgeBand; t: string }[] = [
  { v: 'under14', t: 'Menos de 14' }, { v: '14to17', t: '14–17' }, { v: '18to39', t: '18–39' }, { v: '40to64', t: '40–64' }, { v: '65plus', t: '65 o más' },
]
const LOCS: { v: Location; t: string }[] = [
  { v: 'gym', t: 'Gimnasio' }, { v: 'home', t: 'Casa' }, { v: 'outdoor', t: 'Exterior / parque' },
]
const EQ_ORDER: EquipmentId[] = ['machine', 'cable', 'smith', 'barbell', 'ez_bar', 'rack', 'dumbbell', 'bench', 'pullup_bar', 'low_bar', 'bands', 'hyper_bench', 'chair', 'step']

function equipmentFor(locs: Location[], homeBasic: boolean): EquipmentId[] {
  const s = new Set<EquipmentId>()
  for (const l of locs) {
    const list = l === 'gym' ? GYM_EQUIPMENT : l === 'home' ? (homeBasic ? HOME_BASIC_EQUIPMENT : HOME_NONE_EQUIPMENT) : OUTDOOR_EQUIPMENT
    list.forEach((e) => s.add(e))
  }
  return EQ_ORDER.filter((e) => s.has(e))
}

export function OnboardingScreen({ editing = false }: { editing?: boolean }) {
  const { profile: existing } = useApp()
  const [p, setP] = useState<Profile>(() => structuredClone(existing ?? defaultProfile()))
  const [step, setStep] = useState(editing ? -1 : 0)
  const [bw, setBw] = useState<number | null>(null)
  const confirm = useConfirm()
  const toast = useToast()
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }))

  const save = async () => {
    const days = [...new Set(p.days)].sort((a, b) => a - b)
    await saveProfile({ ...p, days }, editing ? 'Perfil editado' : 'Perfil creado')
    if (bw !== null && bw > 0) await db().bodyweight.put({ id: newId('bw'), date: toLocalDate(), kg: bw })
    if (editing) {
      const regen = await confirm({ title: 'Perfil guardado', body: 'Tu rutina actual no cambia. ¿Quieres ver una propuesta nueva con estos datos? Podrás compararla antes de usarla.', confirm: 'Ver propuesta', cancel: 'Ahora no' })
      if (regen) go('rutinas/generar')
      else back('ajustes')
      toast('Perfil guardado')
    } else go('rutinas/generar', true)
  }

  const scope = checkScope(p)
  const steps: { title: string; body: ReactNode; valid: boolean }[] = [
    {
      title: 'Tu nivel y objetivo',
      valid: true,
      body: (
        <div className="stack">
          <span className="label">¿Cuál es tu punto de partida?</span>
          <div className="stack-sm">
            {LEVELS.map((l) => <Choice key={l.v} selected={p.level === l.v} onClick={() => set('level', l.v)} title={l.t} desc={l.d} />)}
          </div>
          <span className="label">¿Qué buscas principalmente?</span>
          <div className="choice-grid">
            {GOALS.map((g) => <Choice key={g.v} selected={p.goal === g.v} onClick={() => set('goal', g.v)} title={g.t} desc={g.d} />)}
          </div>
        </div>
      ),
    },
    {
      title: 'Días y tiempo',
      valid: p.days.length > 0,
      body: (
        <div className="stack">
          <span className="label" id="days-lbl">¿Qué días puedes entrenar?</span>
          <div className="weekdays" role="group" aria-labelledby="days-lbl">
            {WEEKDAY_SHORT.map((d, i) => (
              <Chip key={d} on={p.days.includes(i)} label={WEEKDAY_NAME[i]} onClick={() => set('days', p.days.includes(i) ? p.days.filter((x) => x !== i) : [...p.days, i])}>
                {d}
              </Chip>
            ))}
          </div>
          <p className="small muted">Marca los días en los que podrías ir. La app te dirá cuántos conviene usar según tu nivel; no tienes por qué entrenar todos.</p>
          <span className="label">Tiempo real por sesión</span>
          <Segmented label="Minutos por sesión" value={p.minutesPerSession} onChange={(v) => set('minutesPerSession', v)} options={[30, 45, 60, 75, 90].map((m) => ({ value: m, label: `${m}′` }))} />
          <p className="small muted">Incluye calentamiento y descansos.</p>
        </div>
      ),
    },
    {
      title: 'Dónde y con qué',
      valid: p.locations.length > 0,
      body: (
        <div className="stack">
          <span className="label">¿Dónde vas a entrenar?</span>
          <div className="row wrap">
            {LOCS.map((l) => (
              <Chip
                key={l.v}
                on={p.locations.includes(l.v)}
                onClick={() => {
                  const locs = p.locations.includes(l.v) ? p.locations.filter((x) => x !== l.v) : [...p.locations, l.v]
                  setP((x) => ({ ...x, locations: locs, equipment: equipmentFor(locs, false) }))
                }}
              >
                {l.t}
              </Chip>
            ))}
          </div>
          <span className="label">Material disponible</span>
          <p className="small muted">Lo hemos marcado según el lugar. Ajusta lo que tengas de verdad: la rutina solo usará esto.</p>
          <div className="row wrap">
            {EQ_ORDER.map((e) => (
              <Chip key={e} on={p.equipment.includes(e)} onClick={() => set('equipment', p.equipment.includes(e) ? p.equipment.filter((x) => x !== e) : [...p.equipment, e])}>
                {EQUIPMENT_LABEL[e]}
              </Chip>
            ))}
          </div>
          {p.equipment.length === 0 && <p className="small muted">Sin material: solo peso corporal en el suelo.</p>}
        </div>
      ),
    },
    {
      title: 'Edad y salud',
      valid: true,
      body: (
        <div className="stack">
          <span className="label">Franja de edad</span>
          <div className="row wrap">
            {AGES.map((a) => <Chip key={a.v} on={p.ageBand === a.v} onClick={() => set('ageBand', a.v)}>{a.t}</Chip>)}
          </div>
          <p className="small muted">Solo sirve para decidir qué recomendaciones aplican. No pedimos fecha de nacimiento.</p>
          <span className="label">¿Alguna de estas situaciones?</span>
          <div className="card flat tight stack-sm">
            <Toggle checked={p.limitations.painNow} onChange={(v) => set('limitations', { ...p.limitations, painNow: v })} label="Dolor persistente" desc="Articular o muscular, al moverte o al entrenar" />
            <Toggle checked={p.limitations.recentInjury} onChange={(v) => set('limitations', { ...p.limitations, recentInjury: v })} label="Lesión reciente o rehabilitación" desc="Incluye cirugía reciente" />
            <Toggle checked={p.limitations.cardioMetabolic} onChange={(v) => set('limitations', { ...p.limitations, cardioMetabolic: v })} label="Problema de corazón, metabólico o renal" desc="Diagnosticado, o síntomas como dolor en el pecho, mareos o falta de aire desproporcionada" />
            <Toggle checked={p.limitations.pregnancy} onChange={(v) => set('limitations', { ...p.limitations, pregnancy: v })} label="Embarazo o posparto reciente" />
            <Toggle checked={p.limitations.otherCondition} onChange={(v) => set('limitations', { ...p.limitations, otherCondition: v })} label="Otra condición médica que limite el ejercicio" />
          </div>
          {scope.kind === 'out' && (
            <div className="note warn">
              <HeartPulse aria-hidden />
              <div className="stack-sm">
                <span>{scope.message}</span>
                {scope.reasons.length > 0 && p.ageBand !== 'under14' && (
                  <Toggle checked={p.limitations.clearedByProfessional} onChange={(v) => set('limitations', { ...p.limitations, clearedByProfessional: v })} label="Un profesional sanitario me ha valorado y autorizado a entrenar" />
                )}
              </div>
            </div>
          )}
          {scope.kind === 'youth' && (
            <div className="note warn">
              <ShieldCheck aria-hidden />
              <span>{scope.message}</span>
            </div>
          )}
          <div className="field">
            <label htmlFor="bw">Peso corporal (opcional)</label>
            <DecimalInput id="bw" className="input" label="Peso corporal en kg" value={bw} onChange={setBw} placeholder="kg" max={400} />
            <span className="tiny muted">Solo para tu registro. No hace falta para usar la app.</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Preferencias (opcional)',
      valid: true,
      body: (
        <div className="stack">
          <span className="label">Frecuencia por grupo muscular</span>
          <Segmented<string>
            label="Frecuencia"
            value={String(p.frequency)}
            onChange={(v) => set('frequency', (v === 'auto' ? 'auto' : Number(v)) as FrequencyPref)}
            options={[{ value: 'auto', label: 'Auto' }, { value: '1', label: '1×' }, { value: '2', label: '2×' }, { value: '3', label: '3×' }]}
          />
          <p className="small muted">Cuántas veces por semana se trabaja cada músculo. No es lo mismo que los días que entrenas. “Auto” elige según tus días y nivel.</p>
          <span className="label">Músculos a priorizar</span>
          <div className="row wrap">
            {MAJOR_MUSCLES.map((m) => (
              <Chip key={m} on={p.priorityMuscles.includes(m)} onClick={() => set('priorityMuscles', p.priorityMuscles.includes(m) ? p.priorityMuscles.filter((x) => x !== m) : [...p.priorityMuscles, m as MuscleId])}>
                {MUSCLE_LABEL[m]}
              </Chip>
            ))}
          </div>
          <details className="more">
            <summary>Ejercicios que no quiero hacer ({p.excludedExercises.length})</summary>
            <div className="row wrap" style={{ paddingTop: 8 }}>
              {allExercises().filter((e) => e.demoStatus === 'verificada').sort((a, b) => a.name.localeCompare(b.name, 'es')).map((e) => (
                <Chip key={e.id} on={p.excludedExercises.includes(e.id)} onClick={() => set('excludedExercises', p.excludedExercises.includes(e.id) ? p.excludedExercises.filter((x) => x !== e.id) : [...p.excludedExercises, e.id])}>
                  {e.name}
                </Chip>
              ))}
            </div>
          </details>
          <div className="field">
            <label htmlFor="prefs">Notas o preferencias</label>
            <textarea id="prefs" className="input" value={p.preferences} maxLength={600} onChange={(e) => set('preferences', e.target.value)} placeholder="Ej.: prefiero máquinas; me gusta acabar con abdominales…" />
          </div>
        </div>
      ),
    },
  ]

  if (editing || step === -1) {
    return (
      <>
        <header className="topbar">
          <button className="icon-btn" onClick={() => back('ajustes')} aria-label="Volver"><ArrowLeft /></button>
          <span className="title grow">Tu perfil</span>
        </header>
        <main className="page">
          {steps.map((s) => (
            <section key={s.title} className="card stack">
              <h2>{s.title}</h2>
              {s.body}
            </section>
          ))}
          <button className="btn primary big block" disabled={!steps.every((s) => s.valid)} onClick={() => void save()}>
            Guardar perfil
          </button>
        </main>
      </>
    )
  }

  if (step === 0) {
    return (
      <main className="page" style={{ paddingTop: 'calc(var(--safe-top) + 32px)' }}>
        <div className="stack-lg">
          <div className="stack">
            <span className="badge accent" style={{ alignSelf: 'flex-start' }}>Forja</span>
            <h1>Tu cuaderno de entrenamiento</h1>
            <p className="muted">Rutina adecuada, cómo se hace cada ejercicio, qué hiciste la última vez y qué toca hoy. Sin cuentas, sin anuncios, sin pagar.</p>
          </div>
          <div className="note info">
            <Info aria-hidden />
            <span className="small">Tus datos se guardan solo en este navegador o app instalada, no en la nube ni en otros dispositivos. Desde Ajustes puedes hacer copias y llevártelas.</span>
          </div>
          <button className="btn primary big block" onClick={() => setStep(1)}>Empezar (2 minutos)</button>
          <p className="tiny muted center">Te preguntaremos nivel, días, material y salud para proponerte una rutina. Todo se puede cambiar después.</p>
        </div>
      </main>
    )
  }

  const cur = steps[step - 1]
  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Paso anterior"><ArrowLeft /></button>
        <div className="grow stack-sm">
          <span className="small muted">Paso {step} de {steps.length}</span>
          <div className="steps-dots" aria-hidden>{steps.map((_, i) => <span key={i} className={i < step ? 'on' : ''} />)}</div>
        </div>
      </header>
      <main className="page full">
        <h1>{cur.title}</h1>
        {cur.body}
        <div className="row" style={{ marginTop: 8 }}>
          {step < steps.length ? (
            <button className="btn primary big block" disabled={!cur.valid} onClick={() => setStep(step + 1)}>Continuar</button>
          ) : (
            <button className="btn primary big block" onClick={() => void save()}>Ver mi propuesta</button>
          )}
        </div>
      </main>
    </>
  )
}
