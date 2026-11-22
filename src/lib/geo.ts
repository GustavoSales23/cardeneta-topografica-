import {
  LatLngPoint,
  SurveyState,
  SurveyVertexInput,
  TraverseResult,
  decToDms,
  normalizeAzimuth,
} from './topography';

// Constantes do elipsoide WGS84 / GRS80 (equivalente ao SIRGAS 2000 para topografia)
const WGS84_A = 6378137.0;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);
const WGS84_EP2 = WGS84_E2 / (1 - WGS84_E2);
const UTM_K0 = 0.9996;
const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

export interface UtmPoint {
  e: number;
  n: number;
  zone: number;
  hemisphere: 'N' | 'S';
}

export function getUtmZone(lng: number): number {
  return Math.floor((lng + 180) / 6) + 1;
}

export function latLngToUtm(lat: number, lng: number, forcedZone?: number): UtmPoint {
  const zone = forcedZone ?? getUtmZone(lng);
  const hemisphere: 'N' | 'S' = lat < 0 ? 'S' : 'N';
  const phi = lat * DEG2RAD;
  const lambda0 = ((zone - 1) * 6 - 180 + 3) * DEG2RAD;
  const dLambda = lng * DEG2RAD - lambda0;

  const sinP = Math.sin(phi);
  const cosP = Math.cos(phi);
  const tanP = Math.tan(phi);

  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinP * sinP);
  const T = tanP * tanP;
  const C = WGS84_EP2 * cosP * cosP;
  const A = dLambda * cosP;

  const M =
    WGS84_A *
    ((1 - WGS84_E2 / 4 - (3 * WGS84_E2 ** 2) / 64 - (5 * WGS84_E2 ** 3) / 256) * phi -
      ((3 * WGS84_E2) / 8 + (3 * WGS84_E2 ** 2) / 32 + (45 * WGS84_E2 ** 3) / 1024) *
        Math.sin(2 * phi) +
      ((15 * WGS84_E2 ** 2) / 256 + (45 * WGS84_E2 ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * WGS84_E2 ** 3) / 3072) * Math.sin(6 * phi));

  const e =
    UTM_K0 *
      N *
      (A +
        ((1 - T + C) * A ** 3) / 6 +
        ((5 - 18 * T + T ** 2 + 72 * C - 58 * WGS84_EP2) * A ** 5) / 120) +
    500000;

  let n =
    UTM_K0 *
    (M +
      N *
        tanP *
        (A ** 2 / 2 +
          ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 +
          ((61 - 58 * T + T ** 2 + 600 * C - 330 * WGS84_EP2) * A ** 6) / 720));

  if (lat < 0) n += 10000000;

  return { e, n, zone, hemisphere };
}

export function utmToLatLng(
  e: number,
  n: number,
  zone: number,
  hemisphere: 'N' | 'S'
): LatLngPoint {
  const x = e - 500000;
  const y = hemisphere === 'S' ? n - 10000000 : n;

  const M = y / UTM_K0;
  const mu =
    M /
    (WGS84_A *
      (1 - WGS84_E2 / 4 - (3 * WGS84_E2 ** 2) / 64 - (5 * WGS84_E2 ** 3) / 256));

  const e1 = (1 - Math.sqrt(1 - WGS84_E2)) / (1 + Math.sqrt(1 - WGS84_E2));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sinP1 = Math.sin(phi1);
  const cosP1 = Math.cos(phi1);
  const tanP1 = Math.tan(phi1);

  const N1 = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinP1 * sinP1);
  const T1 = tanP1 * tanP1;
  const C1 = WGS84_EP2 * cosP1 * cosP1;
  const R1 = (WGS84_A * (1 - WGS84_E2)) / Math.pow(1 - WGS84_E2 * sinP1 * sinP1, 1.5);
  const D = x / (N1 * UTM_K0);

  const lat =
    phi1 -
    ((N1 * tanP1) / R1) *
      (D ** 2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * WGS84_EP2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * WGS84_EP2 - 3 * C1 ** 2) *
          D ** 6) /
          720);

  const lambda0 = ((zone - 1) * 6 - 180 + 3) * DEG2RAD;
  const lng =
    lambda0 +
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * WGS84_EP2 + 24 * T1 ** 2) * D ** 5) /
        120) /
      cosP1;

  return {
    lat: lat * RAD2DEG,
    lng: lng * RAD2DEG,
  };
}

