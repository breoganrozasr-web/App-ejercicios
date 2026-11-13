# Evidencia científica y decisiones del motor de rutinas

Fecha de consulta de todas las fuentes: **13 de noviembre de 2026**. Versión del motor: **1.0.0** (`src/domain/engine/params.ts`).

## Cómo se ha hecho y qué límites tiene (léelo primero)

- La red de esta sesión de desarrollo **bloqueaba** pubmed.ncbi.nlm.nih.gov, pmc.ncbi.nlm.nih.gov y otras webs de revistas. **No se pudo leer ningún texto completo.** Toda la información procede de búsquedas web: resúmenes (abstracts) y páginas de editorial/repositorio tal como los devuelve el buscador, y en algunos casos fuentes secundarias.
- Cada fuente lleva un nivel de verificación:
  - **[A]** abstract o página de la editorial/repositorio (lo más fiable que se pudo obtener; no equivale a texto completo).
  - **[S]** solo fuente secundaria (nota de prensa, blog que cita). No verificado en la fuente primaria.
  - **[M]** solo metadatos (autores, revista, año, DOI).
- Los DOI se incluyen solo cuando aparecieron de forma consistente.
- **Pendiente real:** contrastar este documento con los textos completos cuando haya acceso (ver «Cómo verificar» al final).
- Los valores por defecto de la app son **decisiones prácticas de programación**: puntos de partida razonables y compatibles con la evidencia, **no** fórmulas óptimas para todo el mundo. La app no promete resultados.

## 1. Registro de fuentes

### Fuentes obligatorias

