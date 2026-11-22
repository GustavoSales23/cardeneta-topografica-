import { Plus, Trash2 } from 'lucide-react';
import {
  SurveyState,
  SurveyVertexInput,
  TraverseResult,
  formatBr,
  formatDms,
} from '../lib/topography';

interface FieldSheetTableProps {
  survey: SurveyState;
  result: TraverseResult;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  onUpdateSurvey: (updater: (prev: SurveyState) => SurveyState) => void;
  mode: 'demo' | 'practice';
}

function parseLocaleNumber(raw: string): number {
  const cleaned = raw.replace(',', '.');
  const v = parseFloat(cleaned);
  return Number.isFinite(v) ? v : 0;
}

export function FieldSheetTable({
  survey,
  result,
  selectedIndex,
  onSelectIndex,
  onUpdateSurvey,
  mode,
}: FieldSheetTableProps) {
  const handleVertexChange = (
    idx: number,
    patch: Partial<SurveyVertexInput>
  ) => {
    onUpdateSurvey((prev) => ({
      ...prev,
      source: 'manual',
      vertices: prev.vertices.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
      geoOrigin: prev.geoOrigin
        ? { ...prev.geoOrigin, isRealUtm: false }
        : undefined,
    }));
  };

  const handleAddVertex = () => {
    onUpdateSurvey((prev) => {
      const nextNum = prev.vertices.length + 1;
      return {
        ...prev,
        source: 'manual',
        vertices: [
          ...prev.vertices,
          {
            id: `v-${Date.now()}`,
            label: `P${nextNum}`,
            distancia: 100,
            aiDeg: 120,
            aiMin: 0,
            aiSec: 0,
          },
        ],
        geoOrigin: prev.geoOrigin
          ? { ...prev.geoOrigin, isRealUtm: false }
          : undefined,
      };
    });
  };

  const handleRemoveVertex = (idx: number) => {
    if (survey.vertices.length <= 3) return;
    onUpdateSurvey((prev) => ({
      ...prev,
      source: 'manual',
      vertices: prev.vertices.filter((_, i) => i !== idx),
      geoOrigin: prev.geoOrigin
        ? { ...prev.geoOrigin, isRealUtm: false }
        : undefined,
    }));
    if (selectedIndex >= survey.vertices.length - 1) {
      onSelectIndex(Math.max(0, survey.vertices.length - 2));
    }
  };

  const firstLabel = survey.vertices[0]?.label ?? 'P1';
  const secondLabel = survey.vertices[1]?.label ?? 'P2';

  return (
    <section className="bg-white border border-[#DDE3DC] rounded-lg overflow-hidden">
      {/* Cabeçalho da Planilha + Parâmetros de Partida */}
      <div className="px-4 py-3.5 border-b border-[#DDE3DC] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#17211A]">
            Planilha de Levantamento Planimétrico
          </h2>
          <p className="text-xs text-[#4D5E53] mt-0.5">
            Edite distâncias, ângulos internos (° ′ ″), azimute de partida ou clique em qualquer linha para inspecionar o vértice.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddVertex}
          className="h-8 px-3 text-xs font-medium bg-[#1B5E20] text-white rounded hover:bg-[#144818] transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap no-print"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar vértice
        </button>
      </div>

      {/* Linha de configuração de Azimute inicial (Vante vs Ré) e Coordenadas de Partida */}
      <div className="px-4 py-3 bg-[#F7F8F5] border-b border-[#DDE3DC] flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[#17211A]">Orientação inicial:</span>
          <div className="inline-flex items-center p-0.5 bg-[#EFF3EE] rounded border border-[#DDE3DC] no-print">
            <button
              type="button"
              onClick={() =>
                onUpdateSurvey((prev) => ({ ...prev, azMode: 'vante' }))
              }
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                survey.azMode === 'vante'
                  ? 'bg-white text-[#17211A] shadow-xs'
                  : 'text-[#4D5E53] hover:text-[#17211A]'
              }`}
            >
              Vante ({firstLabel}→{secondLabel})
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateSurvey((prev) => ({ ...prev, azMode: 're' }))
              }
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                survey.azMode === 're'
                  ? 'bg-white text-[#17211A] shadow-xs'
                  : 'text-[#4D5E53] hover:text-[#17211A]'
              }`}
            >
              Ré ({secondLabel}→{firstLabel})
            </button>
          </div>

          <div className="inline-flex items-center gap-1 font-mono tabular-nums">
            <input
              type="number"
              aria-label="Graus do azimute inicial"
              value={survey.azDeg}
              onChange={(e) =>
                onUpdateSurvey((prev) => ({
                  ...prev,
                  azDeg: Number(e.target.value) || 0,
                }))
              }
              className="w-14 h-7 px-1.5 text-right bg-white border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
            <span className="text-[#4D5E53]">°</span>
            <input
              type="number"
              aria-label="Minutos do azimute inicial"
              value={survey.azMin}
              onChange={(e) =>
                onUpdateSurvey((prev) => ({
                  ...prev,
                  azMin: Number(e.target.value) || 0,
                }))
              }
              className="w-12 h-7 px-1.5 text-right bg-white border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
            <span className="text-[#4D5E53]">′</span>
            <input
              type="number"
              aria-label="Segundos do azimute inicial"
              value={survey.azSec}
              onChange={(e) =>
                onUpdateSurvey((prev) => ({
                  ...prev,
                  azSec: Number(e.target.value) || 0,
                }))
              }
              className="w-12 h-7 px-1.5 text-right bg-white border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
            <span className="text-[#4D5E53]">″</span>
          </div>

          {survey.azMode === 're' && mode === 'demo' && (
            <span className="text-[11px] font-mono tabular-nums text-[#0B5CAD]">
              → Az vante ({firstLabel}–{secondLabel}) = {formatDms(result.azP1P2)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[#17211A]">Partida {firstLabel}:</span>
          <label className="inline-flex items-center gap-1 font-mono tabular-nums">
            <span className="text-[#4D5E53]">X₁</span>
            <input
              type="number"
              step="0.01"
              value={survey.x1}
              onChange={(e) =>
                onUpdateSurvey((prev) => ({
                  ...prev,
                  x1: parseLocaleNumber(e.target.value),
                }))
              }
              className="w-24 h-7 px-2 text-right bg-white border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
          </label>
          <label className="inline-flex items-center gap-1 font-mono tabular-nums">
            <span className="text-[#4D5E53]">Y₁</span>
            <input
              type="number"
              step="0.01"
              value={survey.y1}
              onChange={(e) =>
                onUpdateSurvey((prev) => ({
                  ...prev,
                  y1: parseLocaleNumber(e.target.value),
                }))
              }
              className="w-24 h-7 px-2 text-right bg-white border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
          </label>
          <span className="text-[#4D5E53]">m</span>
        </div>
      </div>

      {/* Tabela principal da caderneta */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#EFF3EE] text-[#4D5E53] border-b border-[#DDE3DC]">
              <th className="py-2.5 px-3 text-left font-medium whitespace-nowrap">Estação</th>
              <th className="py-2.5 px-2.5 text-left font-medium whitespace-nowrap">Alinhamento</th>
              <th className="py-2.5 px-2.5 text-right font-medium whitespace-nowrap">Distância (m)</th>
              <th className="py-2.5 px-2.5 text-center font-medium whitespace-nowrap">AI Observado (° ′ ″)</th>
              {mode === 'demo' && (
                <>
                  <th className="py-2.5 px-2.5 text-right font-medium whitespace-nowrap">AI Corrigido</th>
                  <th className="py-2.5 px-2.5 text-right font-medium whitespace-nowrap">Azimute Vante</th>
                  <th className="py-2.5 px-2.5 text-right font-medium whitespace-nowrap">Rumo</th>
                  <th className="py-2.5 px-2.5 text-right font-medium whitespace-nowrap">ΔX (m)</th>
                  <th className="py-2.5 px-2.5 text-right font-medium whitespace-nowrap">ΔY (m)</th>
                  <th className="py-2.5 px-2.5 text-right font-medium whitespace-nowrap">X Final (m)</th>
                  <th className="py-2.5 px-2.5 text-right font-medium whitespace-nowrap">Y Final (m)</th>
                </>
              )}
              <th className="py-2.5 px-2 text-center font-medium no-print" aria-label="Ações" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DDE3DC]">
            {survey.vertices.map((v, i) => {
              const st = result.stations[i];
              const isSelected = i === selectedIndex;
              return (
                <tr
                  key={v.id}
                  onClick={() => onSelectIndex(i)}
                  className={`transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#1B5E20]/[0.06]' : 'hover:bg-[#F7F8F5]'
                  }`}
                >
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={v.label}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        handleVertexChange(i, { label: e.target.value || `P${i + 1}` })
                      }
                      className={`w-12 h-7 px-1.5 font-mono font-semibold rounded border text-center focus:outline-none focus:border-[#1B5E20] ${
                        isSelected
                          ? 'bg-white border-[#1B5E20] text-[#1B5E20]'
                          : 'bg-transparent border-transparent hover:border-[#DDE3DC] text-[#17211A]'
                      }`}
                    />
                  </td>
                  <td className="py-2 px-2.5 font-mono text-[#4D5E53] whitespace-nowrap">
                    {st?.alinhamento}
                  </td>
                  <td className="py-2 px-2.5 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={v.distancia}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        handleVertexChange(i, {
                          distancia: parseLocaleNumber(e.target.value),
                        })
                      }
                      className="w-20 h-7 px-1.5 text-right font-mono tabular-nums bg-white border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
                    />
                  </td>
                  <td className="py-2 px-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center justify-center gap-0.5 font-mono tabular-nums">
                      <input
                        type="number"
                        aria-label={`Graus de ${v.label}`}
                        value={v.aiDeg}
                        onChange={(e) =>
                          handleVertexChange(i, { aiDeg: Number(e.target.value) || 0 })
                        }
                        className="w-12 h-7 px-1 text-right bg-white border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
                      />
                      <span className="text-[#4D5E53]">°</span>
                      <input
                        type="number"
                        aria-label={`Minutos de ${v.label}`}
                        value={v.aiMin}
                        onChange={(e) =>
                          handleVertexChange(i, { aiMin: Number(e.target.value) || 0 })
                        }
                        className="w-10 h-7 px-1 text-right bg-white border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
                      />
                      <span className="text-[#4D5E53]">′</span>
                      <input
                        type="number"
                        aria-label={`Segundos de ${v.label}`}
                        value={v.aiSec}
                        onChange={(e) =>
                          handleVertexChange(i, { aiSec: Number(e.target.value) || 0 })
                        }
                        className="w-10 h-7 px-1 text-right bg-white border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
                      />
                      <span className="text-[#4D5E53]">″</span>
                    </div>
                  </td>

                  {mode === 'demo' && st && (
                    <>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#17211A] whitespace-nowrap">
                        {formatDms(st.aiCorrDec)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-[#0B5CAD] whitespace-nowrap">
                        {formatDms(st.azVante)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#B45309] whitespace-nowrap">
                        {st.rumo.formatted}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#17211A] whitespace-nowrap">
                        {st.dx >= 0 ? '+' : ''}
                        {formatBr(st.dx, 2)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#17211A] whitespace-nowrap">
                        {st.dy >= 0 ? '+' : ''}
                        {formatBr(st.dy, 2)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums font-medium text-[#17211A] whitespace-nowrap">
                        {formatBr(st.xFinal, 2)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums font-medium text-[#17211A] whitespace-nowrap">
                        {formatBr(st.yFinal, 2)}
                      </td>
                    </>
                  )}

                  <td className="py-2 px-2 text-center no-print" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleRemoveVertex(i)}
                      disabled={survey.vertices.length <= 3}
                      aria-label={`Remover vértice ${v.label}`}
                      className="w-7 h-7 inline-flex items-center justify-center rounded text-[#4D5E53] hover:text-[#B91C1C] hover:bg-[#FEF2F2] disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Rodapé de somatórios */}
          <tfoot>
            <tr className="bg-[#F7F8F5] border-t border-[#DDE3DC] font-mono tabular-nums font-semibold text-[#17211A]">
              <td className="py-2.5 px-3" colSpan={2}>
                Somatório (n = {result.n})
              </td>
              <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                P = {formatBr(result.perimeter, 2)} m
              </td>
              <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                {mode === 'demo' ? formatDms(result.sumAiObs) : 'Calcule no treino'}
              </td>
              {mode === 'demo' && (
                <>
                  <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                    {formatDms(result.sumAiTeorica)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-[#1B5E20] whitespace-nowrap">
                    Fecha: {formatDms(result.azClosureCheck)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-[#4D5E53]">—</td>
                  <td className="py-2.5 px-2.5 text-right text-[#B91C1C] whitespace-nowrap">
                    {result.sumDx >= 0 ? '+' : ''}
                    {formatBr(result.sumDx, 2)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-[#B91C1C] whitespace-nowrap">
                    {result.sumDy >= 0 ? '+' : ''}
                    {formatBr(result.sumDy, 2)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-[#1B5E20] whitespace-nowrap" colSpan={2}>
                    Área: {formatBr(result.areaM2, 2)} m² ({formatBr(result.areaHa, 4)} ha)
                  </td>
                </>
              )}
              <td className="no-print" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