/**
 * Determina se um polígono em coordenadas cartesianas (E, N) está em sentido anti-horário (CCW).
 * Área sinalizada > 0 significa anti-horário.
 */
export function isCounterClockwise(pts: { e: number; n: number }[]): boolean {
  let signedArea2 = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    signedArea2 += a.e * b.n - b.e * a.n;
  }
  return signedArea2 > 0;
}

/**
 * Calcula azimute topográfico (0° = Norte, horário) entre dois pontos UTM (E, N).
 */
export function azimuthBetweenUtm(
  a: { e: number; n: number },
  b: { e: number; n: number }
): number {
  const dx = b.e - a.e;
  const dy = b.n - a.n;
  return normalizeAzimuth(Math.atan2(dx, dy) * RAD2DEG);
}

/**
 * Converte um polígono desenhado no Mapa Aberto (Lat/Lng) diretamente para um SurveyState
 * completo em UTM com distâncias, ângulos internos (° ′ ″), Azimute P1→P2 e coordenadas E1, N1.
 * Normaliza para sentido anti-horário (CCW) quando `ensureCcw = true` para aderir 100% à regra do professor.
 */
export function latLngPolygonToSurvey(
  rawPoints: LatLngPoint[],
  options?: {
    title?: string;
    subtitle?: string;
    ensureCcw?: boolean;
    source?: SurveyState['source'];
  }
): { survey: SurveyState; wasReversed: boolean } {
  const ensureCcw = options?.ensureCcw ?? true;
  const avgLng = rawPoints.reduce((s, p) => s + p.lng, 0) / rawPoints.length;
  const avgLat = rawPoints.reduce((s, p) => s + p.lat, 0) / rawPoints.length;
  const zone = getUtmZone(avgLng);
  const hemisphere: 'N' | 'S' = avgLat < 0 ? 'S' : 'N';

  let orderedLatLngs = [...rawPoints];
  let utmPts = orderedLatLngs.map((p) => latLngToUtm(p.lat, p.lng, zone));

  let wasReversed = false;
  if (ensureCcw && !isCounterClockwise(utmPts)) {
    // Mantém P1 fixo e inverte o restante para manter o vértice inicial do usuário como P1
    orderedLatLngs = [orderedLatLngs[0], ...orderedLatLngs.slice(1).reverse()];
    utmPts = orderedLatLngs.map((p) => latLngToUtm(p.lat, p.lng, zone));
    wasReversed = true;
  }

  const n = utmPts.length;
  const ccw = isCounterClockwise(utmPts);

  // Calcula azimute de cada lado Pi -> P_{i+1}
  const edgeAz: number[] = [];
  const edgeDist: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = utmPts[i];
    const b = utmPts[(i + 1) % n];
    edgeAz.push(azimuthBetweenUtm(a, b));
    edgeDist.push(Math.hypot(b.e - a.e, b.n - a.n));
  }

  // Ângulo interno exato em cada vértice i:
  // Em polígono anti-horário (CCW): Az(i→next) = (Az(prev→i) + AI_i + 180°) mod 360°
  // Logo: AI_i = (Az(i→next) - Az_ré(i→prev)) mod 360° = (Az(i→next) - Az(prev→i) - 180°) mod 360°
  const vertices: SurveyVertexInput[] = [];
  for (let i = 0; i < n; i++) {
    const prevIdx = (i - 1 + n) % n;
    const azPrev = edgeAz[prevIdx];
    const azNext = edgeAz[i];
    const aiDec = ccw
      ? normalizeAzimuth(azNext - azPrev - 180)
      : normalizeAzimuth(azPrev + 180 - azNext);
    const dms = decToDms(aiDec);
    vertices.push({
      id: `v-${i + 1}`,
      label: `P${i + 1}`,
      distancia: Number(edgeDist[i].toFixed(2)),
      aiDeg: dms.d,
      aiMin: dms.m,
      aiSec: dms.s,
    });
  }

  const az12Dms = decToDms(edgeAz[0]);

  const survey: SurveyState = {
    id: `map-${Date.now()}`,
    title: options?.title ?? 'Levantamento no Mapa Aberto',
    subtitle:
      options?.subtitle ??
      `Poligonal de ${n} vértices extraída sobre satélite · UTM Fuso ${zone}${hemisphere} (WGS84 / SIRGAS 2000)`,
    source: options?.source ?? 'mapa',
    vertices,
    azMode: 'vante',
    azDeg: az12Dms.d,
    azMin: az12Dms.m,
    azSec: az12Dms.s,
    x1: Number(utmPts[0].e.toFixed(2)),
    y1: Number(utmPts[0].n.toFixed(2)),
    winding: ccw ? 'ccw' : 'cw',
    geoOrigin: {
      latLngs: orderedLatLngs,
      utmZone: zone,
      hemisphere,
      anchorLat: orderedLatLngs[0].lat,
      anchorLng: orderedLatLngs[0].lng,
      isRealUtm: true,
    },
  };

  return { survey, wasReversed };
}