| # | Cita | URL / DOI | Tipo y población | Hallazgo relevante | Limitaciones / certeza | Reglas que sustenta |
|---|---|---|---|---|---|---|
| A | Currier BS, D'Souza AC, Fiatarone Singh MA, et al. *ACSM Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews.* Med Sci Sports Exerc. 2026;58(4):851–872 | https://pubmed.ncbi.nlm.nih.gov/41843416/ · https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/ · doi:10.1249/MSS.0000000000003897 | Revisión de revisiones (137 revisiones sistemáticas, >30.000 adultos sanos). Revisada por pares, no preprint. | [A] Fuerza: cargas ≥80 % 1RM, rango completo, 2–3 series, ejercicio al inicio de la sesión, ≥2 sesiones/semana. Hipertrofia: asociada a volúmenes mayores (≥10 series/semana) y sobrecarga excéntrica. Fallo, tipo de equipo, tiempo bajo tensión y periodización **no** cambiaron los resultados de forma consistente. [S] Mensaje de “constancia” y trabajar grupos principales ≥2/semana. | Hereda sesgos de las revisiones incluidas. El “≥10 series” es una **asociación**, no un mínimo. No se verificaron detalles sobre descansos, principiantes ni certeza GRADE. | R1, R3, R5, R6, R9, R17 |
| B | Currier BS, McLeod JC, Banfield L, et al. *Resistance training prescription for muscle strength and hypertrophy in healthy adults: a systematic review and Bayesian network meta-analysis.* Br J Sports Med. 2023;57(18):1211–1220 | https://pubmed.ncbi.nlm.nih.gov/37414459/ · doi:10.1136/bjsports-2023-106807 | RS + metaanálisis en red bayesiano. Fuerza: 178 estudios (n=5097); hipertrofia: 119 (n=3364). Adultos sanos, mayoría no entrenados. | [A] Todas las prescripciones superan al control. Fuerza: mejor con cargas >80 % 1RM (mejor clasificada: carga alta, varias series, 3/semana). Hipertrofia: todas comparables (mejor clasificada: carga alta, varias series, 2/semana). | SUCRA no indica magnitud; comparaciones indirectas; estudios cortos. | R1, R5, R10 |
| C | Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC. *The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains.* Sports Med. Online 4-dic-2025 (preprint previo en SportRxiv) | https://pubmed.ncbi.nlm.nih.gov/41343037/ · doi:10.1007/s40279-025-02344-w | Metarregresiones bayesianas, 67 estudios, 2058 participantes. Revisado por pares. | [A] Series directas = 1; indirectas = 0,5 (método “fraccional”, el que mejor predijo). Más volumen → más ganancia con **rendimientos decrecientes** (más marcados en fuerza). Frecuencia: efecto sobre hipertrofia compatible con despreciable; positivo para fuerza. | Clasificación directa/indirecta a posteriori; pocos datos a volúmenes altos; **no se verificaron** los umbrales numéricos citados en prensa (~31 series, etc.). | R1, R3, R4 |
| D | Robinson ZP, Pelland JC, Remmert JF, et al. *Exploring the Dose–Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions.* Sports Med. 2024;54(9):2209–2231 | https://pubmed.ncbi.nlm.nih.gov/38970765/ · doi:10.1007/s40279-024-02069-2 | Metarregresiones exploratorias. | [A] Fuerza similar en un rango amplio de RIR. Hipertrofia aumenta algo al acercarse al fallo (efecto modesto, probablemente no lineal). | El RIR se **estimó** a partir de las descripciones, no se midió. Ajuste modesto. | R6 |
| E | Singer A, Wolf M, Generoso L, et al. *Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy.* Front Sports Act Living. 2024;6:1429789 | https://pubmed.ncbi.nlm.nih.gov/39205815/ · doi:10.3389/fspor.2024.1429789 | RS + MA bayesiano; 9 estudios, 19 mediciones; adultos sanos. | [A] Pequeño beneficio hipertrófico con descansos >60 s; sin diferencias apreciables por encima de 90 s. | Pocos estudios, intervalos que cruzan 0, heterogeneidad. **Certeza baja.** | R7 |
| F | Refalo MC, Helms ER, Robinson ZP, Hamilton DL, Fyfe JJ. *Similar muscle hypertrophy following eight weeks of resistance training to momentary muscular failure or with repetitions-in-reserve in resistance-trained individuals.* J Sports Sci. 2024;42(1):85–101 | https://pubmed.ncbi.nlm.nih.gov/38393985/ · doi:10.1080/02640414.2024.2321021 | Ensayo de 8 semanas en personas entrenadas (cuádriceps). | [A] Terminar con 1–2 RIR puede bastar para una hipertrofia similar al fallo. | Muestra pequeña, solo cuádriceps, 8 semanas. | R6 |

### Fuentes ampliadas

