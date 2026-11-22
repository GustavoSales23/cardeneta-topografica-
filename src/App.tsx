import { useEffect, useMemo, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import {
  LatLngPoint,
  SurveyState,
  computeTraverse,
  formatBr,
  formatDms,
} from './lib/topography';
import {
  latLngPolygonToSurvey,
  projectTraverseToLatLngs,
} from './lib/geo';
import {
  PRESET_PROVA_1,
  PRESET_Q28,
  createPresetTalhaoMapa,
} from './data/presets';
import { OpenMapView } from './components/OpenMapView';
import { CartesianSketch } from './components/CartesianSketch';
import { VertexInspector } from './components/VertexInspector';
import { FieldSheetTable } from './components/FieldSheetTable';
import { CalculationSteps } from './components/CalculationSteps';
import { GuidedPracticePanel } from './components/GuidedPracticePanel';
import { FormulaReferenceView } from './components/FormulaReferenceView';

type TopSection = 'mapa' | 'croqui' | 'planilha' | 'formulas';
type WorkspaceMode = 'demo' | 'practice';

const STORAGE_KEY = 'caderneta_planimetrica_v1';

function loadInitialSurvey(): SurveyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SurveyState;
      if (parsed && Array.isArray(parsed.vertices) && parsed.vertices.length >= 3) {
        return parsed;
      }
    }
  } catch {
    // fallback para preset da prova
  }
  return PRESET_PROVA_1;
}

