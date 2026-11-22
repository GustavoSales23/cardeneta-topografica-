import { useState } from 'react';
import {
  azimuthToBack,
  azimuthToRumo,
  dmsToDec,
  formatBr,
  formatDms,
  normalizeAzimuth,
} from '../lib/topography';
import { MathTex } from './MathTex';

export function FormulaReferenceView() {
  // Simulador rápido interativo de Azimute <-> Rumo <-> Ré <-> Projeção unitária
  const [simDeg, setSimDeg] = useState(222);
  const [simMin, setSimMin] = useState(15);
  const [simSec, setSimSec] = useState(0);
  const [simDist, setSimDist] = useState(85.42);

  const azDec = normalizeAzimuth(dmsToDec(simDeg, simMin, simSec));
  const azBack = azimuthToBack(azDec);
  const rumo = azimuthToRumo(azDec);
  const rad = (azDec * Math.PI) / 180;
  const dx = simDist * Math.sin(rad);
  const dy = simDist * Math.cos(rad);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#17211A]">
          Folha de Fórmulas — Levantamento Planimétrico
        </h1>
        <p className="text-sm text-[#4D5E53] mt-1">
          Referência fiel à folha oficial da disciplina (IFRO · Campus Colorado do Oeste · Engenharia Agronômica) com conversor rápido de azimute, rumo e projeções.
        </p>
      </div>

      {/* Conversor rápido interativo */}
      <section className="bg-white border border-[#DDE3DC] rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[#17211A]">
            Simulador Rápido: Grau Sexagesimal, Azimute, Rumo e Projeção Polar → Cartesiana
          </h2>
          <p className="text-xs text-[#4D5E53] mt-0.5">
            Teste qualquer ângulo (por exemplo, o Azimute de ré 222°15′00″ da prova) para conferir a conversão instantânea.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[#4D5E53] block">Azimute (° ′ ″)</span>
            <div className="inline-flex items-center gap-1 font-mono tabular-nums">
              <input
                type="number"
                value={simDeg}
                onChange={(e) => setSimDeg(Number(e.target.value) || 0)}
                className="w-16 h-9 px-2 text-right bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A]"
              />
              <span>°</span>
              <input
                type="number"
                value={simMin}
                onChange={(e) => setSimMin(Number(e.target.value) || 0)}
                className="w-14 h-9 px-2 text-right bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A]"
              />
              <span>′</span>
              <input
                type="number"
                value={simSec}
                onChange={(e) => setSimSec(Number(e.target.value) || 0)}
                className="w-14 h-9 px-2 text-right bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A]"
              />
              <span>″</span>
            </div>
          </div>

          <label className="space-y-1">
            <span className="text-[#4D5E53] block">Distância D (m)</span>
            <input
              type="number"
              step="0.01"
              value={simDist}
              onChange={(e) => setSimDist(parseFloat(e.target.value) || 0)}
              className="w-28 h-9 px-2.5 text-right font-mono tabular-nums bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A]"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-[#DDE3DC] text-xs">
          <div>
            <div className="text-[#4D5E53]">Grau decimal</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#17211A] mt-0.5">
              {formatBr(azDec, 4)}°
            </div>
          </div>
          <div>
            <div className="text-[#4D5E53]">Azimute oposto (±180°)</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#0B5CAD] mt-0.5">
              {formatDms(azBack)}
            </div>
          </div>
          <div>
            <div className="text-[#4D5E53]">Rumo ({rumo.quadrant})</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#B45309] mt-0.5">
              {rumo.formatted}
            </div>
          </div>
          <div>
            <div className="text-[#4D5E53]">Quadrante</div>
            <div className="font-mono font-semibold text-sm text-[#17211A] mt-0.5">
              {rumo.quadrant}
            </div>
          </div>
          <div>
            <div className="text-[#4D5E53]">ΔX = D·sen(Az)</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#1B5E20] mt-0.5">
              {dx >= 0 ? '+' : ''}
              {formatBr(dx, 3)} m
            </div>
          </div>
          <div>
            <div className="text-[#4D5E53]">ΔY = D·cos(Az)</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#1B5E20] mt-0.5">
              {dy >= 0 ? '+' : ''}
              {formatBr(dy, 3)} m
            </div>
          </div>
        </div>
      </section>

      {/* Grade de Fórmulas Oficiais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#DDE3DC] rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#17211A]">
            01. Perímetro e Fechamento Angular
          </h3>
          <div className="space-y-2 text-xs text-[#17211A]">
            <MathTex display tex="P = \sum D_i" />
            <MathTex display tex="\sum_{\text{Calculada}} AI = 180^\circ \cdot (n - 2)" />
            <MathTex display tex="\text{Erro Angular} = \sum_{\text{Calculada}} AI - \sum_{\text{Observada}} AI" />
            <MathTex display tex="\text{Correção Angular} = \frac{\text{Erro Angular}}{n}" />
            <MathTex display tex="AI_{\text{Corrigido}} = AI + \text{Correção Angular}" />
          </div>
        </div>

        <div className="bg-white border border-[#DDE3DC] rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#17211A]">
            02. Azimute Calculado e Azimute de Ré
          </h3>
          <div className="space-y-2 text-xs text-[#17211A]">
            <MathTex display tex="Az_{\text{Calculado}} = Az_{\text{Anterior}} + AI_{\text{Corrigido}}" />
            <ul className="space-y-1.5 text-[#4D5E53] pt-1">
              <li>Se a soma for menor que 180°: soma-se 180°.</li>
              <li>Se a soma for maior ou igual a 180° (e menor que 540°): subtrai-se 180°.</li>
              <li>Se a soma for maior ou igual a 540°: subtrai-se 540°.</li>
              <li>Azimute de vante a partir do azimute de ré: soma-se 180° se ré &lt; 180°; subtrai-se 180° se ré ≥ 180°.</li>
            </ul>
          </div>
        </div>

        <div className="bg-white border border-[#DDE3DC] rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#17211A]">
            03. Projeções, Erro Linear e Compensação de Bowditch
          </h3>
          <div className="space-y-2 text-xs text-[#17211A]">
            <MathTex display tex="\Delta X = D \cdot \operatorname{sen}(Az) \qquad \Delta Y = D \cdot \cos(Az)" />
            <MathTex display tex="\text{Erro Linear} = \sqrt{(\sum \Delta X)^2 + (\sum \Delta Y)^2}" />
            <MathTex display tex="C_{X_i} = -\sum \Delta X \cdot \frac{D_i}{P} \qquad C_{Y_i} = -\sum \Delta Y \cdot \frac{D_i}{P}" />
            <MathTex display tex="\Delta X_{\text{corrigido}} = \Delta X_i + C_{X_i} \qquad \Delta Y_{\text{corrigido}} = \Delta Y_i + C_{Y_i}" />
          </div>
        </div>

        <div className="bg-white border border-[#DDE3DC] rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#17211A]">
            04. Coordenadas Cartesianas e Área de Gauss
          </h3>
          <div className="space-y-2 text-xs text-[#17211A]">
            <MathTex display tex="X_{i+1} = X_i + \Delta X_{c,i} \qquad Y_{i+1} = Y_i + \Delta Y_{c,i}" />
            <MathTex display tex="A = \frac{\left|\left(\sum_{i=1}^{n} X_i \cdot Y_{i+1}\right) - \left(\sum_{i=1}^{n} Y_i \cdot X_{i+1}\right)\right|}{2}" />
            <MathTex display tex="A_{\text{ha}} = \frac{A_{\text{m}^2}}{10.000}" />
          </div>
        </div>
      </div>

      {/* Tabela de Quadrantes Rumo <-> Azimute */}
      <section className="bg-white border border-[#DDE3DC] rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#17211A]">
          05. Conversão Rumo ⇄ Azimute e Sinais de Projeção
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-[#EFF3EE] text-[#4D5E53] border-b border-[#DDE3DC] font-sans">
                <th className="py-2 px-3 text-left">Quadrante</th>
                <th className="py-2 px-3 text-left">Intervalo do Azimute</th>
                <th className="py-2 px-3 text-left">Rumo → Azimute</th>
                <th className="py-2 px-3 text-left">Azimute → Rumo</th>
                <th className="py-2 px-3 text-center">Sinal ΔX (Leste)</th>
                <th className="py-2 px-3 text-center">Sinal ΔY (Norte)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3DC]">
              <tr>
                <td className="py-2 px-3 font-semibold text-[#17211A]">1º (NE)</td>
                <td className="py-2 px-3">0° a 90°</td>
                <td className="py-2 px-3">Az = R</td>
                <td className="py-2 px-3">R = Az</td>
                <td className="py-2 px-3 text-center text-[#1B5E20]">+</td>
                <td className="py-2 px-3 text-center text-[#1B5E20]">+</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-[#17211A]">2º (SE)</td>
                <td className="py-2 px-3">90° a 180°</td>
                <td className="py-2 px-3">Az = 180° − R</td>
                <td className="py-2 px-3">R = 180° − Az</td>
                <td className="py-2 px-3 text-center text-[#1B5E20]">+</td>
                <td className="py-2 px-3 text-center text-[#B91C1C]">−</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-[#17211A]">3º (SW)</td>
                <td className="py-2 px-3">180° a 270°</td>
                <td className="py-2 px-3">Az = 180° + R</td>
                <td className="py-2 px-3">R = Az − 180°</td>
                <td className="py-2 px-3 text-center text-[#B91C1C]">−</td>
                <td className="py-2 px-3 text-center text-[#B91C1C]">−</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-[#17211A]">4º (NW)</td>
                <td className="py-2 px-3">270° a 360°</td>
                <td className="py-2 px-3">Az = 360° − R</td>
                <td className="py-2 px-3">R = 360° − Az</td>
                <td className="py-2 px-3 text-center text-[#B91C1C]">−</td>
                <td className="py-2 px-3 text-center text-[#1B5E20]">+</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
