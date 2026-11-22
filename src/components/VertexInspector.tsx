import { ChevronLeft, ChevronRight, Compass, EyeOff } from 'lucide-react';
import {
  SurveyState,
  TraverseResult,
  formatBr,
  formatDms,
} from '../lib/topography';
import { LatLngPoint } from '../lib/topography';

interface VertexInspectorProps {
  survey: SurveyState;
  result: TraverseResult;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  mode: 'demo' | 'practice';
  vertexLatLng?: LatLngPoint;
  utmZone?: number;
  hemisphere?: 'N' | 'S';
}

const DEG2RAD = Math.PI / 180;

function polarToSvg(cx: number, cy: number, r: number, azDeg: number) {
  const rad = azDeg * DEG2RAD;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

function describeClockwiseArc(
  cx: number,
  cy: number,
  r: number,
  startAz: number,
  sweepDeg: number
): string {
  const clamped = Math.max(0.5, Math.min(359.5, sweepDeg));
  const start = polarToSvg(cx, cy, r, startAz);
  const end = polarToSvg(cx, cy, r, startAz + clamped);
  const largeArc = clamped > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function VertexInspector({
  survey,
  result,
  selectedIndex,
  onSelectIndex,
  mode,
  vertexLatLng,
  utmZone,
  hemisphere,
}: VertexInspectorProps) {
  const n = result.stations.length;
  if (n === 0) {
    return (
      <div className="bg-white border border-[#DDE3DC] rounded-lg p-5 flex flex-col items-center justify-center text-center min-h-[420px]">
        <Compass className="w-7 h-7 text-[#4D5E53] mb-3" strokeWidth={1.6} />
        <p className="text-sm font-medium text-[#17211A]">Nenhum vértice selecionado</p>
        <p className="text-xs text-[#4D5E53] mt-1 max-w-xs">
          Desenhe um polígono no Mapa Aberto ou carregue um preset para inspecionar rumo, azimute e projeções no vértice.
        </p>
      </div>
    );
  }

  const idx = Math.min(Math.max(0, selectedIndex), n - 1);
  const st = result.stations[idx];
  const prevIdx = (idx - 1 + n) % n;
  const prevSt = result.stations[prevIdx];

  // Raio de ré no vértice atual (Pi -> P_anterior) = Azimute de ré do alinhamento anterior
  const backRayAz = prevSt.azRe;
  const fwdRayAz = st.azVante;

  // Geometria SVG da Bússola Posicional
  const cx = 140;
  const cy = 140;
  const R = 104;
  const fwdEnd = polarToSvg(cx, cy, R - 8, fwdRayAz);
  const backEnd = polarToSvg(cx, cy, R - 18, backRayAz);

  // Projeção ΔX / ΔY normalizada no raio da bússola
  const projScale = R - 26;
  const vecEnd = polarToSvg(cx, cy, projScale, fwdRayAz);

  // Arco do Rumo (sempre a partir do Norte ou do Sul até o raio de vante)
  const rumoArcPath = (() => {
    const r = 42;
    const az = fwdRayAz;
    if (az <= 90) {
      return describeClockwiseArc(cx, cy, r, 0, az);
    }
    if (az <= 180) {
      return describeClockwiseArc(cx, cy, r, az, 180 - az);
    }
    if (az <= 270) {
      return describeClockwiseArc(cx, cy, r, 180, az - 180);
    }
    return describeClockwiseArc(cx, cy, r, az, 360 - az);
  })();

  // Arco do Ângulo Interno entre o raio de ré (Pi->P_prev) e o raio de vante (Pi->P_next)
  const internalAngleSweep =
    survey.winding === 'ccw'
      ? (fwdRayAz - backRayAz + 360) % 360
      : (backRayAz - fwdRayAz + 360) % 360;
  const internalArcStart = survey.winding === 'ccw' ? backRayAz : fwdRayAz;
  const internalArcPath = describeClockwiseArc(
    cx,
    cy,
    27,
    internalArcStart,
    internalAngleSweep
  );

  // Arco do Azimute de Vante (sempre de 0° Norte no sentido horário até fwdRayAz)
  const azArcPath = describeClockwiseArc(cx, cy, 62, 0, fwdRayAz);

  const isHiddenInPractice = mode === 'practice';

  return (
    <aside className="bg-white border border-[#DDE3DC] rounded-lg flex flex-col h-full">
      {/* Cabeçalho do Inspetor */}
      <div className="px-4 py-3 border-b border-[#DDE3DC] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#17211A] leading-tight">
            Inspetor Posicional do Vértice
          </h2>
          <p className="text-xs text-[#4D5E53] mt-0.5 truncate">
            Estação {st.label} · Alinhamento {st.alinhamento} ({formatBr(st.distancia, 2)} m)
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onSelectIndex((idx - 1 + n) % n)}
            aria-label="Vértice anterior"
            className="w-8 h-8 flex items-center justify-center rounded border border-[#DDE3DC] text-[#17211A] hover:bg-[#EFF3EE] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select
            aria-label="Selecionar vértice"
            value={idx}
            onChange={(e) => onSelectIndex(Number(e.target.value))}
            className="h-8 px-2 text-xs font-mono font-medium bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20] cursor-pointer"
          >
            {result.stations.map((s) => (
              <option key={s.id} value={s.index}>
                {s.label} → {s.nextLabel}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onSelectIndex((idx + 1) % n)}
            aria-label="Próximo vértice"
            className="w-8 h-8 flex items-center justify-center rounded border border-[#DDE3DC] text-[#17211A] hover:bg-[#EFF3EE] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bússola / Transferidor Geométrico SVG */}
      <div className="px-4 pt-3 pb-2 bg-[#F7F8F5]/70 border-b border-[#DDE3DC] flex flex-col items-center">
        {isHiddenInPractice ? (
          <div className="w-full py-10 flex flex-col items-center justify-center text-center">
            <EyeOff className="w-6 h-6 text-[#4D5E53] mb-2" strokeWidth={1.6} />
            <p className="text-sm font-medium text-[#17211A]">
              Leitura geométrica oculta no Modo Treino
            </p>
            <p className="text-xs text-[#4D5E53] mt-1 max-w-[260px]">
              Calcule o azimute, rumo e projeções na seção de Treino Guiado abaixo ou volte ao Modo Demonstração para visualizar a bússola completa.
            </p>
            <div className="mt-3 text-xs font-mono text-[#17211A] tabular-nums">
              Dado de campo · AI obs: {formatDms(st.aiObsDec)} · D = {formatBr(st.distancia, 2)} m
            </div>
          </div>
        ) : (
          <>
            <svg
              viewBox="0 0 280 280"
              className="w-full max-w-[250px] h-auto select-none"
              role="img"
              aria-label={`Diagrama angular da estação ${st.label} com azimute ${formatDms(fwdRayAz)} e rumo ${st.rumo.formatted}`}
            >
              <defs>
                <marker
                  id="arrow-fwd"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#1B5E20" />
                </marker>
              </defs>

              {/* Círculo graduado externo */}
              <circle cx={cx} cy={cy} r={R} fill="#FFFFFF" stroke="#CBD5CB" strokeWidth="1.2" />
              <circle
                cx={cx}
                cy={cy}
                r={R - 14}
                fill="none"
                stroke="#E5EBE4"
                strokeWidth="0.8"
                strokeDasharray="2 3"
              />

              {/* Marcas de graduação a cada 15° */}
              {Array.from({ length: 24 }).map((_, k) => {
                const deg = k * 15;
                const isMajor = deg % 90 === 0;
                const p1 = polarToSvg(cx, cy, R, deg);
                const p2 = polarToSvg(cx, cy, R - (isMajor ? 8 : 4), deg);
                return (
                  <line
                    key={deg}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={isMajor ? '#4D5E53' : '#B7C4B9'}
                    strokeWidth={isMajor ? 1.3 : 0.8}
                  />
                );
              })}

              {/* Eixos Cardeais N-S e E-W */}
              <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="#94A398" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="#94A398" strokeWidth="1" strokeDasharray="3 3" />

              {/* Seta do Norte */}
              <polygon
                points={`${cx},${cy - R - 11} ${cx - 4},${cy - R - 2} ${cx + 4},${cy - R - 2}`}
                fill="#17211A"
              />
              <text x={cx} y={cy - R - 15} textAnchor="middle" className="fill-[#17211A] text-[11px] font-bold font-mono">
                N (0°)
              </text>
              <text x={cx + R + 12} y={cy + 4} textAnchor="middle" className="fill-[#4D5E53] text-[10px] font-mono">
                E
              </text>
              <text x={cx} y={cy + R + 14} textAnchor="middle" className="fill-[#4D5E53] text-[10px] font-mono">
                S
              </text>
              <text x={cx - R - 12} y={cy + 4} textAnchor="middle" className="fill-[#4D5E53] text-[10px] font-mono">
                W
              </text>

              {/* Triângulo retângulo das projeções ΔX e ΔY */}
              <line
                x1={cx}
                y1={vecEnd.y}
                x2={vecEnd.x}
                y2={vecEnd.y}
                stroke="#0B5CAD"
                strokeWidth="1.2"
                strokeDasharray="3 2"
                opacity="0.7"
              />
              <line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={vecEnd.y}
                stroke="#0B5CAD"
                strokeWidth="1.6"
                opacity="0.5"
              />

              {/* Arco do Azimute de Vante (azul) */}
              <path d={azArcPath} fill="none" stroke="#0B5CAD" strokeWidth="2.2" />

              {/* Arco do Rumo (âmbar) */}
              <path d={rumoArcPath} fill="none" stroke="#B45309" strokeWidth="1.8" strokeDasharray="4 2" />

              {/* Arco do Ângulo Interno (verde) */}
              <path d={internalArcPath} fill="none" stroke="#1B5E20" strokeWidth="2" opacity="0.85" />

              {/* Raio de Ré (Pi -> P_anterior) */}
              <line
                x1={cx}
                y1={cy}
                x2={backEnd.x}
                y2={backEnd.y}
                stroke="#B45309"
                strokeWidth="1.6"
                strokeDasharray="5 3"
              />
              <text
                x={backEnd.x + (backEnd.x >= cx ? 6 : -6)}
                y={backEnd.y + (backEnd.y >= cy ? 10 : -5)}
                textAnchor={backEnd.x >= cx ? 'start' : 'end'}
                className="fill-[#B45309] text-[10px] font-mono font-medium"
              >
                Ré {prevSt.label}
              </text>

              {/* Raio de Vante (Pi -> P_próximo) */}
              <line
                x1={cx}
                y1={cy}
                x2={fwdEnd.x}
                y2={fwdEnd.y}
                stroke="#1B5E20"
                strokeWidth="2.6"
                markerEnd="url(#arrow-fwd)"
              />
              <text
                x={fwdEnd.x + (fwdEnd.x >= cx ? 6 : -6)}
                y={fwdEnd.y + (fwdEnd.y >= cy ? 12 : -6)}
                textAnchor={fwdEnd.x >= cx ? 'start' : 'end'}
                className="fill-[#1B5E20] text-[11px] font-mono font-semibold"
              >
                {st.nextLabel}
              </text>

              {/* Estação central */}
              <circle cx={cx} cy={cy} r="4.5" fill="#17211A" stroke="#FFFFFF" strokeWidth="1.5" />
            </svg>

            {/* Legenda geométrica limpa sem pílulas */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[#4D5E53] mt-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#0B5CAD] inline-block" /> Azimute ({formatDms(fwdRayAz)})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#B45309] inline-block border-t border-dashed border-[#B45309]" /> Rumo ({st.rumo.quadrant})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#1B5E20] inline-block" /> AI ({formatDms(st.aiCorrDec)})
              </span>
            </div>
          </>
        )}
      </div>

      {/* Dados detalhados do vértice */}
      <div className="p-4 space-y-3 text-xs flex-1 overflow-y-auto">
        {!isHiddenInPractice ? (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <div>
                <div className="text-[#4D5E53]">Azimute de Vante ({st.alinhamento})</div>
                <div className="font-mono tabular-nums text-sm font-semibold text-[#0B5CAD] mt-0.5">
                  {formatDms(st.azVante)}
                </div>
                <div className="font-mono tabular-nums text-[11px] text-[#4D5E53]">
                  {formatBr(st.azVante, 4)}°
                </div>
              </div>

              <div>
                <div className="text-[#4D5E53]">Rumo ({st.rumo.quadrant})</div>
                <div className="font-mono tabular-nums text-sm font-semibold text-[#B45309] mt-0.5">
                  {st.rumo.formatted}
                </div>
                <div className="font-mono tabular-nums text-[11px] text-[#4D5E53]">
                  {st.rumo.formattedDec}
                </div>
              </div>

              <div>
                <div className="text-[#4D5E53]">Ângulo Interno (AI)</div>
                <div className="font-mono tabular-nums text-sm font-semibold text-[#17211A] mt-0.5">
                  {formatDms(st.aiCorrDec)}
                </div>
                <div className="font-mono tabular-nums text-[11px] text-[#4D5E53]">
                  Obs: {formatDms(st.aiObsDec)} ({formatBr(st.aiCorrDec, 4)}°)
                </div>
              </div>

              <div>
                <div className="text-[#4D5E53]">Azimute de Ré ({st.nextLabel}–{st.label})</div>
                <div className="font-mono tabular-nums text-sm font-semibold text-[#17211A] mt-0.5">
                  {formatDms(st.azRe)}
                </div>
                <div className="font-mono tabular-nums text-[11px] text-[#4D5E53]">
                  {formatBr(st.azRe, 4)}° (±180°)
                </div>
              </div>
            </div>

            {/* Explicação da regra usada neste vértice */}
            <div className="pt-2.5 border-t border-[#DDE3DC]">
              <div className="text-[#4D5E53]">Regra de propagação neste alinhamento</div>
              <div className="mt-1 text-[#17211A] font-medium">
                {idx === 0 ? (
                  survey.azMode === 're' ? (
                    <span className="font-mono text-[11px] tabular-nums">
                      Az ré ({st.nextLabel}→{st.label}) = {formatDms(result.azInputDec)} → {st.azRuleLabel} ={' '}
                      <strong>{formatDms(st.azVante)}</strong>
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] tabular-nums">
                      Azimute inicial de vante informado: <strong>{formatDms(st.azVante)}</strong>
                    </span>
                  )
                ) : (
                  <span className="font-mono text-[11px] tabular-nums">
                    {formatDms(prevSt.azVante)} + {formatDms(st.aiCorrDec)} ={' '}
                    {formatDms(st.azProvisorio ?? 0)} ({st.azRuleLabel}) ={' '}
                    <strong>{formatDms(st.azVante)}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Polar -> Cartesiana */}
            <div className="pt-2.5 border-t border-[#DDE3DC] grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <div className="text-[#4D5E53]">Projeção Leste (ΔX = D·sen Az)</div>
                <div className="font-mono tabular-nums text-[#17211A] font-medium mt-0.5">
                  {st.dx >= 0 ? '+' : ''}
                  {formatBr(st.dx, 3)} m
                </div>
                <div className="font-mono tabular-nums text-[11px] text-[#4D5E53]">
                  Corrigida: {st.dxCorr >= 0 ? '+' : ''}
                  {formatBr(st.dxCorr, 3)} m
                </div>
              </div>
              <div>
                <div className="text-[#4D5E53]">Projeção Norte (ΔY = D·cos Az)</div>
                <div className="font-mono tabular-nums text-[#17211A] font-medium mt-0.5">
                  {st.dy >= 0 ? '+' : ''}
                  {formatBr(st.dy, 3)} m
                </div>
                <div className="font-mono tabular-nums text-[11px] text-[#4D5E53]">
                  Corrigida: {st.dyCorr >= 0 ? '+' : ''}
                  {formatBr(st.dyCorr, 3)} m
                </div>
              </div>
            </div>

            {/* Coordenadas Cartesianas e Geográficas */}
            <div className="pt-2.5 border-t border-[#DDE3DC] space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#4D5E53]">
                  Coordenadas {survey.geoOrigin?.isRealUtm ? `UTM (${utmZone}${hemisphere})` : 'Cartesianas Locais'}
                </span>
                <span className="font-mono tabular-nums font-semibold text-[#17211A]">
                  X: {formatBr(st.xFinal, 2)} · Y: {formatBr(st.yFinal, 2)} m
                </span>
              </div>
              {vertexLatLng && (
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#4D5E53]">
                  <span>Geográficas (WGS84)</span>
                  <span className="font-mono tabular-nums">
                    {vertexLatLng.lat.toFixed(6)}°, {vertexLatLng.lng.toFixed(6)}°
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-2 text-[#4D5E53]">
            <div className="flex justify-between">
              <span>Alinhamento selecionado</span>
              <span className="font-mono text-[#17211A] font-medium">{st.alinhamento}</span>
            </div>
            <div className="flex justify-between">
              <span>Distância de campo (D)</span>
              <span className="font-mono text-[#17211A] tabular-nums">{formatBr(st.distancia, 2)} m</span>
            </div>
            <div className="flex justify-between">
              <span>Ângulo interno observado</span>
              <span className="font-mono text-[#17211A] tabular-nums">{formatDms(st.aiObsDec)}</span>
            </div>
            <div className="flex justify-between">
              <span>Coordenada de partida (P1)</span>
              <span className="font-mono text-[#17211A] tabular-nums">
                ({formatBr(survey.x1, 2)}; {formatBr(survey.y1, 2)})
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
