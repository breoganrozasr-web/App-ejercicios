import { ArrowLeft, BookOpen, ExternalLink, Library } from 'lucide-react'
import { useEffect } from 'react'
import { ARTICLES, SCOPE_NOTE, SOURCES, SOURCES_CHECKED, SOURCE_BY_CODE } from '../../domain/content/learn'
import { back, href } from '../router'

/** «Aprender»: artículos breves y biblioteca de fuentes (disponible sin conexión; los enlaces requieren internet). */
export function LearnScreen({ section, focus }: { section?: string; focus?: string | null }) {
  if (section === 'fuentes') return <SourcesScreen focus={focus ?? null} />
  const article = ARTICLES.find((a) => a.id === section)
  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => back('ajustes')} aria-label="Volver"><ArrowLeft /></button>
        <span className="title grow">{article ? article.title : 'Aprender'}</span>
      </header>
      <main className="page">
        {article ? (
          <section className="card stack">
            <h1 style={{ fontSize: '1.5rem' }}>{article.title}</h1>
            <p>{article.body}</p>
            <SourceChips codes={article.sources} />
            <a className="btn ghost small" style={{ alignSelf: 'flex-start' }} href={href('aprender')}>Todos los artículos</a>
          </section>
        ) : (
          <>
            <p className="small muted">Textos breves para entender cómo funciona Forja. Funcionan sin conexión.</p>
            <div className="card flat list" style={{ padding: '0 12px' }}>
              {ARTICLES.map((a) => (
                <a key={a.id} className="list-item" href={href(`aprender/${a.id}`)}>
                  <BookOpen size={18} aria-hidden />
                  <span className="grow stack-sm" style={{ gap: 2 }}>
                    <span style={{ fontWeight: 650 }}>{a.title}</span>
                    <span className="tiny muted">{a.body.slice(0, 90)}…</span>
                  </span>
                </a>
              ))}
            </div>
            <a className="btn soft" href={href('aprender/fuentes')}><Library size={18} /> Biblioteca de fuentes</a>
          </>
        )}
        <p className="tiny muted">{SCOPE_NOTE}</p>
      </main>
    </>
  )
}

export function SourceChips({ codes }: { codes: string[] }) {
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      <span className="tiny muted">Fuentes:</span>
      {codes.map((c) => (
        <a key={c} className="badge" href={href(`aprender/fuentes?f=${c}`)} title={SOURCE_BY_CODE[c]?.title}>{c === 'FORJA' ? 'Decisión práctica de Forja' : c}</a>
      ))}
    </div>
  )
}

function SourcesScreen({ focus }: { focus: string | null }) {
  useEffect(() => {
    if (!focus) return
    const t = window.setTimeout(() => document.getElementById(`src-${focus}`)?.scrollIntoView({ block: 'start' }), 120)
    return () => window.clearTimeout(t)
  }, [focus])
  const groups: { title: string; kind: 'cientifica' | 'tecnica' | 'forja' }[] = [
    { title: 'Fuentes científicas (E1–E14)', kind: 'cientifica' },
    { title: 'Fuentes técnicas de las fichas (T1–T9)', kind: 'tecnica' },
  ]
  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => back('aprender')} aria-label="Volver"><ArrowLeft /></button>
        <span className="title grow">Biblioteca de fuentes</span>
      </header>
      <main className="page">
        <p className="small">Fecha de consulta: <strong>{SOURCES_CHECKED}</strong>. Cada ficha indica el tipo de fuente y el <strong>alcance real de la consulta</strong> (resumen, fragmentos o texto completo). Forja no ha hecho una investigación científica propia: estas fuentes justifican principios generales, no validan su algoritmo.</p>
        {groups.map((g) => (
          <section key={g.kind} className="stack-sm">
            <h2 className="section-title">{g.title}</h2>
            {SOURCES.filter((s) => s.kind === g.kind).map((s) => (
              <article key={s.code} id={`src-${s.code}`} className={`card stack-sm ${focus === s.code ? 'accent-border' : ''}`} style={{ scrollMarginTop: 70 }}>
                <div className="row"><span className="badge accent">{s.code}</span><strong className="grow small">{s.title}</strong></div>
                <span className="tiny muted">{s.scope}</span>
                {s.synthesis && <p className="small" style={{ margin: 0 }}><strong>Síntesis:</strong> {s.synthesis}</p>}
                {s.decision && <p className="small" style={{ margin: 0 }}><strong>Decisión en Forja:</strong> {s.decision}</p>}
                <div className="row wrap" style={{ gap: 6 }}>
                  {s.urls.map((u) => <a key={u} className="btn small ghost" href={u} target="_blank" rel="noreferrer"><ExternalLink size={14} /> {u.includes('youtube') ? 'Vídeo' : u.includes('doi.org') ? 'DOI' : 'Abrir'}</a>)}
                </div>
              </article>
            ))}
          </section>
        ))}
        <p className="tiny muted">El registro completo, con las fuentes anteriores de Forja (versiones 1.0 y 1.1) y su nivel de verificación, está en docs/EVIDENCIA.md del proyecto. Los enlaces externos requieren conexión.</p>
        <p className="tiny muted">{SCOPE_NOTE}</p>
      </main>
    </>
  )
}
