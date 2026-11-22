import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  SurveyState,
  TraverseResult,
  formatBr,
  formatBrTex,
  formatDms,
  formatDmsTex,
} from '../lib/topography';
import { MathTex } from './MathTex';

interface CalculationStepsProps {
  survey: SurveyState;
  result: TraverseResult;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
}

export function CalculationSteps({
  survey,
  result,
  selectedIndex,
  onSelectIndex,
}: CalculationStepsProps) {
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: false,
    4: false,
    5: false,
    6: false,
    7: true,
  });

  const allOpen = [1, 2, 3, 4, 5, 6, 7].every((k) => openSteps[k]);

  const toggleAll = () => {
    const next = !allOpen;
    setOpenSteps({
      1: next,
      2: next,
      3: next,
      4: next,
      5: next,
      6: next,
      7: next,
    });
  };

  const toggleStep = (step: number) => {
    setOpenSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  };

  const firstLabel = result.stations[0]?.label ?? 'P1';
  const secondLabel = result.stations[1]?.label ?? 'P2';

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#17211A]">
            Memória de Cálculo Passo a Passo (7 Etapas)
          </h2>
          <p className="text-xs text-[#4D5E53] mt-0.5">
            Sequência exata da Folha de Fórmulas do professor com substituição automática de cada vértice.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          className="h-8 px-3 text-xs font-medium border border-[#DDE3DC] bg-white text-[#17211A] rounded hover:bg-[#EFF3EE] transition-colors cursor-pointer whitespace-nowrap no-print"
        >
          {allOpen ? 'Recolher todas as etapas' : 'Expandir todas as etapas'}
        </button>
      </div>

      {/* ETAPA 1 — Fechamento Angular */}
      <div className="bg-white border border-[#DDE3DC] rounded-lg overflow-hidden print-break-avoid">
        <button
          type="button"
          onClick={() => toggleStep(1)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F7F8F5] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {openSteps[1] ? (
              <ChevronDown className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            )}
            <span className="text-sm font-semibold text-[#17211A]">
              01. Perímetro e Fechamento Angular
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#4D5E53]">
            Erro: {formatDms(result.erroAngular, true)} · Correção: {formatDms(result.correcaoAngular, true)} / vértice
          </span>
        </button>

        <div className={`${openSteps[1] ? 'block' : 'hidden'} print-force-open px-4 pb-4 pt-2 border-t border-[#DDE3DC] space-y-3 text-xs`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#F7F8F5] p-3 rounded border border-[#DDE3DC]">
            <MathTex
              display
              tex={`\\sum_{\\text{calc}} AI = 180^\\circ \\cdot (${result.n} - 2) = ${formatDmsTex(result.sumAiTeorica)}`}
            />
            <MathTex
              display
              tex={`\\sum_{\\text{obs}} AI = ${formatDmsTex(result.sumAiObs)} \\quad (${formatBrTex(result.sumAiObs, 6)}^\\circ)`}
            />
            <MathTex
              display
              tex={`e_a = \\sum_{\\text{calc}} AI - \\sum_{\\text{obs}} AI = ${formatDmsTex(result.erroAngular, true)}`}
            />
            <MathTex
              display
              tex={`c_a = \\frac{e_a}{${result.n}} = ${formatDmsTex(result.correcaoAngular, true)}\\text{ por vértice}`}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse font-mono tabular-nums">
              <thead>
                <tr className="bg-[#EFF3EE] text-[#4D5E53] border-b border-[#DDE3DC] font-sans">
                  <th className="py-1.5 px-2.5 text-left">Vértice</th>
                  <th className="py-1.5 px-2.5 text-right">AI Observado</th>
                  <th className="py-1.5 px-2.5 text-right">Correção (c)</th>
                  <th className="py-1.5 px-2.5 text-right">AI Corrigido</th>
                  <th className="py-1.5 px-2.5 text-right">AI Corrigido (decimal)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE3DC]">
                {result.stations.map((s) => (
                  <tr
                    key={`e1-${s.id}`}
                    onClick={() => onSelectIndex(s.index)}
                    className={`cursor-pointer ${
                      s.index === selectedIndex ? 'bg-[#1B5E20]/[0.06]' : 'hover:bg-[#F7F8F5]'
                    }`}
                  >
                    <td className="py-1.5 px-2.5 font-semibold text-[#17211A]">{s.label}</td>
                    <td className="py-1.5 px-2.5 text-right">{formatDms(s.aiObsDec)}</td>
                    <td className="py-1.5 px-2.5 text-right text-[#4D5E53]">
                      {formatDms(result.correcaoAngular, true)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-semibold text-[#1B5E20]">
                      {formatDms(s.aiCorrDec)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-[#4D5E53]">
                      {formatBr(s.aiCorrDec, 5)}°
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ETAPA 2 — Azimutes e Rumos */}
      <div className="bg-white border border-[#DDE3DC] rounded-lg overflow-hidden print-break-avoid">
        <button
          type="button"
          onClick={() => toggleStep(2)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F7F8F5] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {openSteps[2] ? (
              <ChevronDown className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            )}
            <span className="text-sm font-semibold text-[#17211A]">
              02. Azimutes de Vante, Azimutes de Ré e Rumos
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#0B5CAD]">
            Az({firstLabel}–{secondLabel}) = {formatDms(result.azP1P2)} · Fechamento: {formatDms(result.azClosureCheck)}
          </span>
        </button>

        <div className={`${openSteps[2] ? 'block' : 'hidden'} print-force-open px-4 pb-4 pt-2 border-t border-[#DDE3DC] space-y-3 text-xs`}>
          {survey.azMode === 're' && (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded p-3 text-[#17211A]">
              <div className="font-semibold text-[#B45309] mb-1">
                Conversão do Azimute de Ré informado ({secondLabel}→{firstLabel}) para Vante ({firstLabel}→{secondLabel})
              </div>
              <MathTex
                display
                tex={`Az_{${firstLabel}\\text{–}${secondLabel}} = Az_{\\text{ré}(${secondLabel}\\text{–}${firstLabel})} ${
                  result.azInputDec >= 180 ? '-' : '+'
                } 180^\\circ = ${formatDmsTex(result.azInputDec)} ${
                  result.azInputDec >= 180 ? '-' : '+'
                } 180^\\circ = \\mathbf{${formatDmsTex(result.azP1P2)}}`}
              />
            </div>
          )}

          <div className="bg-[#F7F8F5] p-3 rounded border border-[#DDE3DC] text-[#4D5E53]">
            Regra de caminhamento ({survey.winding === 'ccw' ? 'Folha de Fórmulas IFRO — Anti-horário' : 'Horário'}):{' '}
            <MathTex tex="Az_{\text{calc}} = Az_{\text{anterior}} + AI_{\text{corrigido}}" /> · Se &lt; 180° soma 180° · Se ≥ 180° subtrai 180° · Se ≥ 540° subtrai 540°.
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse font-mono tabular-nums">
              <thead>
                <tr className="bg-[#EFF3EE] text-[#4D5E53] border-b border-[#DDE3DC] font-sans">
                  <th className="py-1.5 px-2.5 text-left">Alinhamento</th>
                  <th className="py-1.5 px-2.5 text-right">Soma (Az_ant + AI)</th>
                  <th className="py-1.5 px-2.5 text-left">Regra aplicada</th>
                  <th className="py-1.5 px-2.5 text-right">Azimute Vante</th>
                  <th className="py-1.5 px-2.5 text-right">Azimute Ré</th>
                  <th className="py-1.5 px-2.5 text-right">Rumo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE3DC]">
                {result.stations.map((s) => (
                  <tr
                    key={`e2-${s.id}`}
                    onClick={() => onSelectIndex(s.index)}
                    className={`cursor-pointer ${
                      s.index === selectedIndex ? 'bg-[#1B5E20]/[0.06]' : 'hover:bg-[#F7F8F5]'
                    }`}
                  >
                    <td className="py-1.5 px-2.5 font-semibold text-[#17211A]">{s.alinhamento}</td>
                    <td className="py-1.5 px-2.5 text-right text-[#4D5E53]">
                      {s.azProvisorio !== null ? formatDms(s.azProvisorio) : 'Partida'}
                    </td>
                    <td className="py-1.5 px-2.5 font-sans text-[#4D5E53]">{s.azRuleLabel}</td>
                    <td className="py-1.5 px-2.5 text-right font-semibold text-[#0B5CAD]">
                      {formatDms(s.azVante)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-[#4D5E53]">
                      {formatDms(s.azRe)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-medium text-[#B45309]">
                      {s.rumo.formatted}
                    </td>
                  </tr>
                ))}
                {/* Linha de conferência do fechamento azimutal */}
                <tr className="bg-[#F7F8F5] font-semibold">
                  <td className="py-1.5 px-2.5 text-[#1B5E20]">
                    Conferência {firstLabel}–{secondLabel}
                  </td>
                  <td className="py-1.5 px-2.5 text-right text-[#4D5E53]">
                    {formatDms(result.azClosureProvisorio)}
                  </td>
                  <td className="py-1.5 px-2.5 font-sans text-[#4D5E53]">
                    {result.azClosureRuleLabel}
                  </td>
                  <td className="py-1.5 px-2.5 text-right text-[#1B5E20]">
                    {formatDms(result.azClosureCheck)} (Fecha)
                  </td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ETAPA 3 — Projeções */}
      <div className="bg-white border border-[#DDE3DC] rounded-lg overflow-hidden print-break-avoid">
        <button
          type="button"
          onClick={() => toggleStep(3)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F7F8F5] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {openSteps[3] ? (
              <ChevronDown className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            )}
            <span className="text-sm font-semibold text-[#17211A]">
              03. Projeções Cartesianas (ΔX e ΔY)
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#4D5E53]">
            ΣΔX = {result.sumDx >= 0 ? '+' : ''}
            {formatBr(result.sumDx, 3)} m · ΣΔY = {result.sumDy >= 0 ? '+' : ''}
            {formatBr(result.sumDy, 3)} m
          </span>
        </button>

        <div className={`${openSteps[3] ? 'block' : 'hidden'} print-force-open px-4 pb-4 pt-2 border-t border-[#DDE3DC] space-y-3 text-xs`}>
          <div className="bg-[#F7F8F5] p-3 rounded border border-[#DDE3DC] flex flex-wrap gap-6 justify-center">
            <MathTex tex="\Delta X_i = D_i \cdot \operatorname{sen}(Az_i)" />
            <MathTex tex="\Delta Y_i = D_i \cdot \cos(Az_i)" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse font-mono tabular-nums">
              <thead>
                <tr className="bg-[#EFF3EE] text-[#4D5E53] border-b border-[#DDE3DC] font-sans">
                  <th className="py-1.5 px-2.5 text-left">Alinhamento</th>
                  <th className="py-1.5 px-2.5 text-right">D (m)</th>
                  <th className="py-1.5 px-2.5 text-right">Azimute</th>
                  <th className="py-1.5 px-2.5 text-right">sen(Az)</th>
                  <th className="py-1.5 px-2.5 text-right">cos(Az)</th>
                  <th className="py-1.5 px-2.5 text-right">ΔX (m)</th>
                  <th className="py-1.5 px-2.5 text-right">ΔY (m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE3DC]">
                {result.stations.map((s) => {
                  const rad = (s.azVante * Math.PI) / 180;
                  return (
                    <tr key={`e3-${s.id}`} className="hover:bg-[#F7F8F5]">
                      <td className="py-1.5 px-2.5 font-semibold text-[#17211A]">{s.alinhamento}</td>
                      <td className="py-1.5 px-2.5 text-right">{formatBr(s.distancia, 2)}</td>
                      <td className="py-1.5 px-2.5 text-right text-[#0B5CAD]">{formatDms(s.azVante)}</td>
                      <td className="py-1.5 px-2.5 text-right text-[#4D5E53]">{formatBr(Math.sin(rad), 5)}</td>
                      <td className="py-1.5 px-2.5 text-right text-[#4D5E53]">{formatBr(Math.cos(rad), 5)}</td>
                      <td className="py-1.5 px-2.5 text-right font-medium">
                        {s.dx >= 0 ? '+' : ''}
                        {formatBr(s.dx, 4)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-medium">
                        {s.dy >= 0 ? '+' : ''}
                        {formatBr(s.dy, 4)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ETAPA 4 — Erro Linear e Precisão */}
      <div className="bg-white border border-[#DDE3DC] rounded-lg overflow-hidden print-break-avoid">
        <button
          type="button"
          onClick={() => toggleStep(4)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F7F8F5] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {openSteps[4] ? (
              <ChevronDown className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            )}
            <span className="text-sm font-semibold text-[#17211A]">
              04. Erro Linear de Fechamento e Precisão
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#B91C1C]">
            El = {formatBr(result.erroLinear, 3)} m · Precisão:{' '}
            {Number.isFinite(result.precisao) ? `1 : ${formatBr(result.precisao, 0)}` : 'Exata'}
          </span>
        </button>

        <div className={`${openSteps[4] ? 'block' : 'hidden'} print-force-open px-4 pb-4 pt-2 border-t border-[#DDE3DC] text-xs`}>
          <div className="bg-[#F7F8F5] p-3 rounded border border-[#DDE3DC] space-y-2">
            <MathTex
              display
              tex={`E_l = \\sqrt{(\\sum \\Delta X)^2 + (\\sum \\Delta Y)^2} = \\sqrt{(${formatBrTex(result.sumDx, 4)})^2 + (${formatBrTex(result.sumDy, 4)})^2} = \\mathbf{${formatBrTex(result.erroLinear, 4)}\\ \\text{m}}`}
            />
            <MathTex
              display
              tex={
                Number.isFinite(result.precisao)
                  ? `\\text{Precisão} = \\frac{1}{P / E_l} = \\frac{1}{${formatBrTex(result.perimeter, 2)} / ${formatBrTex(result.erroLinear, 4)}} \\approx \\mathbf{1 : ${formatBrTex(result.precisao, 0)}}`
                  : `\\text{Precisão} = \\text{Fechamento exato } (E_l = 0)`
              }
            />
          </div>
        </div>
      </div>

      {/* ETAPA 5 — Compensação Bowditch */}
      <div className="bg-white border border-[#DDE3DC] rounded-lg overflow-hidden print-break-avoid">
        <button
          type="button"
          onClick={() => toggleStep(5)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F7F8F5] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {openSteps[5] ? (
              <ChevronDown className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            )}
            <span className="text-sm font-semibold text-[#17211A]">
              05. Compensação Linear — Método de Bowditch (Regra do Compasso)
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#1B5E20]">
            ΣΔXc = 0,000 · ΣΔYc = 0,000
          </span>
        </button>

        <div className={`${openSteps[5] ? 'block' : 'hidden'} print-force-open px-4 pb-4 pt-2 border-t border-[#DDE3DC] space-y-3 text-xs`}>
          <div className="bg-[#F7F8F5] p-3 rounded border border-[#DDE3DC] flex flex-wrap gap-6 justify-center">
            <MathTex tex="C_{X_i} = -\sum \Delta X \cdot \frac{D_i}{P}" />
            <MathTex tex="C_{Y_i} = -\sum \Delta Y \cdot \frac{D_i}{P}" />
            <MathTex tex="\Delta X_{c,i} = \Delta X_i + C_{X_i}" />
            <MathTex tex="\Delta Y_{c,i} = \Delta Y_i + C_{Y_i}" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse font-mono tabular-nums">
              <thead>
                <tr className="bg-[#EFF3EE] text-[#4D5E53] border-b border-[#DDE3DC] font-sans">
                  <th className="py-1.5 px-2.5 text-left">Alinhamento</th>
                  <th className="py-1.5 px-2.5 text-right">D / P</th>
                  <th className="py-1.5 px-2.5 text-right">C_X (m)</th>
                  <th className="py-1.5 px-2.5 text-right">C_Y (m)</th>
                  <th className="py-1.5 px-2.5 text-right">ΔX Corrigido</th>
                  <th className="py-1.5 px-2.5 text-right">ΔY Corrigido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE3DC]">
                {result.stations.map((s) => (
                  <tr key={`e5-${s.id}`} className="hover:bg-[#F7F8F5]">
                    <td className="py-1.5 px-2.5 font-semibold text-[#17211A]">{s.alinhamento}</td>
                    <td className="py-1.5 px-2.5 text-right text-[#4D5E53]">
                      {result.perimeter > 0 ? formatBr((s.distancia / result.perimeter) * 100, 2) : '0,00'}%
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-[#4D5E53]">
                      {s.cx >= 0 ? '+' : ''}
                      {formatBr(s.cx, 4)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-[#4D5E53]">
                      {s.cy >= 0 ? '+' : ''}
                      {formatBr(s.cy, 4)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-semibold text-[#1B5E20]">
                      {s.dxCorr >= 0 ? '+' : ''}
                      {formatBr(s.dxCorr, 4)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-semibold text-[#1B5E20]">
                      {s.dyCorr >= 0 ? '+' : ''}
                      {formatBr(s.dyCorr, 4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ETAPA 6 — Coordenadas Cartesianas */}
      <div className="bg-white border border-[#DDE3DC] rounded-lg overflow-hidden print-break-avoid">
        <button
          type="button"
          onClick={() => toggleStep(6)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F7F8F5] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {openSteps[6] ? (
              <ChevronDown className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            )}
            <span className="text-sm font-semibold text-[#17211A]">
              06. Coordenadas Cartesianas Finais dos Vértices
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#4D5E53]">
            Partida {firstLabel} ({formatBr(survey.x1, 2)}; {formatBr(survey.y1, 2)})
          </span>
        </button>

        <div className={`${openSteps[6] ? 'block' : 'hidden'} print-force-open px-4 pb-4 pt-2 border-t border-[#DDE3DC] space-y-3 text-xs`}>
          <div className="bg-[#F7F8F5] p-3 rounded border border-[#DDE3DC] flex flex-wrap gap-6 justify-center">
            <MathTex tex="X_{i+1} = X_i + \Delta X_{c,i}" />
            <MathTex tex="Y_{i+1} = Y_i + \Delta Y_{c,i}" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse font-mono tabular-nums">
              <thead>
                <tr className="bg-[#EFF3EE] text-[#4D5E53] border-b border-[#DDE3DC] font-sans">
                  <th className="py-1.5 px-2.5 text-left">Ponto</th>
                  <th className="py-1.5 px-2.5 text-right">X Bruto (m)</th>
                  <th className="py-1.5 px-2.5 text-right">Y Bruto (m)</th>
                  <th className="py-1.5 px-2.5 text-right">X Final Compensado (m)</th>
                  <th className="py-1.5 px-2.5 text-right">Y Final Compensado (m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE3DC]">
                {result.stations.map((s) => (
                  <tr key={`e6-${s.id}`} className="hover:bg-[#F7F8F5]">
                    <td className="py-1.5 px-2.5 font-semibold text-[#17211A]">{s.label}</td>
                    <td className="py-1.5 px-2.5 text-right text-[#4D5E53]">{formatBr(s.xRaw, 3)}</td>
                    <td className="py-1.5 px-2.5 text-right text-[#4D5E53]">{formatBr(s.yRaw, 3)}</td>
                    <td className="py-1.5 px-2.5 text-right font-semibold text-[#17211A]">
                      {formatBr(s.xFinal, 3)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-semibold text-[#17211A]">
                      {formatBr(s.yFinal, 3)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#F7F8F5] font-semibold">
                  <td className="py-1.5 px-2.5 text-[#1B5E20]">Retorno {firstLabel}</td>
                  <td className="py-1.5 px-2.5 text-right text-[#B91C1C]">{formatBr(result.endRawX, 3)}</td>
                  <td className="py-1.5 px-2.5 text-right text-[#B91C1C]">{formatBr(result.endRawY, 3)}</td>
                  <td className="py-1.5 px-2.5 text-right text-[#1B5E20]">{formatBr(survey.x1, 3)}</td>
                  <td className="py-1.5 px-2.5 text-right text-[#1B5E20]">{formatBr(survey.y1, 3)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ETAPA 7 — Área pelo Método de Gauss */}
      <div className="bg-white border border-[#DDE3DC] rounded-lg overflow-hidden print-break-avoid">
        <button
          type="button"
          onClick={() => toggleStep(7)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F7F8F5] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {openSteps[7] ? (
              <ChevronDown className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#4D5E53] shrink-0 no-print" />
            )}
            <span className="text-sm font-semibold text-[#17211A]">
              07. Área da Poligonal pelo Método de Gauss
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums font-semibold text-[#1B5E20]">
            {formatBr(result.areaM2, 2)} m² · {formatBr(result.areaHa, 4)} ha
          </span>
        </button>

        <div className={`${openSteps[7] ? 'block' : 'hidden'} print-force-open px-4 pb-4 pt-2 border-t border-[#DDE3DC] space-y-3 text-xs`}>
          <div className="bg-[#F7F8F5] p-3 rounded border border-[#DDE3DC]">
            <MathTex
              display
              tex={`A = \\frac{\\left| \\sum_{i=1}^{${result.n}}(X_i \\cdot Y_{i+1}) - \\sum_{i=1}^{${result.n}}(Y_i \\cdot X_{i+1}) \\right|}{2} = \\frac{|${formatBrTex(result.gaussSumXY, 2)} - ${formatBrTex(result.gaussSumYX, 2)}|}{2} = \\mathbf{${formatBrTex(result.areaM2, 2)}\\ \\text{m}^2} = \\mathbf{${formatBrTex(result.areaHa, 4)}\\ \\text{ha}}`}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse font-mono tabular-nums">
              <thead>
                <tr className="bg-[#EFF3EE] text-[#4D5E53] border-b border-[#DDE3DC] font-sans">
                  <th className="py-1.5 px-2.5 text-left">Par (i → i+1)</th>
                  <th className="py-1.5 px-2.5 text-right">X_i (m)</th>
                  <th className="py-1.5 px-2.5 text-right">Y_i (m)</th>
                  <th className="py-1.5 px-2.5 text-right">X_i · Y_(i+1)</th>
                  <th className="py-1.5 px-2.5 text-right">Y_i · X_(i+1)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE3DC]">
                {result.stations.map((s) => (
                  <tr key={`e7-${s.id}`} className="hover:bg-[#F7F8F5]">
                    <td className="py-1.5 px-2.5 font-semibold text-[#17211A]">{s.alinhamento}</td>
                    <td className="py-1.5 px-2.5 text-right">{formatBr(s.xFinal, 2)}</td>
                    <td className="py-1.5 px-2.5 text-right">{formatBr(s.yFinal, 2)}</td>
                    <td className="py-1.5 px-2.5 text-right">{formatBr(s.gaussXY, 2)}</td>
                    <td className="py-1.5 px-2.5 text-right">{formatBr(s.gaussYX, 2)}</td>
                  </tr>
                ))}
                <tr className="bg-[#F7F8F5] font-semibold">
                  <td className="py-1.5 px-2.5" colSpan={3}>
                    Somatórios de Gauss
                  </td>
                  <td className="py-1.5 px-2.5 text-right">{formatBr(result.gaussSumXY, 2)}</td>
                  <td className="py-1.5 px-2.5 text-right">{formatBr(result.gaussSumYX, 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
