import { useMemo, useState, MouseEvent } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import {
  SurveyState,
  TraverseResult,
  formatBr,
  formatDms,
} from '../lib/topography';

interface CartesianSketchProps {
  survey: SurveyState;
  result: TraverseResult;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  mode: 'demo' | 'practice';
}

const DEG2RAD = Math.PI / 180;

export function CartesianSketch({
  survey,
  result,
  selectedIndex,
  onSelectIndex,
  mode,
}: CartesianSketchProps) {
  const [showRawError, setShowRawError] = useState(true);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  const width = 760;
  const height = 470;
  const pad = 64;

  const bounds = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    result.stations.forEach((s) => {
      xs.push(s.xFinal);
      ys.push(s.yFinal);
      if (showRawError) {
        xs.push(s.xRaw);
        ys.push(s.yRaw);
      }
    });
    if (showRawError && result.stations.length > 0) {
      xs.push(result.endRawX);
      ys.push(result.endRawY);
    }
    if (xs.length === 0) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100, cx: 50, cy: 50, scale: 1 };
    }

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 20);
    const spanY = Math.max(maxY - minY, 20);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const baseScale = Math.min(
      (width - pad * 2) / spanX,
      (height - pad * 2) / spanY
    );
    return { minX, maxX, minY, maxY, cx, cy, scale: baseScale * zoom };
  }, [result, showRawError, zoom]);

  const toScreen = (x: number, y: number) => ({
    sx: width / 2 + (x - bounds.cx) * bounds.scale,
    sy: height / 2 - (y - bounds.cy) * bounds.scale,
  });

  const toWorld = (sx: number, sy: number) => ({
    x: bounds.cx + (sx - width / 2) / bounds.scale,
    y: bounds.cy - (sy - height / 2) / bounds.scale,
  });

  // Passos de grade arredondados
  const gridStep = useMemo(() => {
    const rawStep = 85 / Math.max(bounds.scale, 1e-6);
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const norm = rawStep / mag;
    if (norm < 1.5) return mag;
    if (norm < 3.5) return 2 * mag;
    if (norm < 7.5) return 5 * mag;
    return 10 * mag;
  }, [bounds.scale]);

  const gridLines = useMemo(() => {
    const leftWorld = toWorld(0, 0).x;
    const rightWorld = toWorld(width, 0).x;
    const topWorld = toWorld(0, 0).y;
    const bottomWorld = toWorld(0, height).y;

    const xLines: number[] = [];
    const startX = Math.ceil(leftWorld / gridStep) * gridStep;
    for (let x = startX; x <= rightWorld; x += gridStep) {
      xLines.push(x);
      if (xLines.length > 30) break;
    }

    const yLines: number[] = [];
    const startY = Math.ceil(bottomWorld / gridStep) * gridStep;
    for (let y = startY; y <= topWorld; y += gridStep) {
      yLines.push(y);
      if (yLines.length > 30) break;
    }
    return { xLines, yLines };
  }, [bounds, gridStep]);

  const finalPointsStr = result.stations
    .map((s) => {
      const p = toScreen(s.xFinal, s.yFinal);
      return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
    })
    .join(' ');

  const rawPathStr = useMemo(() => {
    if (result.stations.length === 0) return '';
    const pts = result.stations.map((s) => toScreen(s.xRaw, s.yRaw));
    pts.push(toScreen(result.endRawX, result.endRawY));
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`).join(' ');
  }, [result, bounds]);

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * width;
    const sy = ((e.clientY - rect.top) / rect.height) * height;
    setHoverCoord(toWorld(sx, sy));
  };

  const selectedSt = result.stations[Math.min(selectedIndex, Math.max(0, result.stations.length - 1))];
  const selectedScreen = selectedSt ? toScreen(selectedSt.xFinal, selectedSt.yFinal) : null;

  // Arco de Azimute sobre o vértice selecionado no Croqui
  const selectedAzArc = useMemo(() => {
    if (!selectedSt || !selectedScreen || mode === 'practice') return null;
    const r = 24;
    const az = Math.max(1, Math.min(359, selectedSt.azVante));
    const sx = selectedScreen.sx;
    const sy = selectedScreen.sy;
    const startX = sx;
    const startY = sy - r;
    const endX = sx + r * Math.sin(az * DEG2RAD);
    const endY = sy - r * Math.cos(az * DEG2RAD);
    const largeArc = az > 180 ? 1 : 0;
    return `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${r} ${r} 0 ${largeArc} 1 ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }, [selectedSt, selectedScreen, mode]);

  const p1Screen = result.stations[0] ? toScreen(result.stations[0].xFinal, result.stations[0].yFinal) : null;
  const endRawScreen = result.stations[0] ? toScreen(result.endRawX, result.endRawY) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Barra de controles do Croqui */}
      <div className="px-4 py-2.5 border-b border-[#DDE3DC] bg-white flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#4D5E53]">
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showRawError}
              onChange={(e) => setShowRawError(e.target.checked)}
              className="accent-[#1B5E20] rounded"
            />
            <span>Poligonal bruta e vetor de erro (El)</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showEdgeLabels}
              onChange={(e) => setShowEdgeLabels(e.target.checked)}
              className="accent-[#1B5E20] rounded"
            />
            <span>Rótulos nos alinhamentos</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="accent-[#1B5E20] rounded"
            />
            <span>Grade X/Y</span>
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.2).toFixed(2))))}
            aria-label="Afastar croqui"
            className="h-8 w-8 flex items-center justify-center rounded border border-[#DDE3DC] text-[#17211A] hover:bg-[#EFF3EE] cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Enquadrar poligonal"
            className="h-8 px-2.5 text-xs font-medium rounded border border-[#DDE3DC] text-[#17211A] hover:bg-[#EFF3EE] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Maximize2 className="w-3 h-3" /> Enquadrar
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.6, Number((z + 0.2).toFixed(2))))}
            aria-label="Aproximar croqui"
            className="h-8 w-8 flex items-center justify-center rounded border border-[#DDE3DC] text-[#17211A] hover:bg-[#EFF3EE] cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Palco SVG do Croqui Cartesiano */}
      <div className="relative flex-1 bg-[#FCFDFB] min-h-[430px] overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full min-h-[430px] cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCoord(null)}
        >
          <defs>
            <marker
              id="err-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#B91C1C" />
            </marker>
          </defs>

          {/* Grade cartesiana */}
          {showGrid && (
            <g>
              {gridLines.xLines.map((x) => {
                const { sx } = toScreen(x, 0);
                return (
                  <g key={`gx-${x}`}>
                    <line x1={sx} y1={0} x2={sx} y2={height} stroke="#E8EDE7" strokeWidth="1" />
                    <text
                      x={sx + 3}
                      y={height - 8}
                      className="fill-[#74857A] text-[9.5px] font-mono tabular-nums"
                    >
                      {formatBr(x, 0)}
                    </text>
                  </g>
                );
              })}
              {gridLines.yLines.map((y) => {
                const { sy } = toScreen(0, y);
                return (
                  <g key={`gy-${y}`}>
                    <line x1={0} y1={sy} x2={width} y2={sy} stroke="#E8EDE7" strokeWidth="1" />
                    <text
                      x={6}
                      y={sy - 4}
                      className="fill-[#74857A] text-[9.5px] font-mono tabular-nums"
                    >
                      {formatBr(y, 0)}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Poligonal compensada (Bowditch) */}
          {result.stations.length >= 3 && (
            <polygon
              points={finalPointsStr}
              fill="rgba(27, 94, 32, 0.08)"
              stroke="#1B5E20"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
          )}

          {/* Poligonal bruta (sem compensação) e vetor de erro linear El */}
          {showRawError && result.erroLinear > 0.005 && mode === 'demo' && (
            <g>
              <path
                d={rawPathStr}
                fill="none"
                stroke="#B45309"
                strokeWidth="1.4"
                strokeDasharray="6 4"
                opacity="0.8"
              />
              {p1Screen && endRawScreen && (
                <g>
                  <line
                    x1={endRawScreen.sx}
                    y1={endRawScreen.sy}
                    x2={p1Screen.sx}
                    y2={p1Screen.sy}
                    stroke="#B91C1C"
                    strokeWidth="2.2"
                    markerEnd="url(#err-arrow)"
                  />
                  <circle cx={endRawScreen.sx} cy={endRawScreen.sy} r="3.5" fill="#B91C1C" />
                  <text
                    x={endRawScreen.sx + 7}
                    y={endRawScreen.sy + 4}
                    className="fill-[#B91C1C] text-[10.5px] font-mono font-semibold"
                  >
                    {result.stations[0].label}′ (El = {formatBr(result.erroLinear, 2)} m)
                  </text>
                </g>
              )}
            </g>
          )}

          {/* Destaque do alinhamento selecionado */}
          {selectedSt && result.stations.length >= 2 && (() => {
            const next = result.stations[(selectedSt.index + 1) % result.stations.length];
            const a = toScreen(selectedSt.xFinal, selectedSt.yFinal);
            const b = toScreen(next.xFinal, next.yFinal);
            return (
              <line
                x1={a.sx}
                y1={a.sy}
                x2={b.sx}
                y2={b.sy}
                stroke="#0B5CAD"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            );
          })()}

          {/* Norte local e arco de Azimute diretamente no vértice selecionado */}
          {selectedScreen && selectedAzArc && (
            <g>
              <line
                x1={selectedScreen.sx}
                y1={selectedScreen.sy}
                x2={selectedScreen.sx}
                y2={selectedScreen.sy - 36}
                stroke="#17211A"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              <text
                x={selectedScreen.sx}
                y={selectedScreen.sy - 40}
                textAnchor="middle"
                className="fill-[#17211A] text-[9.5px] font-mono font-bold"
              >
                N
              </text>
              <path d={selectedAzArc} fill="none" stroke="#0B5CAD" strokeWidth="2" />
            </g>
          )}

          {/* Rótulos dos lados (Distância + Azimute) */}
          {showEdgeLabels &&
            result.stations.map((s) => {
              const next = result.stations[(s.index + 1) % result.stations.length];
              const a = toScreen(s.xFinal, s.yFinal);
              const b = toScreen(next.xFinal, next.yFinal);
              const mx = (a.sx + b.sx) / 2;
              const my = (a.sy + b.sy) / 2;
              const isSelected = s.index === selectedIndex;
              const labelText =
                mode === 'practice'
                  ? `${formatBr(s.distancia, 2)} m`
                  : `${formatBr(s.distancia, 2)} m · Az ${formatDms(s.azVante)}`;
              const boxW = labelText.length * 6.1 + 10;

              return (
                <g
                  key={`edge-${s.id}`}
                  onClick={() => onSelectIndex(s.index)}
                  className="cursor-pointer"
                >
                  <rect
                    x={mx - boxW / 2}
                    y={my - 9}
                    width={boxW}
                    height={18}
                    rx={3}
                    fill={isSelected ? '#1B5E20' : 'rgba(255,255,255,0.92)'}
                    stroke={isSelected ? '#144818' : '#CBD5CB'}
                    strokeWidth="0.9"
                  />
                  <text
                    x={mx}
                    y={my + 3.5}
                    textAnchor="middle"
                    className={`text-[9.5px] font-mono tabular-nums ${
                      isSelected ? 'fill-white font-semibold' : 'fill-[#17211A]'
                    }`}
                  >
                    {labelText}
                  </text>
                </g>
              );
            })}

          {/* Vértices clicáveis */}
          {result.stations.map((s) => {
            const p = toScreen(s.xFinal, s.yFinal);
            const isSelected = s.index === selectedIndex;
            return (
              <g
                key={`vtx-${s.id}`}
                onClick={() => onSelectIndex(s.index)}
                className="cursor-pointer"
              >
                {isSelected && (
                  <circle
                    cx={p.sx}
                    cy={p.sy}
                    r="11"
                    fill="rgba(11, 92, 173, 0.14)"
                    stroke="#0B5CAD"
                    strokeWidth="1.2"
                  />
                )}
                <circle
                  cx={p.sx}
                  cy={p.sy}
                  r={isSelected ? 6 : 5}
                  fill={isSelected ? '#0B5CAD' : '#1B5E20'}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <text
                  x={p.sx + 9}
                  y={p.sy - 8}
                  className={`text-[11px] font-mono font-bold ${
                    isSelected ? 'fill-[#0B5CAD]' : 'fill-[#17211A]'
                  }`}
                >
                  {s.label}
                </text>
              </g>
            );
          })}

          {/* Rosa do Norte no canto superior direito */}
          <g transform={`translate(${width - 42}, 44)`}>
            <circle cx="0" cy="0" r="18" fill="rgba(255,255,255,0.9)" stroke="#CBD5CB" strokeWidth="1" />
            <polygon points="0,-13 -4,2 0,-1 4,2" fill="#17211A" />
            <polygon points="0,13 -3,2 0,4 3,2" fill="#CBD5CB" />
            <text x="0" y="-21" textAnchor="middle" className="fill-[#17211A] text-[10px] font-mono font-bold">
              N
            </text>
          </g>
        </svg>

        {/* Rodapé técnico do croqui (coordenada do ponteiro + legenda limpa) */}
        <div className="absolute bottom-2.5 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="bg-white/92 border border-[#DDE3DC] rounded px-2.5 py-1 text-[11px] text-[#4D5E53] flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#1B5E20] inline-block" /> Compensada (Bowditch)
            </span>
            {showRawError && mode === 'demo' && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-[#B45309] inline-block" /> Bruta
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#B91C1C] inline-block" /> Erro Linear (El)
                </span>
              </>
            )}
          </div>

          <div className="bg-white/92 border border-[#DDE3DC] rounded px-2.5 py-1 text-[11px] font-mono tabular-nums text-[#17211A]">
            {hoverCoord
              ? `X: ${formatBr(hoverCoord.x, 2)} m · Y: ${formatBr(hoverCoord.y, 2)} m`
              : `Escala · Grade ${formatBr(gridStep, 0)} m · ${survey.winding === 'ccw' ? 'Anti-horário' : 'Horário'}`}
          </div>
        </div>
      </div>
    </div>
  );
}
