import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, RotateCcw } from 'lucide-react';
import {
  SurveyState,
  TraverseResult,
  dmsToDec,
  formatBr,
  formatDms,
  normalizeAzimuth,
} from '../lib/topography';

interface GuidedPracticePanelProps {
  survey: SurveyState;
  result: TraverseResult;
}

interface FieldFeedback {
  status: 'idle' | 'ok' | 'err';
  hint?: string;
}

function parseNum(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  const v = parseFloat(raw.trim().replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

/** Aceita "42 15 00", "42°15'00\"", "42:15:00" ou grau decimal "42,25" */
function parseAngleFlexible(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const parts = s.match(/-?\d+(?:[.,]\d+)?/g);
  if (!parts || parts.length === 0) return null;
  if (parts.length === 1) {
    return parseNum(parts[0]);
  }
  const d = parseFloat(parts[0].replace(',', '.'));
  const m = parts[1] ? parseFloat(parts[1].replace(',', '.')) : 0;
  const sec = parts[2] ? parseFloat(parts[2].replace(',', '.')) : 0;
  return dmsToDec(d, m, sec);
}

export function GuidedPracticePanel({ survey, result }: GuidedPracticePanelProps) {
  // Etapa A: Fechamento angular
  const [sumTeoIn, setSumTeoIn] = useState('');
  const [erroAngSecIn, setErroAngSecIn] = useState('');
  const [corrSecIn, setCorrSecIn] = useState('');
  const [fbA, setFbA] = useState<FieldFeedback>({ status: 'idle' });
  const [revealA, setRevealA] = useState(false);

  // Etapa B: Azimutes de vante
  const [azInputs, setAzInputs] = useState<Record<number, string>>({});
  const [fbB, setFbB] = useState<Record<number, FieldFeedback>>({});
  const [revealB, setRevealB] = useState(false);

  // Etapa C: Projeções do alinhamento 1 e Erro Linear total
  const [dx0In, setDx0In] = useState('');
  const [dy0In, setDy0In] = useState('');
  const [elIn, setElIn] = useState('');
  const [fbC, setFbC] = useState<FieldFeedback>({ status: 'idle' });
  const [revealC, setRevealC] = useState(false);

  // Etapa D: Área de Gauss
  const [areaM2In, setAreaM2In] = useState('');
  const [areaHaIn, setAreaHaIn] = useState('');
  const [fbD, setFbD] = useState<FieldFeedback>({ status: 'idle' });
  const [revealD, setRevealD] = useState(false);

  // Reinicia campos ao trocar o levantamento
  useEffect(() => {
    resetAll();
  }, [survey.id, survey.vertices.length]);

  const resetAll = () => {
    setSumTeoIn('');
    setErroAngSecIn('');
    setCorrSecIn('');
    setFbA({ status: 'idle' });
    setRevealA(false);
    setAzInputs({});
    setFbB({});
    setRevealB(false);
    setDx0In('');
    setDy0In('');
    setElIn('');
    setFbC({ status: 'idle' });
    setRevealC(false);
    setAreaM2In('');
    setAreaHaIn('');
    setFbD({ status: 'idle' });
    setRevealD(false);
  };

  const checkStageA = () => {
    const teo = parseNum(sumTeoIn);
    const errSec = parseNum(erroAngSecIn);
    const corrSec = parseNum(corrSecIn);
    const expectedErrSec = result.erroAngular * 3600;
    const expectedCorrSec = result.correcaoAngular * 3600;

    if (teo === null || errSec === null || corrSec === null) {
      setFbA({
        status: 'err',
        hint: 'Preencha os três campos (soma teórica em graus, erro angular e correção em segundos).',
      });
      return;
    }

    const okTeo = Math.abs(teo - result.sumAiTeorica) <= 0.05;
    // Aceita tanto e = Σ_calc - Σ_obs quanto o sinal inverso, mas explica se inverteu o sinal
    const okErrExact = Math.abs(errSec - expectedErrSec) <= 1.5;
    const okErrFlipped = Math.abs(errSec + expectedErrSec) <= 1.5 && Math.abs(expectedErrSec) > 0.5;
    const okCorrExact = Math.abs(corrSec - expectedCorrSec) <= 0.6;

    if (okTeo && okErrExact && okCorrExact) {
      setFbA({
        status: 'ok',
        hint: 'Fechamento angular conferido corretamente.',
      });
      return;
    }

    const hints: string[] = [];
    if (!okTeo) {
      hints.push(`Confira a soma teórica: (n − 2) × 180° com n = ${result.n}.`);
    }
    if (okErrFlipped) {
      hints.push('Módulo do erro angular certo, mas o sinal está invertido: na Folha de Fórmulas, Erro = Σ_calculada − Σ_observada.');
    } else if (!okErrExact) {
      hints.push('Revise a soma de graus, minutos e segundos com transporte de 60″ → 1′ e 60′ → 1°.');
    }
    if (!okCorrExact) {
      hints.push(`Divida o erro angular (em segundos) pelo número de vértices (n = ${result.n}).`);
    }

    setFbA({ status: 'err', hint: hints.join(' ') });
  };

  const checkStageB = () => {
    const nextFb: Record<number, FieldFeedback> = {};
    result.stations.forEach((s, idx) => {
      const val = parseAngleFlexible(azInputs[idx] || '');
      if (val === null) {
        nextFb[idx] = { status: 'err', hint: 'Informe em ° ′ ″ (ex: 42 15 00) ou decimal.' };
        return;
      }
      const norm = normalizeAzimuth(val);
      const diff = Math.min(
        Math.abs(norm - s.azVante),
        360 - Math.abs(norm - s.azVante)
      );

      if (diff <= 0.06) {
        nextFb[idx] = { status: 'ok', hint: 'Correto' };
        return;
      }

      // Diagnóstico didático específico
      const diffBack = Math.min(
        Math.abs(norm - s.azRe),
        360 - Math.abs(norm - s.azRe)
      );
      if (diffBack <= 0.15) {
        nextFb[idx] = {
          status: 'err',
          hint:
            idx === 0 && survey.azMode === 're'
              ? 'Você digitou o Azimute de Ré. Subtraia/some 180° para obter o Azimute de Vante P1–P2.'
              : 'Diferença de 180°: verifique a regra (< 180° soma 180°, ≥ 180° subtrai 180°).',
        };
      } else {
        nextFb[idx] = {
          status: 'err',
          hint:
            idx === 0
              ? 'Confira a conversão do azimute inicial de partida.'
              : 'Verifique Az_anterior + AI_corrigido neste vértice e a regra dos 180° / 540°.',
        };
      }
    });
    setFbB(nextFb);
  };

  const checkStageC = () => {
    const s0 = result.stations[0];
    if (!s0) return;
    const dx = parseNum(dx0In);
    const dy = parseNum(dy0In);
    const el = parseNum(elIn);

    if (dx === null || dy === null || el === null) {
      setFbC({
        status: 'err',
        hint: 'Preencha ΔX, ΔY do primeiro alinhamento e o Erro Linear total El (m).',
      });
      return;
    }

    const okDx = Math.abs(dx - s0.dx) <= 0.15;
    const okDy = Math.abs(dy - s0.dy) <= 0.15;
    const okEl = Math.abs(el - result.erroLinear) <= 0.25;

    if (okDx && okDy && okEl) {
      setFbC({
        status: 'ok',
        hint: 'Projeções e erro linear conferidos com precisão.',
      });
      return;
    }

    const hints: string[] = [];
    // Detecta troca clássica sen/cos!
    const swapped =
      Math.abs(dx - s0.dy) <= 0.25 && Math.abs(dy - s0.dx) <= 0.25 && Math.abs(s0.dx - s0.dy) > 0.5;
    if (swapped) {
      hints.push('Atenção: você trocou seno e cosseno! Lembre que ΔX = D·sen(Az) e ΔY = D·cos(Az).');
    } else {
      if (!okDx) hints.push(`Confira ΔX de ${s0.alinhamento} usando D × sen(Az).`);
      if (!okDy) hints.push(`Confira ΔY de ${s0.alinhamento} usando D × cos(Az).`);
    }
    if (!okEl) {
      hints.push('Confira El = √((ΣΔX)² + (ΣΔY)²) somando todos os alinhamentos.');
    }

    setFbC({ status: 'err', hint: hints.join(' ') });
  };

  const checkStageD = () => {
    const aM2 = parseNum(areaM2In);
    const aHa = parseNum(areaHaIn);

    if (aM2 === null || aHa === null) {
      setFbD({ status: 'err', hint: 'Informe a área em m² e em hectares (ha).' });
      return;
    }

    const tolM2 = Math.max(5, result.areaM2 * 0.005);
    const okM2 = Math.abs(aM2 - result.areaM2) <= tolM2;
    const okHa = Math.abs(aHa - result.areaHa) <= Math.max(0.005, result.areaHa * 0.005);

    if (okM2 && okHa) {
      setFbD({ status: 'ok', hint: 'Área de Gauss conferida corretamente em m² e ha.' });
      return;
    }

    const hints: string[] = [];
    if (Math.abs(aM2 - result.areaM2 * 2) <= tolM2 * 2) {
      hints.push('Você encontrou 2A — faltou dividir o módulo da diferença por 2.');
    } else if (!okM2) {
      hints.push('Revise os produtos cruzados X_i·Y_{i+1} e Y_i·X_{i+1} com as coordenadas compensadas.');
    }
    if (!okHa) {
      hints.push('Para converter m² em hectares, divida por 10.000.');
    }
    setFbD({ status: 'err', hint: hints.join(' ') });
  };

  const azCorrectCount = Object.values(fbB).filter((f) => f.status === 'ok').length;
  const stagesCompleted =
    (fbA.status === 'ok' ? 1 : 0) +
    (azCorrectCount === result.n && result.n > 0 ? 1 : 0) +
    (fbC.status === 'ok' ? 1 : 0) +
    (fbD.status === 'ok' ? 1 : 0);

  return (
    <section className="space-y-4">
      <div className="bg-white border border-[#DDE3DC] rounded-lg px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#17211A]">
            Modo Treino Guiado — Conferência Etapa por Etapa
          </h2>
          <p className="text-xs text-[#4D5E53] mt-0.5">
            Os resultados foram ocultados para você resolver à mão e conferir cada bloco. Etapas concluídas: {stagesCompleted} de 4.
          </p>
        </div>

        <button
          type="button"
          onClick={resetAll}
          className="h-8 px-3 text-xs font-medium border border-[#DDE3DC] bg-[#F7F8F5] text-[#17211A] rounded hover:bg-[#EFF3EE] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Limpar respostas
        </button>
      </div>

      {/* ETAPA A: Fechamento Angular */}
      <div className="bg-white border border-[#DDE3DC] rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#17211A]">
            a) Soma dos ângulos internos, erro angular e correção por vértice
          </h3>
          <button
            type="button"
            onClick={() => setRevealA((r) => !r)}
            className="text-xs font-medium text-[#4D5E53] hover:text-[#17211A] inline-flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" /> {revealA ? 'Ocultar gabarito' : 'Ver gabarito'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <label className="space-y-1">
            <span className="text-[#4D5E53] block">Soma teórica (°)</span>
            <input
              type="text"
              value={sumTeoIn}
              onChange={(e) => setSumTeoIn(e.target.value)}
              placeholder="ex: 900"
              className="w-full h-9 px-2.5 font-mono tabular-nums bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[#4D5E53] block">Erro angular (em segundos ″)</span>
            <input
              type="text"
              value={erroAngSecIn}
              onChange={(e) => setErroAngSecIn(e.target.value)}
              placeholder="ex: -42"
              className="w-full h-9 px-2.5 font-mono tabular-nums bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[#4D5E53] block">Correção por vértice (″)</span>
            <input
              type="text"
              value={corrSecIn}
              onChange={(e) => setCorrSecIn(e.target.value)}
              placeholder="ex: -6"
              className="w-full h-9 px-2.5 font-mono tabular-nums bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={checkStageA}
            className="h-8 px-3.5 text-xs font-medium bg-[#1B5E20] text-white rounded hover:bg-[#144818] cursor-pointer"
          >
            Conferir fechamento angular
          </button>
          {fbA.status !== 'idle' && (
            <div
              className={`inline-flex items-center gap-1.5 text-xs ${
                fbA.status === 'ok' ? 'text-[#1B5E20]' : 'text-[#B91C1C]'
              }`}
            >
              {fbA.status === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{fbA.hint}</span>
            </div>
          )}
        </div>

        {revealA && (
          <div className="bg-[#F7F8F5] border border-[#DDE3DC] rounded p-3 text-xs font-mono tabular-nums text-[#17211A] space-y-1">
            <div>Soma teórica = {formatDms(result.sumAiTeorica)} · Soma observada = {formatDms(result.sumAiObs)}</div>
            <div>
              Erro angular = {formatDms(result.erroAngular, true)} ({formatBr(result.erroAngular * 3600, 1)}″) · Correção ={' '}
              {formatDms(result.correcaoAngular, true)} ({formatBr(result.correcaoAngular * 3600, 2)}″ / vértice)
            </div>
          </div>
        )}
      </div>

      {/* ETAPA B: Azimutes de Vante */}
      <div className="bg-white border border-[#DDE3DC] rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#17211A]">
              b) Azimutes de vante de todos os alinhamentos
            </h3>
            <p className="text-xs text-[#4D5E53] mt-0.5">
              Digite em graus, minutos e segundos (ex: 42 15 00) ou grau decimal (ex: 42,25).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRevealB((r) => !r)}
            className="text-xs font-medium text-[#4D5E53] hover:text-[#17211A] inline-flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" /> {revealB ? 'Ocultar gabarito' : 'Ver gabarito'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {result.stations.map((s) => {
            const fb = fbB[s.index];
            return (
              <div key={`prac-az-${s.id}`} className="space-y-1">
                <label className="text-[#17211A] font-medium block">
                  Azimute {s.alinhamento}
                </label>
                <input
                  type="text"
                  value={azInputs[s.index] ?? ''}
                  onChange={(e) =>
                    setAzInputs((prev) => ({ ...prev, [s.index]: e.target.value }))
                  }
                  placeholder="gg mm ss ou decimal"
                  className={`w-full h-9 px-2.5 font-mono tabular-nums bg-[#F7F8F5] border rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20] ${
                    fb?.status === 'ok'
                      ? 'border-[#1B5E20]'
                      : fb?.status === 'err'
                        ? 'border-[#B91C1C]'
                        : 'border-[#DDE3DC]'
                  }`}
                />
                {fb && (
                  <p
                    className={`text-[11px] leading-snug ${
                      fb.status === 'ok' ? 'text-[#1B5E20]' : 'text-[#B91C1C]'
                    }`}
                  >
                    {fb.hint}
                  </p>
                )}
                {revealB && (
                  <p className="text-[11px] font-mono tabular-nums text-[#0B5CAD]">
                    Gabarito: {formatDms(s.azVante)} ({formatBr(s.azVante, 3)}°) · {s.rumo.formatted}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={checkStageB}
          className="h-8 px-3.5 text-xs font-medium bg-[#1B5E20] text-white rounded hover:bg-[#144818] cursor-pointer"
        >
          Conferir azimutes
        </button>
      </div>

      {/* ETAPA C: Projeções e Erro Linear */}
      <div className="bg-white border border-[#DDE3DC] rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#17211A]">
            c) Projeções do 1º alinhamento ({result.stations[0]?.alinhamento}) e Erro Linear de Fechamento
          </h3>
          <button
            type="button"
            onClick={() => setRevealC((r) => !r)}
            className="text-xs font-medium text-[#4D5E53] hover:text-[#17211A] inline-flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" /> {revealC ? 'Ocultar gabarito' : 'Ver gabarito'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <label className="space-y-1">
            <span className="text-[#4D5E53] block">ΔX de {result.stations[0]?.alinhamento} (m)</span>
            <input
              type="text"
              value={dx0In}
              onChange={(e) => setDx0In(e.target.value)}
              placeholder="ex: 57,43"
              className="w-full h-9 px-2.5 font-mono tabular-nums bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[#4D5E53] block">ΔY de {result.stations[0]?.alinhamento} (m)</span>
            <input
              type="text"
              value={dy0In}
              onChange={(e) => setDy0In(e.target.value)}
              placeholder="ex: 63,23"
              className="w-full h-9 px-2.5 font-mono tabular-nums bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[#4D5E53] block">Erro Linear Total El (m)</span>
            <input
              type="text"
              value={elIn}
              onChange={(e) => setElIn(e.target.value)}
              placeholder="m"
              className="w-full h-9 px-2.5 font-mono tabular-nums bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={checkStageC}
            className="h-8 px-3.5 text-xs font-medium bg-[#1B5E20] text-white rounded hover:bg-[#144818] cursor-pointer"
          >
            Conferir projeções e erro linear
          </button>
          {fbC.status !== 'idle' && (
            <div
              className={`inline-flex items-center gap-1.5 text-xs ${
                fbC.status === 'ok' ? 'text-[#1B5E20]' : 'text-[#B91C1C]'
              }`}
            >
              {fbC.status === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{fbC.hint}</span>
            </div>
          )}
        </div>

        {revealC && result.stations[0] && (
          <div className="bg-[#F7F8F5] border border-[#DDE3DC] rounded p-3 text-xs font-mono tabular-nums text-[#17211A]">
            ΔX₁ = {formatBr(result.stations[0].dx, 3)} m · ΔY₁ = {formatBr(result.stations[0].dy, 3)} m · ΣΔX ={' '}
            {formatBr(result.sumDx, 3)} m · ΣΔY = {formatBr(result.sumDy, 3)} m · El ={' '}
            {formatBr(result.erroLinear, 3)} m
          </div>
        )}
      </div>

      {/* ETAPA D: Área pelo Método de Gauss */}
      <div className="bg-white border border-[#DDE3DC] rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#17211A]">
            d) Área final da poligonal pelo método de Gauss
          </h3>
          <button
            type="button"
            onClick={() => setRevealD((r) => !r)}
            className="text-xs font-medium text-[#4D5E53] hover:text-[#17211A] inline-flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" /> {revealD ? 'Ocultar gabarito' : 'Ver gabarito'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="space-y-1">
            <span className="text-[#4D5E53] block">Área em metros quadrados (m²)</span>
            <input
              type="text"
              value={areaM2In}
              onChange={(e) => setAreaM2In(e.target.value)}
              placeholder="ex: 24500,00"
              className="w-full h-9 px-2.5 font-mono tabular-nums bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[#4D5E53] block">Área em hectares (ha)</span>
            <input
              type="text"
              value={areaHaIn}
              onChange={(e) => setAreaHaIn(e.target.value)}
              placeholder="ex: 2,4500"
              className="w-full h-9 px-2.5 font-mono tabular-nums bg-[#F7F8F5] border border-[#DDE3DC] rounded text-[#17211A] focus:outline-none focus:border-[#1B5E20]"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={checkStageD}
            className="h-8 px-3.5 text-xs font-medium bg-[#1B5E20] text-white rounded hover:bg-[#144818] cursor-pointer"
          >
            Conferir área de Gauss
          </button>
          {fbD.status !== 'idle' && (
            <div
              className={`inline-flex items-center gap-1.5 text-xs ${
                fbD.status === 'ok' ? 'text-[#1B5E20]' : 'text-[#B91C1C]'
              }`}
            >
              {fbD.status === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{fbD.hint}</span>
            </div>
          )}
        </div>

        {revealD && (
          <div className="bg-[#F7F8F5] border border-[#DDE3DC] rounded p-3 text-xs font-mono tabular-nums text-[#17211A]">
            Área = {formatBr(result.areaM2, 2)} m² = {formatBr(result.areaHa, 4)} ha
          </div>
        )}
      </div>
    </section>
  );
}