/**
 * Projeta qualquer poligonal (mesmo local como P1 = 1000, 1000 da Prova) para coordenadas WGS84
 * ao redor de uma âncora geográfica (padrão: IFRO Campus Colorado do Oeste, RO),
 * permitindo inspecionar e arrastar qualquer levantamento sobre o Mapa Aberto.
 */
export const DEFAULT_ANCHOR_IFRO: LatLngPoint = {
  lat: -13.1167,
  lng: -60.5444,
};

export function projectTraverseToLatLngs(
  survey: SurveyState,
  result: TraverseResult
): {
  latLngs: LatLngPoint[];
  utmZone: number;
  hemisphere: 'N' | 'S';
  isRealUtm: boolean;
} {
  const anchorLat = survey.geoOrigin?.anchorLat ?? DEFAULT_ANCHOR_IFRO.lat;
  const anchorLng = survey.geoOrigin?.anchorLng ?? DEFAULT_ANCHOR_IFRO.lng;
  const zone = survey.geoOrigin?.utmZone ?? getUtmZone(anchorLng);
  const hemisphere: 'N' | 'S' = survey.geoOrigin?.hemisphere ?? (anchorLat < 0 ? 'S' : 'N');

  if (survey.geoOrigin?.isRealUtm) {
    const latLngs = result.stations.map((st) =>
      utmToLatLng(st.xFinal, st.yFinal, zone, hemisphere)
    );
    return { latLngs, utmZone: zone, hemisphere, isRealUtm: true };
  }

  // Ancoragem relativa a partir de P1 local -> UTM da âncora
  const anchorUtm = latLngToUtm(anchorLat, anchorLng, zone);
  const x0 = result.stations[0]?.xFinal ?? survey.x1;
  const y0 = result.stations[0]?.yFinal ?? survey.y1;

  const latLngs = result.stations.map((st) => {
    const e = anchorUtm.e + (st.xFinal - x0);
    const n = anchorUtm.n + (st.yFinal - y0);
    return utmToLatLng(e, n, zone, hemisphere);
  });

  return { latLngs, utmZone: zone, hemisphere, isRealUtm: false };
}

/**
 * Calcula a conferência de área UTM corrigida pelo fator de escala k no centroide
 * (mesmo método técnico utilizado no protótipo do usuário).
 */
export function computeUtmScaleFactorCheck(
  latLngs: LatLngPoint[],
  zone: number
): { areaUtmCorrected: number; scaleK: number } {
  if (latLngs.length < 3) return { areaUtmCorrected: 0, scaleK: 1 };
  const pts = latLngs.map((p) => latLngToUtm(p.lat, p.lng, zone));
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.e * b.n - b.e * a.n;
  }
  const avgE = pts.reduce((acc, p) => acc + p.e, 0) / pts.length;
  const dE = avgE - 500000;
  const k = UTM_K0 * (1 + Math.pow(dE / (UTM_K0 * 6371000), 2) / 2);
  const areaUtmCorrected = Math.abs(s) / 2 / (k * k);
  return { areaUtmCorrected, scaleK: k };
}
