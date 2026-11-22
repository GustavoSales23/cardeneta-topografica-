import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Check,
  Crosshair,
  Layers,
  Maximize2,
  PenTool,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  LatLngPoint,
  SurveyState,
  TraverseResult,
  azimuthToRumo,
  formatBr,
  formatDms,
} from '../lib/topography';
import {
  azimuthBetweenUtm,
  computeUtmScaleFactorCheck,
  latLngPolygonToSurvey,
  latLngToUtm,
} from '../lib/geo';

interface OpenMapViewProps {
  survey: SurveyState;
  result: TraverseResult;
  projectedLatLngs: LatLngPoint[];
  utmZone: number;
  hemisphere: 'N' | 'S';
  isRealUtm: boolean;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  onApplyMapPolygon: (points: LatLngPoint[], wasEdited?: boolean) => void;
  onReverseWinding: () => void;
  mode: 'demo' | 'practice';
}

export function OpenMapView({
  survey,
  result,
  projectedLatLngs,
  utmZone,
  hemisphere,
  isRealUtm,
  selectedIndex,
  onSelectIndex,
  onApplyMapPolygon,
  onReverseWinding,
  mode,
}: OpenMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const satLayerRef = useRef<L.TileLayer | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const featureGroupRef = useRef<L.LayerGroup | null>(null);
  const drawGroupRef = useRef<L.LayerGroup | null>(null);
  const searchMarkerRef = useRef<L.CircleMarker | null>(null);

  const [baseLayer, setBaseLayer] = useState<'sat' | 'osm'>('sat');
  const [maxNativeZoom, setMaxNativeZoom] = useState<number>(17);
  const [showEdgeLabels, setShowEdgeLabels] = useState<boolean>(true);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [draftPoints, setDraftPoints] = useState<LatLngPoint[]>([]);
  const [cursorLatLng, setCursorLatLng] = useState<LatLngPoint | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMsg, setSearchMsg] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const isDrawingRef = useRef(isDrawing);
  isDrawingRef.current = isDrawing;
  const draftPointsRef = useRef(draftPoints);
  draftPointsRef.current = draftPoints;

  // Inicializa o mapa Leaflet uma única vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-13.1167, -60.5444],
      zoom: 16,
      zoomControl: true,
    });

    const sat = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxNativeZoom: 17,
        maxZoom: 20,
        attribution: 'Satélite © Esri World Imagery',
      }
    ).addTo(map);

    const osm = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxNativeZoom: 19,
        maxZoom: 20,
        attribution: '© OpenStreetMap',
      }
    );

    const fg = L.layerGroup().addTo(map);
    const dg = L.layerGroup().addTo(map);

    mapRef.current = map;
    satLayerRef.current = sat;
    osmLayerRef.current = osm;
    featureGroupRef.current = fg;
    drawGroupRef.current = dg;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!isDrawingRef.current) return;
      const pt = { lat: e.latlng.lat, lng: e.latlng.lng };
      setDraftPoints((prev) => [...prev, pt]);
    });

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    map.on('mouseout', () => {
      setCursorLatLng(null);
    });

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Alterna camada base (Satélite Esri vs OSM)
  useEffect(() => {
    const map = mapRef.current;
    const sat = satLayerRef.current;
    const osm = osmLayerRef.current;
    if (!map || !sat || !osm) return;
    if (baseLayer === 'sat') {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(sat)) sat.addTo(map);
    } else {
      if (map.hasLayer(sat)) map.removeLayer(sat);
      if (!map.hasLayer(osm)) osm.addTo(map);
    }
  }, [baseLayer]);

  // Atualiza zoom nativo máximo do satélite
  useEffect(() => {
    const sat = satLayerRef.current;
    if (!sat) return;
    sat.options.maxNativeZoom = maxNativeZoom;
    sat.redraw();
  }, [maxNativeZoom]);

  // Cursor de mira quando desenhando
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.cursor = isDrawing ? 'crosshair' : '';
  }, [isDrawing]);

  // Auto-enquadra quando troca de levantamento/preset
  useEffect(() => {
    const map = mapRef.current;
    if (!map || projectedLatLngs.length < 3 || isDrawing) return;
    const bounds = L.latLngBounds(projectedLatLngs.map((p) => [p.lat, p.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.28), { maxZoom: 18, animate: false });
    }
  }, [survey.id]);

  // Renderiza o polígono principal, vértices arrastáveis, rótulos de lados e rosa posicional no vértice ativo
  useEffect(() => {
    const map = mapRef.current;
    const fg = featureGroupRef.current;
    if (!map || !fg) return;

    fg.clearLayers();
    if (isDrawing || projectedLatLngs.length < 3) return;

    const latLngTuples: [number, number][] = projectedLatLngs.map((p) => [p.lat, p.lng]);

    // Polígono compensado principal
    L.polygon(latLngTuples, {
      color: '#1B5E20',
      weight: 2.6,
      fillColor: '#1B5E20',
      fillOpacity: 0.16,
    }).addTo(fg);

    // Destaque do alinhamento ativo
    const activeSt = result.stations[selectedIndex];
    if (activeSt && projectedLatLngs[selectedIndex]) {
      const nextIdx = (selectedIndex + 1) % projectedLatLngs.length;
      L.polyline(
        [
          [projectedLatLngs[selectedIndex].lat, projectedLatLngs[selectedIndex].lng],
          [projectedLatLngs[nextIdx].lat, projectedLatLngs[nextIdx].lng],
        ],
        {
          color: '#0B5CAD',
          weight: 4,
          opacity: 0.95,
        }
      ).addTo(fg);
    }

    // Rótulos de alinhamentos + pontos médios para inserir novo vértice
    result.stations.forEach((st, i) => {
      const a = projectedLatLngs[i];
      const b = projectedLatLngs[(i + 1) % projectedLatLngs.length];
      if (!a || !b) return;
      const midLat = (a.lat + b.lat) / 2;
      const midLng = (a.lng + b.lng) / 2;
      const isSelected = i === selectedIndex;

      if (showEdgeLabels) {
        const txt =
          mode === 'practice'
            ? `${st.alinhamento} · ${formatBr(st.distancia, 2)} m`
            : `${formatBr(st.distancia, 2)} m · Az ${formatDms(st.azVante)} · ${st.rumo.formatted}`;
        L.tooltip({
          permanent: true,
          direction: 'center',
          className: isSelected
            ? 'topo-edge-label topo-edge-label-active'
            : 'topo-edge-label',
        })
          .setLatLng([midLat, midLng])
          .setContent(txt)
          .addTo(fg);
      }

      // Alça discreta "+" no meio da aresta para inserir novo vértice
      const midIcon = L.divIcon({
        className: 'topo-midpoint-icon',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        html: `<div title="Inserir vértice em ${st.alinhamento}" style="width:16px;height:16px;border-radius:999px;background:rgba(255,255,255,0.88);border:1px solid #1B5E20;color:#1B5E20;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;opacity:0.78;">+</div>`,
      });
      const midMarker = L.marker([midLat, midLng], { icon: midIcon }).addTo(fg);
      midMarker.on('click', () => {
        const nextPts = [...projectedLatLngs];
        nextPts.splice(i + 1, 0, { lat: midLat, lng: midLng });
        onApplyMapPolygon(nextPts, true);
        onSelectIndex(i + 1);
      });
    });

    // Vértices arrastáveis com marcador posicional e anel de bússola no vértice selecionado
    result.stations.forEach((st, i) => {
      const pt = projectedLatLngs[i];
      if (!pt) return;
      const isSelected = i === selectedIndex;

      // Se selecionado e no Modo Demonstração, desenha anel com seta do Norte + arco do Azimute direto no vértice do mapa!
      const compassRingHtml =
        isSelected && mode === 'demo'
          ? (() => {
              const r = 24;
              const az = Math.max(1, Math.min(359, st.azVante));
              const rad = (az * Math.PI) / 180;
              const ex = 32 + r * Math.sin(rad);
              const ey = 32 - r * Math.cos(rad);
              const largeArc = az > 180 ? 1 : 0;
              return `
                <svg width="64" height="64" viewBox="0 0 64 64" style="position:absolute;left:-20px;top:-20px;pointer-events:none;overflow:visible;">
                  <circle cx="32" cy="32" r="24" fill="rgba(255,255,255,0.22)" stroke="#FFFFFF" stroke-width="1.2" stroke-dasharray="2 2"/>
                  <line x1="32" y1="32" x2="32" y2="3" stroke="#FFFFFF" stroke-width="2.4"/>
                  <line x1="32" y1="32" x2="32" y2="3" stroke="#17211A" stroke-width="1.2"/>
                  <text x="32" y="-1" text-anchor="middle" fill="#FFFFFF" stroke="#17211A" stroke-width="2.5" paint-order="stroke" font-size="9" font-family="IBM Plex Mono, monospace" font-weight="700">N</text>
                  <path d="M 32 8 A 24 24 0 ${largeArc} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="#0B5CAD" stroke-width="2.8"/>
                </svg>
              `;
            })()
          : '';

      const icon = L.divIcon({
        className: 'topo-vertex-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        html: `
          <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
            ${compassRingHtml}
            <div style="position:relative;z-index:2;min-width:24px;height:24px;padding:0 4px;border-radius:999px;background:${
              isSelected ? '#0B5CAD' : '#1B5E20'
            };border:2px solid #FFFFFF;color:#FFFFFF;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:grab;">
              ${st.label}
            </div>
          </div>
        `,
      });

      const marker = L.marker([pt.lat, pt.lng], {
        icon,
        draggable: true,
        zIndexOffset: isSelected ? 600 : 200,
      }).addTo(fg);

      marker.on('click', () => {
        onSelectIndex(i);
      });

      marker.on('dragend', () => {
        const newPos = marker.getLatLng();
        const updated = projectedLatLngs.map((p, idx) =>
          idx === i ? { lat: newPos.lat, lng: newPos.lng } : p
        );
        onApplyMapPolygon(updated, true);
        onSelectIndex(i);
      });
    });
  }, [projectedLatLngs, result, selectedIndex, showEdgeLabels, isDrawing, mode]);

  // Renderiza o rascunho interativo enquanto o usuário desenha no mapa
  useEffect(() => {
    const dg = drawGroupRef.current;
    if (!dg) return;
    dg.clearLayers();
    if (!isDrawing || draftPoints.length === 0) return;

    const coords: [number, number][] = draftPoints.map((p) => [p.lat, p.lng]);

    if (draftPoints.length >= 2) {
      L.polyline(coords, {
        color: '#1B5E20',
        weight: 2.5,
      }).addTo(dg);
    }

    if (draftPoints.length >= 3) {
      L.polygon(coords, {
        color: '#1B5E20',
        weight: 1.5,
        dashArray: '4 4',
        fillColor: '#1B5E20',
        fillOpacity: 0.14,
      }).addTo(dg);
    }

    // Linha elástica de pré-visualização até o cursor com distância e azimute ao vivo
    if (cursorLatLng) {
      const last = draftPoints[draftPoints.length - 1];
      L.polyline(
        [
          [last.lat, last.lng],
          [cursorLatLng.lat, cursorLatLng.lng],
        ],
        {
          color: '#0B5CAD',
          weight: 2,
          dashArray: '5 5',
        }
      ).addTo(dg);

      const u1 = latLngToUtm(last.lat, last.lng);
      const u2 = latLngToUtm(cursorLatLng.lat, cursorLatLng.lng, u1.zone);
      const dist = Math.hypot(u2.e - u1.e, u2.n - u1.n);
      const az = azimuthBetweenUtm(u1, u2);
      const rumo = azimuthToRumo(az);

      L.tooltip({
        permanent: true,
        direction: 'right',
        offset: [12, 0],
        className: 'topo-edge-label topo-edge-label-active',
      })
        .setLatLng([cursorLatLng.lat, cursorLatLng.lng])
        .setContent(`${formatBr(dist, 1)} m · Az ${formatDms(az)} · ${rumo.formatted}`)
        .addTo(dg);
    }

    draftPoints.forEach((pt, idx) => {
      const isFirst = idx === 0;
      const icon = L.divIcon({
        className: 'topo-vertex-icon',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        html: `<div style="width:22px;height:22px;border-radius:999px;background:${
          isFirst ? '#0B5CAD' : '#1B5E20'
        };border:2px solid #FFFFFF;color:#FFFFFF;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:pointer;">P${
          idx + 1
        }</div>`,
      });
      const m = L.marker([pt.lat, pt.lng], { icon }).addTo(dg);
      if (isFirst && draftPoints.length >= 3) {
        m.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          finishDrawing();
        });
      }
    });
  }, [isDrawing, draftPoints, cursorLatLng]);

  const startDrawing = () => {
    setDraftPoints([]);
    setIsDrawing(true);
    setSearchMsg('Clique no mapa para lançar os vértices P1, P2, P3... Clique em P1 ou em "Fechar polígono" para finalizar.');
  };

  const finishDrawing = () => {
    const pts = draftPointsRef.current;
    if (pts.length < 3) {
      setSearchMsg('Marque pelo menos 3 vértices no mapa para fechar a poligonal.');
      return;
    }
    const { wasReversed } = latLngPolygonToSurvey(pts, { ensureCcw: true });
    onApplyMapPolygon(pts, false);
    setIsDrawing(false);
    setDraftPoints([]);
    setSearchMsg(
      wasReversed
        ? 'Poligonal sincronizada em UTM e normalizada para sentido anti-horário (compatível com a Folha de Fórmulas).'
        : 'Poligonal sincronizada em UTM com a planilha e as 7 etapas.'
    );
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDraftPoints([]);
    setSearchMsg('');
  };

  const handleFitBounds = () => {
    const map = mapRef.current;
    if (!map || projectedLatLngs.length < 3) return;
    const b = L.latLngBounds(projectedLatLngs.map((p) => [p.lat, p.lng]));
    if (b.isValid()) map.fitBounds(b.pad(0.25), { maxZoom: 18 });
  };

  const handleSearch = async () => {
    const txt = searchQuery.trim();
    const map = mapRef.current;
    if (!txt || !map) return;

    // Aceita coordenadas diretas: "-13.1167, -60.5444" ou "-13,1167; -60,5444"
    const normalized = txt.includes(';') ? txt.replace(/,/g, '.').split(';').join(' ') : txt;
    const coordMatch = normalized.match(/^\s*(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)\s*$/);
    let lat: number | null = null;
    let lng: number | null = null;

    if (coordMatch) {
      lat = parseFloat(coordMatch[1]);
      lng = parseFloat(coordMatch[2]);
    } else {
      setIsSearching(true);
      setSearchMsg('Buscando endereço...');
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(txt)}`
        );
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          setSearchMsg('Endereço não encontrado. Tente cidade/UF ou coordenadas decimais.');
          setIsSearching(false);
          return;
        }
        lat = parseFloat(data[0].lat);
        lng = parseFloat(data[0].lon);
      } catch {
        setSearchMsg('Não foi possível consultar o endereço. Verifique a conexão ou informe lat, lng.');
        setIsSearching(false);
        return;
      } finally {
        setIsSearching(false);
      }
    }

    if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setSearchMsg('Coordenadas fora do intervalo válido.');
      return;
    }

    map.setView([lat, lng], 16);
    if (searchMarkerRef.current) {
      map.removeLayer(searchMarkerRef.current);
    }
    searchMarkerRef.current = L.circleMarker([lat, lng], {
      radius: 6,
      color: '#0B5CAD',
      fillColor: '#FFFFFF',
      fillOpacity: 1,
      weight: 2.5,
    }).addTo(map);
    setSearchMsg(`Centralizado em ${lat.toFixed(5)}°, ${lng.toFixed(5)}°`);
  };

  const activeSt = result.stations[Math.min(selectedIndex, Math.max(0, result.stations.length - 1))];
  const activeLatLng = projectedLatLngs[selectedIndex];
  const utmScaleCheck =
    projectedLatLngs.length >= 3 ? computeUtmScaleFactorCheck(projectedLatLngs, utmZone) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Barra de busca e ferramentas do Mapa Aberto */}
      <div className="px-3.5 py-2.5 border-b border-[#DDE3DC] bg-white space-y-2 no-print">
        <div className="flex flex-wrap items-center gap-2">
          {/* Busca por endereço ou coordenadas */}
          <div className="flex items-center flex-1 min-w-[220px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Buscar cidade, endereço ou lat, lng (ex: -13.1167, -60.5444)"
              className="w-full h-8 px-2.5 text-xs bg-[#F7F8F5] border border-[#DDE3DC] rounded-l text-[#17211A] placeholder:text-[#74857A] focus:outline-none focus:border-[#1B5E20]"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
              className="h-8 px-3 text-xs font-medium bg-[#1B5E20] text-white rounded-r hover:bg-[#144818] transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              {isSearching ? 'Buscando' : 'Ir'}
            </button>
          </div>

          {/* Seletor de mapa base */}
          <div className="inline-flex items-center p-0.5 bg-[#EFF3EE] rounded border border-[#DDE3DC] shrink-0">
            <button
              type="button"
              onClick={() => setBaseLayer('sat')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                baseLayer === 'sat'
                  ? 'bg-white text-[#17211A] shadow-xs'
                  : 'text-[#4D5E53] hover:text-[#17211A]'
              }`}
            >
              Satélite
            </button>
            <button
              type="button"
              onClick={() => setBaseLayer('osm')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                baseLayer === 'osm'
                  ? 'bg-white text-[#17211A] shadow-xs'
                  : 'text-[#4D5E53] hover:text-[#17211A]'
              }`}
            >
              Mapa OSM
            </button>
          </div>

          {baseLayer === 'sat' && (
            <label
              className="inline-flex items-center gap-1.5 text-xs text-[#4D5E53] shrink-0"
              title="Maior zoom nativo do satélite na sua região. Reduza se aparecer imagem indisponível."
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Zoom sat.</span>
              <input
                type="number"
                min={10}
                max={19}
                value={maxNativeZoom}
                onChange={(e) => setMaxNativeZoom(Math.min(19, Math.max(10, Number(e.target.value) || 17)))}
                className="w-12 h-8 px-1.5 text-xs font-mono tabular-nums bg-[#F7F8F5] border border-[#DDE3DC] rounded text-center text-[#17211A]"
              />
            </label>
          )}
        </div>

        {/* Linha de ações de desenho e edição */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {!isDrawing ? (
              <button
                type="button"
                onClick={startDrawing}
                className="h-8 px-3 text-xs font-medium bg-[#1B5E20] text-white rounded hover:bg-[#144818] transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <PenTool className="w-3.5 h-3.5" /> Desenhar polígono no mapa
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={finishDrawing}
                  disabled={draftPoints.length < 3}
                  className="h-8 px-3 text-xs font-medium bg-[#1B5E20] text-white rounded hover:bg-[#144818] disabled:opacity-45 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Check className="w-3.5 h-3.5" /> Fechar polígono ({draftPoints.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDraftPoints((p) => p.slice(0, -1))}
                  disabled={draftPoints.length === 0}
                  className="h-8 px-2.5 text-xs font-medium border border-[#DDE3DC] text-[#17211A] rounded hover:bg-[#EFF3EE] disabled:opacity-45 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Desfazer ponto
                </button>
                <button
                  type="button"
                  onClick={cancelDrawing}
                  className="h-8 px-2.5 text-xs font-medium border border-[#DDE3DC] text-[#B91C1C] rounded hover:bg-[#FEF2F2] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Cancelar
                </button>
              </>
            )}

            {!isDrawing && (
              <>
                <button
                  type="button"
                  onClick={handleFitBounds}
                  className="h-8 px-2.5 text-xs font-medium border border-[#DDE3DC] text-[#17211A] rounded hover:bg-[#EFF3EE] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Enquadrar
                </button>
                <button
                  type="button"
                  onClick={onReverseWinding}
                  title="Inverte a ordem dos vértices entre sentido anti-horário e horário"
                  className="h-8 px-2.5 text-xs font-medium border border-[#DDE3DC] text-[#17211A] rounded hover:bg-[#EFF3EE] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Sentido: {survey.winding === 'ccw' ? 'Anti-horário' : 'Horário'}
                </button>
              </>
            )}
          </div>

          <label className="inline-flex items-center gap-1.5 text-xs text-[#4D5E53] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showEdgeLabels}
              onChange={(e) => setShowEdgeLabels(e.target.checked)}
              className="accent-[#1B5E20] rounded"
            />
            <span>Exibir Azimute e Rumo nos lados</span>
          </label>
        </div>

        {/* Mensagem de instrução ou nota de projeção */}
        {(searchMsg || !isRealUtm) && (
          <div className="text-[11px] text-[#4D5E53] flex items-center gap-2 pt-0.5">
            <Crosshair className="w-3.5 h-3.5 text-[#1B5E20] shrink-0" />
            <span>
              {searchMsg ||
                'Levantamento com coordenadas locais (P1 = 1000, 1000) ancorado sobre Colorado do Oeste (RO) para inspeção visual. Arraste qualquer vértice ou desenhe um novo polígono para trabalhar em UTM real.'}
            </span>
          </div>
        )}
      </div>

      {/* Container do Mapa Leaflet */}
      <div className="relative flex-1 min-h-[430px]">
        <div ref={containerRef} className="w-full h-full min-h-[430px] z-0" />

        {/* HUD Posicional do Vértice Selecionado diretamente sobre o Mapa */}
        {!isDrawing && activeSt && activeLatLng && mode === 'demo' && (
          <div className="absolute bottom-3 left-3 z-[400] bg-white/95 border border-[#DDE3DC] rounded-md px-3 py-2 shadow-sm max-w-[330px] pointer-events-auto">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#17211A]">
              <span>
                Vértice {activeSt.label} · Lado {activeSt.alinhamento}
              </span>
              <span className="font-mono tabular-nums text-[#1B5E20]">
                {formatBr(activeSt.distancia, 2)} m
              </span>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] font-mono tabular-nums text-[#17211A]">
              <span>Az Vante: {formatDms(activeSt.azVante)}</span>
              <span>Rumo: {activeSt.rumo.formatted}</span>
              <span>AI: {formatDms(activeSt.aiCorrDec)}</span>
              <span>Az Ré: {formatDms(activeSt.azRe)}</span>
            </div>
            <div className="mt-1 pt-1 border-t border-[#DDE3DC] text-[10.5px] font-mono tabular-nums text-[#4D5E53]">
              WGS84: {activeLatLng.lat.toFixed(5)}°, {activeLatLng.lng.toFixed(5)}° · UTM {utmZone}
              {hemisphere}
            </div>
          </div>
        )}

        {/* Leitura de coordenadas do cursor + conferência UTM */}
        <div className="absolute bottom-3 right-3 z-[400] bg-white/95 border border-[#DDE3DC] rounded px-2.5 py-1 text-[11px] font-mono tabular-nums text-[#17211A] pointer-events-none">
          {cursorLatLng
            ? `${cursorLatLng.lat.toFixed(5)}°, ${cursorLatLng.lng.toFixed(5)}°`
            : utmScaleCheck && isRealUtm
              ? `UTM ${utmZone}${hemisphere} · k = ${utmScaleCheck.scaleK.toFixed(6)}`
              : `Arraste os vértices P1–P${result.n} para editar`}
        </div>
      </div>
    </div>
  );
}