| # | Cita | URL / DOI | Hallazgo relevante | Limitaciones | Reglas |
|---|---|---|---|---|---|
| G1 | Faigenbaum AD, Kraemer WJ, Blimkie CJR, et al. *Youth Resistance Training: Updated Position Statement Paper From the NSCA.* J Strength Cond Res. 2009;23(Suppl 5):S60–S79 | doi:10.1519/JSC.0b013e31819df407 | [A] Seguro y eficaz con programa bien diseñado y **supervisado por adulto cualificado**; técnica primero; 2–3 sesiones/semana no consecutivas; progresión de carga del 5–10 %; sin llegar al fallo en trabajo de potencia. | Posición de expertos de 2009. No se verificó su postura sobre 1RM. | R14 |
| G2 | Lloyd RS, Faigenbaum AD, Stone MH, et al. *Position statement on youth resistance training: the 2014 International Consensus.* Br J Sports Med. 2014;48(7):498–505 | doi:10.1136/bjsports-2013-092952 | [M/S] Supervisión cualificada; competencia técnica antes que carga. | No se pudo leer el texto. | R14 |
| G3 | Bull FC, Al-Ansari SS, Biddle S, et al. *WHO 2020 guidelines on physical activity and sedentary behaviour.* Br J Sports Med. 2020;54(24):1451–1462 | doi:10.1136/bjsports-2020-102955 | [A] 5–17 años: ≥60 min/día de actividad; fortalecimiento ≥3 días/semana dentro de la actividad total. | Guía general de actividad, no de programación. | R14 |
| G4 | Stricker PR, Faigenbaum AD, McCambridge TM. *Resistance Training for Children and Adolescents.* Pediatrics. 2020;145(6):e20201011 | doi:10.1542/peds.2020-1011 | [A/S] Con supervisión y técnica correcta, lesiones poco frecuentes. | No se verificó su postura sobre 1RM. | R14 |
| H1 | Ratamess NA, et al. *ACSM position stand. Progression models in resistance training for healthy adults.* Med Sci Sports Exerc. 2009;41(3):687–708 | doi:10.1249/MSS.0b013e3181915670 | [A] Principiantes 8–12 RM; hipertrofia 1–12 RM con énfasis 6–12; 2–3 d/semana principiantes; **subir 2–10 % al superar el objetivo en 1–2 rep**. | Sustituida en parte por ACSM 2026; mucha opinión experta. | R2, R10 |
| H2 | Krieger JW. *Single versus multiple sets…: a meta-regression.* J Strength Cond Res. 2009;23:1890–1901 · *…for muscle hypertrophy: a meta-analysis.* 2010;24:1150–1159 | — | [A] 2–3 series por ejercicio > 1 serie (fuerza e hipertrofia); 2–3 vs 4–6 sin diferencia clara. | Razones de tamaño de efecto, no % de crecimiento. | R3 |
| H3 | Schoenfeld BJ, Ogborn D, Krieger JW. *Dose-response relationship between weekly resistance training volume and increases in muscle mass.* J Sports Sci. 2017;35(11):1073–1082 | doi:10.1080/02640414.2016.1210197 | [A] Relación dosis-respuesta; [S] <5 series/semana ya producen ganancia. | Pocos datos a volumen alto. | R3 |
| H4 | Androulakis-Korakakis P, Fisher JP, Steele J. *The Minimum Effective Training Dose Required to Increase 1RM Strength in Resistance-Trained Men.* Sports Med. 2020;50:751–765 | doi:10.1007/s40279-019-01236-0 | [A] Una serie 1–3 veces/semana basta para ganancias significativas de 1RM (subóptimas). | Solo hombres, 6 estudios. | R3 |
| H5 | Iversen VM, et al. *No Time to Lift? Designing Time-Efficient Training Programs for Strength and Hypertrophy.* Sports Med. 2021;51(10):2079–2095 | doi:10.1007/s40279-021-01490-1 | [A] ≥4 series semanales por grupo con 6–15 RM; multiarticulares; máquinas eficientes en tiempo para principiantes; superseries ahorran tiempo. | Revisión narrativa. | R3, R5, ajustes de tiempo |
| H6 | Remmert JF, et al. *Is There Too Much of a Good Thing? Meta-Regressions of the Effect of Per-Session Volume…* SportRxiv #537 (2025) | **Preprint** | [A del preprint] Rendimientos decrecientes por sesión; [S] ~11 series fraccionales/sesión. | **Preprint**, evidencia débil. | R4 |
| — | Schoenfeld BJ, Grgic J, Krieger J. *How many times per week should a muscle be trained to maximize muscle hypertrophy?* J Sports Sci. 2019;37(11):1286–1295 | — | [S] Con volumen igualado, la frecuencia no cambia la hipertrofia. | Críticas a la definición de volumen. | R1 |
| — | Grgic J, et al. *Effect of Resistance Training Frequency on Gains in Muscular Strength.* Sports Med. 2018;48(5):1207–1220 | — | [A] Sin efecto de la frecuencia sobre fuerza con volumen igualado. | — | R1 |
| — | Grgic J, Schoenfeld BJ, Orazem J, Sabol F. *Effects of resistance training performed to repetition failure or non-failure…* J Sport Health Sci. 2022;11(2):202–211 | doi:10.1016/j.jshs.2021.01.007 | [A] Sin diferencias significativas fallo vs no-fallo en fuerza ni hipertrofia; ligera ventaja de hipertrofia al fallo en entrenados. | — | R6 |
| — | Grgic J, et al. *Effects of Rest Interval Duration… on Measures of Muscular Strength.* Sports Med. 2018;48(1):137–151 · Schoenfeld BJ, et al. *Longer interset rest periods…* J Strength Cond Res. 2016;30(7):1805–1812 | doi:10.1519/JSC.0000000000001272 (2016) | [A] Entrenados: >2 min maximiza fuerza; no entrenados: 60–120 s bastan. 3 min > 1 min en entrenados. | Muestras pequeñas. | R7 |
| I1 | Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. *Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training.* J Strength Cond Res. 2017;31(12):3508–3523 | doi:10.1519/JSC.0000000000002200 | [A] Hipertrofia similar con carga baja y alta (al fallo); 1RM mejor con carga alta. | Todas las series al fallo. | R5 |
| I2 | Lopez P, et al. *Resistance Training Load Effects on Muscle Hypertrophy and Strength Gain: Systematic Review and Network Meta-analysis.* Med Sci Sports Exerc. 2021;53(6):1206–1216 | DOI no verificado | [A] Sin diferencias de hipertrofia entre cargas bajas/moderadas/altas (al fallo); fuerza: alta y moderada > baja. | — | R5 |
| I3–I6 | Kikuchi & Nakazato 2017 (J Exerc Sci Fit 15(1):37–42); Calatayud et al. 2015 (J Strength Cond Res 29(1):246–253); Kotarsky et al. 2018 (J Strength Cond Res 32(3):651–659); Thomas et al. 2017 (Isokinetics Exerc Sci 25(3):215–222) | — | [A] Flexiones (progresivas o con banda) pueden igualar al press de banca en ganancias de fuerza/hipertrofia a cargas equivalentes; la calistenia progresiva mejora la fuerza. | Muestras pequeñas, cortas, mayormente hombres jóvenes. | R15 |
| J1 | Zourdos MC, et al. *Novel Resistance Training–Specific RPE Scale Measuring Repetitions in Reserve.* J Strength Cond Res. 2016;30(1):267–275 | — | [A] Novatos subestiman el esfuerzo cerca del máximo. | n=29. | R6, explicación de RIR |
| J2 | Halperin I, et al. *Accuracy in Predicting Repetitions to Task Failure in Resistance Exercise.* Sports Med. 2022;52:377–390 | doi:10.1007/s40279-021-01559-x | [A] Se subestiman las repeticiones hasta el fallo en ~1 rep; el nivel de entrenamiento no moderó la precisión. | Alta heterogeneidad. | R6 |
| J3 | Steele J, et al. *Ability to predict repetitions to momentary failure is not perfectly accurate…* PeerJ. 2017;5:e4105 | — | [A] Error de ~2,6–3,4 rep; mejora con la experiencia. | — | R6 |
| K1 | LeSuer DA, et al. *The accuracy of prediction equations for estimating 1-RM performance…* J Strength Cond Res. 1997;11(4):211–213 | — | [A] Correlaciones altas pero errores sistemáticos; todas las ecuaciones subestimaron el peso muerto. | Universitarios no entrenados. | R11 |
| K2 | Reynolds JM, Gordon TJ, Robergs RA. *Prediction of one repetition maximum strength from multiple repetition maximum testing and anthropometry.* J Strength Cond Res. 2006;20(3):584–592 | — | [A/S] 5RM predice mejor que 10RM y 20RM. | — | R11 |
| L1 | Bell L, et al. *Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach.* Sports Med Open. 2023;9:87 | doi:10.1186/s40798-023-00633-0 | [A] Descarga = periodo de menor estrés; lo habitual es reducir volumen. | Opinión de expertos. | R12 |
| L2 | Coleman M, et al. *Gaining more from doing less? The effects of a one-week deload period…* PeerJ. 2024;12:e16777 | — | [A] Una semana sin entrenar a mitad de programa no mejoró la hipertrofia y empeoró algo la fuerza del tren inferior. | — | R12 |
| L3 | Ogasawara R, et al. *Comparison of muscle hypertrophy following 6-month of continuous and periodic strength training.* Eur J Appl Physiol. 2013 | doi:10.1007/s00421-012-2511-9 | [A] Pausas de 3 semanas: lo perdido se recupera rápido; resultado final similar. | n=14, no entrenados. | R12 |
| L4 | Encarnação IGA, et al. *Effects of Detraining on Muscle Strength and Hypertrophy Induced by Resistance Training.* Muscles. 2022;1(1):1 | doi:10.3390/muscles1010001 | [A] El desentrenamiento reduce adaptaciones pero no se pierden del todo. | Evidencia insuficiente sobre plazos. | R12 |
| M1 | Riebe D, et al. *Updating ACSM's Recommendations for Exercise Preparticipation Health Screening.* Med Sci Sports Exerc. 2015;47(11):2473–2479 | — | [A] Cribado según actividad actual, enfermedad cardiovascular/metabólica/renal conocida o síntomas, e intensidad deseada. | No se verificaron los criterios exactos. | R13 |
| M2 | PAR-Q+ (PAR-Q+ Collaboration; Warburton et al. 2011) | — | [A] Preguntas generales sobre corazón, dolor torácico, mareos, enfermedad crónica, medicación, problemas articulares, indicación médica. Un “sí” → seguimiento o consulta. | La app **no copia** el formulario; usa preguntas propias inspiradas en esos criterios. | R13 |
| M3 | Mottola MF, et al. *2019 Canadian guideline for physical activity throughout pregnancy.* Br J Sports Med. 2018;52(21):1339–1346 | — | [A/S] Sin contraindicaciones, actividad recomendada incluyendo fuerza; contraindicaciones requieren consulta. | Listas de contraindicaciones difieren entre fuentes. | R13 |
| M4 | ACOG Committee Opinion n.º 804 (2020). *Physical Activity and Exercise During Pregnancy and the Postpartum Period.* | — | [S] Evaluación clínica antes de empezar un programa. | No verificado en primaria. | R13 |
| — | Fisher J, et al. *The Role of Supervision in Resistance Training; an Exploratory Systematic Review and Meta-Analysis.* Int J Strength Cond. 2022;2(1) | doi:10.47206/ijsc.v2i1.101 | [A] Supervisión: efecto pequeño-moderado sobre fuerza. | Sin datos de adherencia. | R14, avisos de técnica |