export default function App() {
  const [survey, setSurvey] = useState<SurveyState>(loadInitialSurvey);
  const [activeNav, setActiveNav] = useState<TopSection>('croqui');
  const [stageView, setStageView] = useState<'mapa' | 'croqui'>('croqui');
  const [mode, setMode] = useState<WorkspaceMode>('demo');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const planilhaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(survey));
    } catch {
      // ignora quota de armazenamento
    }
  }, [survey]);

  // Motor matemático único (Fonte Única de Verdade)
  const result = useMemo(() => computeTraverse(survey), [survey]);

  // Projeção geográfica sincronizada para o Mapa Aberto
  const geoProjection = useMemo(
    () => projectTraverseToLatLngs(survey, result),
    [survey, result]
  );

  // Garante índice selecionado válido
  const safeSelectedIndex = Math.min(
    Math.max(0, selectedIndex),
    Math.max(0, result.stations.length - 1)
  );

  const handleNavClick = (section: TopSection) => {
    setActiveNav(section);
    if (section === 'mapa') {
      setStageView('mapa');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'croqui') {
      setStageView('croqui');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'planilha') {
      setTimeout(() => {
        planilhaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoadPreset = (presetKey: 'prova' | 'q28' | 'talhao') => {
    if (presetKey === 'prova') {
      setSurvey(PRESET_PROVA_1);
      setSelectedIndex(0);
    } else if (presetKey === 'q28') {
      setSurvey(PRESET_Q28);
      setSelectedIndex(0);
    } else {
      setSurvey(createPresetTalhaoMapa());
      setSelectedIndex(0);
      setStageView('mapa');
      setActiveNav('mapa');
    }
  };

  const handleApplyMapPolygon = (points: LatLngPoint[], wasEdited = false) => {
    if (points.length < 3) return;
    const { survey: nextSurvey } = latLngPolygonToSurvey(points, {
      title: wasEdited ? survey.title : 'Levantamento no Mapa Aberto',
      ensureCcw: !wasEdited,
      source: 'mapa',
    });
    setSurvey((prev) => ({
      ...nextSurvey,
      // Mantém mesmo ID ao editar vértice para evitar reset abrupto do zoom do mapa
      id: wasEdited ? prev.id : nextSurvey.id,
    }));
  };

  const handleReverseWinding = () => {
    if (geoProjection.latLngs.length >= 3 && survey.geoOrigin?.isRealUtm) {
      const reversedPts = [
        geoProjection.latLngs[0],
        ...geoProjection.latLngs.slice(1).reverse(),
      ];
      const { survey: nextSurvey } = latLngPolygonToSurvey(reversedPts, {
        title: survey.title,
        ensureCcw: false,
        source: survey.source,
      });
      setSurvey((prev) => ({ ...nextSurvey, id: prev.id }));
      return;
    }

    setSurvey((prev) => ({
      ...prev,
      winding: prev.winding === 'ccw' ? 'cw' : 'ccw',
    }));
  };

  const handlePrintPdf = () => {
    if (activeNav === 'formulas') {
      window.print();
      return;
    }
    window.print();
  };

  const activePresetId =
    survey.source === 'preset-prova'
      ? 'prova'
      : survey.source === 'preset-q28'
        ? 'q28'
        : survey.source === 'preset-mapa'
          ? 'talhao'
          : 'custom';

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8F5] text-[#17211A]">
      {/* Barra Superior — Contrato estrito de 3 zonas */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#DDE3DC] no-print">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zona 1: Marca em linha única */}
          <button
            type="button"
            onClick={() => handleNavClick('croqui')}
            className="font-display text-base sm:text-lg font-bold tracking-tight text-[#17211A] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Caderneta Planimétrica
          </button>

          {/* Zona 2: 4 links textuais em linha única */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {(
              [
                { id: 'mapa', label: 'Mapa Aberto' },
                { id: 'croqui', label: 'Croqui Cartesiano' },
                { id: 'planilha', label: 'Planilha e Etapas' },
                { id: 'formulas', label: 'Fórmulas' },
              ] as const
            ).map((item) => {
              const isActive =
                activeNav === item.id ||
                (activeNav !== 'formulas' &&
                  activeNav !== 'planilha' &&
                  stageView === item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-[#1B5E20] text-[#1B5E20]'
                      : 'border-transparent text-[#4D5E53] hover:text-[#17211A]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zona 3: 1 ação primária */}
          <button
            type="button"
            onClick={handlePrintPdf}
            className="h-9 px-4 text-xs font-semibold text-white bg-[#1B5E20] rounded-md hover:bg-[#144818] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir / PDF
          </button>
        </div>
      </header>

      {/* Cabeçalho dedicado para Impressão / PDF */}
      <div className="hidden print-only px-2 pb-4 mb-4 border-b border-[#17211A]">
        <h1 className="text-xl font-bold text-[#17211A]">
          Relatório de Levantamento Planimétrico — {survey.title}
        </h1>
        <p className="text-xs text-[#4D5E53] mt-1">
          {survey.subtitle} · Gerado em {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Navegação móvel compacta */}
      <div className="md:hidden bg-white border-b border-[#DDE3DC] px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium no-print">
        {(
          [
            { id: 'mapa', label: 'Mapa Aberto' },
            { id: 'croqui', label: 'Croqui' },
            { id: 'planilha', label: 'Planilha' },
            { id: 'formulas', label: 'Fórmulas' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavClick(item.id)}
            className={`whitespace-nowrap shrink-0 py-1 ${
              activeNav === item.id
                ? 'text-[#1B5E20] font-semibold border-b-2 border-[#1B5E20]'
                : 'text-[#4D5E53]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {activeNav === 'formulas' ? (
          <FormulaReferenceView />
        ) : (
          <>
            {/* Barra de Contexto da Bancada (Presets + Alternador Demonstração/Treino) */}
            <div className="flex flex-wrap items-end justify-between gap-4 no-print">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-[#17211A] leading-tight">
                  {survey.title}
                </h1>
                <p className="text-xs text-[#4D5E53] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>{result.n} vértices</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {survey.azMode === 're'
                      ? `Azimute de ré (${survey.vertices[1]?.label ?? 'P2'}→${survey.vertices[0]?.label ?? 'P1'}) = ${formatDms(result.azInputDec)}`
                      : `Azimute de vante (${survey.vertices[0]?.label ?? 'P1'}→${survey.vertices[1]?.label ?? 'P2'}) = ${formatDms(result.azP1P2)}`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {geoProjection.isRealUtm
                      ? `UTM Fuso ${geoProjection.utmZone}${geoProjection.hemisphere} (WGS84 / SIRGAS 2000)`
                      : `Coordenadas locais a partir de (${formatBr(survey.x1, 2)}; ${formatBr(survey.y1, 2)}) m`}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {/* Seletor de Presets */}
                <label className="inline-flex items-center gap-2 text-xs text-[#4D5E53]">
                  <span className="whitespace-nowrap">Levantamento:</span>
                  <select
                    value={activePresetId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'prova' || val === 'q28' || val === 'talhao') {
                        handleLoadPreset(val);
                      }
                    }}
                    className="h-9 px-2.5 text-xs font-medium bg-white border border-[#DDE3DC] rounded-md text-[#17211A] focus:outline-none focus:border-[#1B5E20] cursor-pointer"
                  >
                    <option value="prova">1ª Avaliação — 7 vértices (Az ré)</option>
                    <option value="q28">Questão 28 — 5 vértices (Caderneta)</option>
                    <option value="talhao">Talhão Satélite — UTM 20S</option>
                    {activePresetId === 'custom' && (
                      <option value="custom">Editado / Mapa Aberto</option>
                    )}
                  </select>
                </label>

                {/* Controle segmentado: Demonstração vs Treino Guiado */}
                <div className="inline-flex items-center p-0.5 bg-[#EFF3EE] border border-[#DDE3DC] rounded-md">
                  <button
                    type="button"
                    onClick={() => setMode('demo')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                      mode === 'demo'
                        ? 'bg-white text-[#17211A] shadow-xs'
                        : 'text-[#4D5E53] hover:text-[#17211A]'
                    }`}
                  >
                    Modo Demonstração
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('practice')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                      mode === 'practice'
                        ? 'bg-white text-[#17211A] shadow-xs'
                        : 'text-[#4D5E53] hover:text-[#17211A]'
                    }`}
                  >
                    Modo Treino Guiado
                  </button>
                </div>
              </div>
            </div>

            {/* Faixa de Indicadores de Fechamento (4 colunas, limpa e tabular) */}
            <section className="bg-white border border-[#DDE3DC] rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#DDE3DC]">
              <div className="p-4">
                <div className="text-xs text-[#4D5E53]">Perímetro da poligonal</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-mono tabular-nums text-xl font-semibold text-[#17211A]">
                    {formatBr(result.perimeter, 2)}
                  </span>
                  <span className="text-xs font-mono text-[#4D5E53]">m</span>
                </div>
                <div className="text-[11px] text-[#4D5E53] mt-0.5">
                  Soma de {result.n} alinhamentos
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-[#4D5E53]">Erro angular de fechamento</div>
                {mode === 'practice' ? (
                  <div className="mt-1.5 text-sm font-mono text-[#4D5E53]">Oculto no treino</div>
                ) : (
                  <>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span
                        className={`font-mono tabular-nums text-xl font-semibold ${
                          result.angularWithinCheck ? 'text-[#1B5E20]' : 'text-[#B45309]'
                        }`}
                      >
                        {formatDms(result.erroAngular, true)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#4D5E53] mt-0.5 font-mono tabular-nums">
                      Corr.: {formatDms(result.correcaoAngular, true)} / vértice ·{' '}
                      {result.angularWithinCheck ? 'Dentro da conferência' : 'Atenção ao fechamento'}
                    </div>
                  </>
                )}
              </div>

              <div className="p-4">
                <div className="text-xs text-[#4D5E53]">Erro linear (El) e precisão</div>
                {mode === 'practice' ? (
                  <div className="mt-1.5 text-sm font-mono text-[#4D5E53]">Oculto no treino</div>
                ) : (
                  <>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span
                        className={`font-mono tabular-nums text-xl font-semibold ${
                          result.erroLinear < 0.05 ? 'text-[#1B5E20]' : 'text-[#B91C1C]'
                        }`}
                      >
                        {formatBr(result.erroLinear, 3)}
                      </span>
                      <span className="text-xs font-mono text-[#4D5E53]">m</span>
                    </div>
                    <div className="text-[11px] text-[#4D5E53] mt-0.5 font-mono tabular-nums">
                      Precisão:{' '}
                      {Number.isFinite(result.precisao)
                        ? `1 : ${formatBr(result.precisao, 0)}`
                        : 'Fechamento exato'}
                    </div>
                  </>
                )}
              </div>

              <div className="p-4">
                <div className="text-xs text-[#4D5E53]">Área final (Método de Gauss)</div>
                {mode === 'practice' ? (
                  <div className="mt-1.5 text-sm font-mono text-[#4D5E53]">Oculta no treino</div>
                ) : (
                  <>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="font-mono tabular-nums text-xl font-semibold text-[#1B5E20]">
                        {formatBr(result.areaM2, 2)}
                      </span>
                      <span className="text-xs font-mono text-[#4D5E53]">m²</span>
                    </div>
                    <div className="text-[11px] text-[#4D5E53] mt-0.5 font-mono tabular-nums">
                      {formatBr(result.areaHa, 4)} hectares (ha)
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Bancada Assimétrica em Duas Zonas: Palco Espacial (62%) + Inspetor Posicional (38%) */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.62fr)_minmax(340px,1fr)] gap-5 items-stretch">
              {/* Palco Principal: Alternador Mapa Aberto <-> Croqui Cartesiano */}
              <div className="bg-white border border-[#DDE3DC] rounded-lg overflow-hidden flex flex-col min-h-[540px]">
                {/* Sub-abas limpas do Palco Espacial */}
                <div className="px-4 py-2.5 border-b border-[#DDE3DC] bg-[#F7F8F5] flex flex-wrap items-center justify-between gap-2 no-print">
                  <div className="inline-flex items-center p-0.5 bg-[#EFF3EE] border border-[#DDE3DC] rounded-md">
                    <button
                      type="button"
                      onClick={() => {
                        setStageView('mapa');
                        setActiveNav('mapa');
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                        stageView === 'mapa'
                          ? 'bg-white text-[#17211A] shadow-xs'
                          : 'text-[#4D5E53] hover:text-[#17211A]'
                      }`}
                    >
                      Mapa Aberto (Satélite / OSM)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStageView('croqui');
                        setActiveNav('croqui');
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                        stageView === 'croqui'
                          ? 'bg-white text-[#17211A] shadow-xs'
                          : 'text-[#4D5E53] hover:text-[#17211A]'
                      }`}
                    >
                      Croqui Cartesiano (X, Y + Erro El)
                    </button>
                  </div>

                  <span className="text-[11px] text-[#4D5E53]">
                    Clique em qualquer vértice para inspecionar rumo e azimute
                  </span>
                </div>

                <div className="flex-1 flex flex-col">
                  {stageView === 'mapa' ? (
                    <OpenMapView
                      survey={survey}
                      result={result}
                      projectedLatLngs={geoProjection.latLngs}
                      utmZone={geoProjection.utmZone}
                      hemisphere={geoProjection.hemisphere}
                      isRealUtm={geoProjection.isRealUtm}
                      selectedIndex={safeSelectedIndex}
                      onSelectIndex={setSelectedIndex}
                      onApplyMapPolygon={handleApplyMapPolygon}
                      onReverseWinding={handleReverseWinding}
                      mode={mode}
                    />
                  ) : (
                    <CartesianSketch
                      survey={survey}
                      result={result}
                      selectedIndex={safeSelectedIndex}
                      onSelectIndex={setSelectedIndex}
                      mode={mode}
                    />
                  )}
                </div>
              </div>

              {/* Deck Lateral: Inspetor Posicional do Vértice */}
              <VertexInspector
                survey={survey}
                result={result}
                selectedIndex={safeSelectedIndex}
                onSelectIndex={setSelectedIndex}
                mode={mode}
                vertexLatLng={geoProjection.latLngs[safeSelectedIndex]}
                utmZone={geoProjection.utmZone}
                hemisphere={geoProjection.hemisphere}
              />
            </div>

            {/* Faixa Inferior Integrada: Planilha Editável + 7 Etapas ou Treino Guiado */}
            <div ref={planilhaRef} className="space-y-5 pt-1">
              <FieldSheetTable
                survey={survey}
                result={result}
                selectedIndex={safeSelectedIndex}
                onSelectIndex={setSelectedIndex}
                onUpdateSurvey={(updater) => setSurvey(updater)}
                mode={mode}
              />

              {mode === 'demo' ? (
                <CalculationSteps
                  survey={survey}
                  result={result}
                  selectedIndex={safeSelectedIndex}
                  onSelectIndex={setSelectedIndex}
                />
              ) : (
                <GuidedPracticePanel survey={survey} result={result} />
              )}
            </div>
          </>
        )}
      </main>

      {/* Rodapé discreto */}
      <footer className="border-t border-[#DDE3DC] bg-white mt-8 no-print">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4D5E53]">
          <span>
            Caderneta Planimétrica · Estudo e demonstração de levantamentos topográficos fechados
          </span>
          <span>
            Referência: WGS84 / SIRGAS 2000 · Compensação linear por Bowditch · Área por Gauss
          </span>
        </div>
      </footer>
    </div>
  );
}