## 2. Síntesis

### 2.1 Conclusiones relativamente consistentes
1. Cualquier entrenamiento de fuerza progresivo supera a no entrenar; lo que más importa es empezar y mantenerse (A, B).
2. **No hay una zona mágica de 8–12 repeticiones** para la hipertrofia: resultados similares en un rango amplio de cargas si las series se acercan al fallo (I1, I2).
3. **Las cargas altas son mejores para la fuerza máxima** (1RM dinámico) (A, B, I1, I2).
4. **Más volumen da más resultado con rendimientos decrecientes**; volúmenes bajos ya producen ganancias, así que **10 series no son un mínimo** (C, H2–H5).
5. Con el volumen igualado, **frecuencia 3 no es siempre superior a 2 o 1** para hipertrofia (C, Schoenfeld 2019); para fuerza hay una señal positiva modesta.
6. **Cerca del fallo ≠ al fallo**; el fallo no es necesario (F, D, Grgic 2022, A).
7. La estimación del RIR es imperfecta: la gente suele creerse más cerca del fallo de lo que está (J1–J3).
8. La estimación del 1RM empeora con más repeticiones (K1, K2).
9. Los jóvenes pueden entrenar fuerza con **supervisión cualificada, técnica primero y progresión gradual** (G1–G4).
10. La calistenia progresiva puede igualar al press de banca a cargas equivalentes (I3–I6).

### 2.2 Evidencia limitada o incierta
- Umbrales exactos donde el volumen deja de aportar (preprints y prensa, no verificados).
- Efecto del descanso: pequeño, certeza baja (E).
- Si los principiantes estiman peor el RIR (resultados mixtos: J1/J3 frente a J2).
- Descargas: sobre todo opinión de expertos; una semana sin entrenar no mostró beneficio (L1, L2).
- Curso temporal del desentrenamiento (L4).
- Calistenia frente a pesos a largo plazo y en entrenados.
- Adherencia como variable: poca evidencia directa (supervisión: Fisher 2022).
- Detalles de ACSM 2026 sobre descanso, principiantes y certeza: **no verificados** (sin texto completo).

### 2.3 Decisiones prácticas de esta app (reglas del motor)

Todas son **editables** por la persona y se muestran con su explicación en la app.

| Regla | Valor por defecto | Respaldo y estado |
|---|---|---|
| **R1 · Frecuencia** | “Auto”: con 1–3 sesiones, cuerpo completo (frecuencia = sesiones); con 4–5, torso/pierna o combinaciones (frecuencia 2). Se puede pedir 1, 2 o 3. La frecuencia **solo reparte** el volumen. Si se pide más frecuencia que sesiones → **conflicto explicado** con alternativas; nunca se cambia en silencio. | A, B, C, Schoenfeld 2019, Grgic 2018. Decisión práctica. |
| **R2 · Sesiones por semana** | Lo que el motor propone automáticamente: principiante 3, tras pausa 4, intermedio 5 (aunque se marquen más días; se avisa y se puede cambiar). **Empuje/tirón/pierna 6 días nunca es la recomendación automática** (solo plantilla para nivel intermedio). Días elegidos con la máxima separación posible. | H1 (2–3 d principiantes). Decisión práctica. |
| **R3 · Volumen semanal** | Series “fraccionales” (directa = 1, indirecta = 0,5, **estimación**). Orientativo: principiante 6–9 en grupos grandes (4–8 bíceps/tríceps, 3–6 gemelos/abdomen); tras pausa 8–12; intermedio 10–16. Condición física general: algo menos. Prioridad muscular: +1/+2. **No es un mínimo**: si no cabe en el tiempo, se avisa y se ofrece completar. | C, H2–H5. El rango 6–10 propuesto en el encargo es razonable como punto de partida, no un mínimo. |
| **R4 · Volumen por sesión** | Aviso si un grupo supera ~10 series fraccionales en una sesión. | H6 (preprint, débil). |
| **R5 · Repeticiones** | Hipertrofia: pesados 6–10 (principiante 8–12), multiarticulares 8–12, accesorios 10–15 y 12–20 en laterales/posteriores/gemelos. Fuerza: principal pesado 6–8 (principiante), 5–8 (tras pausa), 4–6 (intermedio); **nunca 1–3 repeticiones** ni máximos para principiantes. Mixta: principal 5–8 (principiante 6–10). Peso corporal 8–20 y luego variante más difícil. | I1, I2, A, B, H1, H5. Límites concretos: decisión práctica. |
| **R6 · Esfuerzo (RIR)** | Principiante RIR 2–3; general 1–3; accesorios en intermedios con hipertrofia 1–2; principal de fuerza 2–3; **nunca fallo por defecto**. RIR opcional al registrar: si no se anota, no se inventa. | F, D, Grgic 2022, J1–J3. |
| **R7 · Descansos** | 2:30 en principal pesado (3:00 si fuerza), 2:00 en multiarticulares, 1:30 en accesorios, 1:00 en core. Aviso si se baja de 60 s. Modificables. | E, Grgic 2018, Schoenfeld 2016. |
| **R8 · Familiarización** | Principiante 2 semanas, tras pausa 1: una serie menos y RIR 3–4 al crear cada sesión. | Imprecisión del RIR (J) y aprendizaje técnico (consenso). Decisión práctica. |
| **R9 · Orden y aproximaciones** | Ejercicios exigentes primero; 2–3 series de aproximación en el principal, 1 en secundarios; no cuentan como volumen. | A (ejercicio al inicio de la sesión). |
| **R10 · Doble progresión** | Subir solo si **todas** las series requeridas llegan al máximo del rango con la misma carga y RIR anotado ≥1. Incremento = el menor disponible (configurable). Si el salto previsto haría caer por debajo del rango (estimación Epley), no se impone. Sin RIR → subida opcional. | H1 (2–10 %). Método de consenso; no hay ensayos que lo comparen con otros. |
| **R11 · Récords y 1RM estimado** | Mejor carga para N repeticiones (mismo ejercicio, solo series de trabajo). 1RM estimado (Epley) **solo** en multiarticulares con peso libre, con series de 1–10 repeticiones, etiquetado como estimación y nunca en menores. | K1, K2. |
| **R12 · Pausas y descargas** | Sesión floja aislada: nada. Dos seguidas por debajo del rango: sugerir revisar carga/descanso/recuperación. Tras >21 días sin un ejercicio: vuelta con ~15 % menos y más margen. Sin descargas obligatorias. | L1–L4. Cifras: heurística. |
| **R13 · Fuera de alcance** | Dolor persistente, lesión reciente, enfermedad cardiovascular/metabólica/renal o síntomas, embarazo/posparto u otra condición → no se genera programa automático ni se sugiere subir cargas; se recomienda valoración profesional. El registro manual sigue disponible. Se puede reactivar declarando autorización profesional. Molestia marcada en un ejercicio → sin sugerencia de subida. | M1–M4. |
| **R14 · Menores** | <14: sin programa automático (programa supervisado). 14–17: programa específico (técnica primero, 1–2 series, 8–15 repeticiones, RIR 3–4, sin fallo, sin 1RM, ≤3 días), con confirmación de supervisión adulta cualificada. **No se aplica el motor de adultos.** | G1–G4. Aplicación conservadora. |
| **R15 · Peso corporal** | Progresión por repeticiones y variantes más difíciles; asistencia: menos = más difícil. Sin material no se simula un tirón cargado: se muestra la carencia y alternativas. | I3–I6. |
| **R16 · Días consecutivos** | El reparto evita repetir grupos en días naturales seguidos (incluido domingo→lunes). Si no se puede, el segundo día lleva una serie menos y +1 RIR en esos ejercicios. | Decisión práctica (no hay evidencia directa). |
| **R17 · Material** | Máquinas, pesos libres, bandas y peso corporal se consideran válidos; se elige según disponibilidad. Los kg de máquinas/variantes distintas no se comparan ni se trasladan. | A (equipo no es factor consistente), H5. |

### 2.4 Comprobación de los principios del encargo
- (a) Sin frontera mágica en 8–12: **se sostiene**.
- (b) Cargas altas mejores para fuerza máxima: **se sostiene** (1RM dinámico).
- (c) Volumen con rendimientos decrecientes; 10 series no es mínimo: **se sostiene**.
- (d) Frecuencia 3 no siempre superior: **se sostiene**.
- (e) Cerca del fallo ≠ fallo: **se sostiene**.
- (f) Descansos muy cortos pueden restar algo: **se sostiene con baja certeza**.
- (g) Adherencia y técnica importan: **plausible y de consenso**, evidencia directa limitada.

## 3. Cómo verificar o actualizar

1. Permitir acceso a pubmed/pmc y webs de editoriales y leer los textos completos de A–F.
2. Revisar especialmente: rangos y certeza de ACSM 2026 (A), umbrales de Pelland (C), detalles de G2/G4 sobre 1RM en menores.
3. Si cambia una regla, modificar `src/domain/engine/params.ts`, subir `ENGINE_VERSION` y actualizar esta tabla. Las rutinas guardadas conservan la versión del motor con la que se generaron.
