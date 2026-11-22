export interface DmsValue {
  sign: 1 | -1;
  d: number;
  m: number;
  s: number;
}

export interface SurveyVertexInput {
  id: string;
  label: string;
  distancia: number; // metros (alinhamento Pi -> P_{i+1})
  aiDeg: number;
  aiMin: number;
  aiSec: number;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface SurveyState {
  id: string;
  title: string;
  subtitle: string;
  source: 'preset-prova' | 'preset-q28' | 'preset-mapa' | 'mapa' | 'manual';
  vertices: SurveyVertexInput[];
  azMode: 'vante' | 're'; // 'vante' = Az(P1->P2), 're' = Az(P2->P1)
  azDeg: number;
  azMin: number;
  azSec: number;
  x1: number;
  y1: number;
  winding: 'ccw' | 'cw'; // ccw = anti-horário (regra padrão IFRO: Az_ant + AI ± 180°)
  geoOrigin?: {
    latLngs: LatLngPoint[];
    utmZone: number;
    hemisphere: 'N' | 'S';
    anchorLat: number;
    anchorLng: number;
    isRealUtm: boolean;
  };
}

export interface RumoInfo {
  deg: number;
  dms: string;
  q1: 'N' | 'S';
  q2: 'E' | 'W';
  quadrant: 'NE' | 'SE' | 'SW' | 'NW';
  formatted: string;
  formattedDec: string;
}

export interface StationResult {
  index: number;
  id: string;
  label: string;
  nextLabel: string;
  alinhamento: string;
  distancia: number;
  aiObsDec: number;
  aiCorrDec: number;
  azProvisorio: number | null;
  azRuleLabel: string;
  azVante: number;
  azRe: number;
  rumo: RumoInfo;
  dx: number;
  dy: number;
  cx: number;
  cy: number;
  dxCorr: number;
  dyCorr: number;
  xRaw: number;
  yRaw: number;
  xFinal: number;
  yFinal: number;
  gaussXY: number; // X_i * Y_{i+1}
  gaussYX: number; // Y_i * X_{i+1}
}

export interface TraverseResult {
  n: number;
  perimeter: number;
  sumAiTeorica: number;
  sumAiObs: number;
  erroAngular: number; // Σ_calc - Σ_obs (Folha de Fórmulas IFRO)
  correcaoAngular: number; // erroAngular / n
  angularToleranceSec: number; // referência didática (1' * n)
  angularWithinCheck: boolean;
  azInputDec: number;
  azP1P2: number;
  azClosureCheck: number; // Az(Pn->P1) + AI_corr(P1) ± 180° deve fechar com Az(P1->P2)
  azClosureProvisorio: number;
  azClosureRuleLabel: string;
  sumDx: number;
  sumDy: number;
  erroLinear: number;
  precisao: number; // P / El (Infinity se El === 0)
  sumCx: number;
  sumCy: number;
  sumDxCorr: number;
  sumDyCorr: number;
  endRawX: number; // Coordenada bruta de retorno ao P1 (mostra o gap do erro linear)
  endRawY: number;
  gaussSumXY: number;
  gaussSumYX: number;
  areaM2: number;
  areaHa: number;
  stations: StationResult[];
}

const DEG2RAD = Math.PI / 180;

export function dmsToDec(d: number, m: number, s: number): number {
  const safeD = Number.isFinite(d) ? d : 0;
  const safeM = Number.isFinite(m) ? m : 0;
  const safeS = Number.isFinite(s) ? s : 0;
  const sign = safeD < 0 ? -1 : 1;
  return sign * (Math.abs(safeD) + Math.abs(safeM) / 60 + Math.abs(safeS) / 3600);
}

export function decToDms(deg: number): DmsValue {
  const sign: 1 | -1 = deg < 0 ? -1 : 1;
  const totalSec = Math.round(Math.abs(deg) * 3600);
  const d = Math.floor(totalSec / 3600);
  const rem = totalSec - d * 3600;
  const m = Math.floor(rem / 60);
  const s = rem - m * 60;
  return { sign, d, m, s };
}

export function formatDms(deg: number, showPlus = false): string {
  const { sign, d, m, s } = decToDms(deg);
  const prefix = sign < 0 ? '−' : showPlus && (d > 0 || m > 0 || s > 0) ? '+' : '';
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${prefix}${d}°${mm}′${ss}″`;
}

export function formatDmsTex(deg: number, showPlus = false): string {
  const { sign, d, m, s } = decToDms(deg);
  const prefix = sign < 0 ? '-' : showPlus && (d > 0 || m > 0 || s > 0) ? '+' : '';
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${prefix}${d}^\\circ ${mm}' ${ss}''`;
}

export function formatBr(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return '—';
  const cleaned = Math.abs(n) < 1e-10 ? 0 : n;
  return cleaned.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatBrTex(n: number, decimals = 2): string {
  return formatBr(n, decimals).replace(/,/g, '{,}');
}

export function normalizeAzimuth(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

export function azimuthToBack(az: number): number {
  const norm = normalizeAzimuth(az);
  return norm < 180 ? norm + 180 : norm - 180;
}

export function azimuthToRumo(azDeg: number): RumoInfo {
  const az = normalizeAzimuth(azDeg);
  let deg = 0;
  let q1: 'N' | 'S' = 'N';
  let q2: 'E' | 'W' = 'E';

  if (az <= 90) {
    deg = az;
    q1 = 'N';
    q2 = 'E';
  } else if (az <= 180) {
    deg = 180 - az;
    q1 = 'S';
    q2 = 'E';
  } else if (az <= 270) {
    deg = az - 180;
    q1 = 'S';
    q2 = 'W';
  } else {
    deg = 360 - az;
    q1 = 'N';
    q2 = 'W';
  }

  const dms = formatDms(deg);
  const quadrant = `${q1}${q2}` as 'NE' | 'SE' | 'SW' | 'NW';
  return {
    deg,
    dms,
    q1,
    q2,
    quadrant,
    formatted: `${q1} ${dms} ${q2}`,
    formattedDec: `${q1} ${formatBr(deg, 2)}° ${q2}`,
  };
}

/**
 * Aplica exatamente a regra de 3 ramos da Folha de Fórmulas do Professor (IFRO):
 * Az_calculado = Az_anterior + AI_corrigido
 *  - Se < 180°: soma-se 180°
 *  - Se >= 180° e < 540°: subtrai-se 180°
 *  - Se >= 540°: subtrai-se 540°
 * (Para caminhamento horário alternativo: Az_anterior - AI_corrigido + 180° mod 360°)
 */
export function propagateAzimuth(
  azAnterior: number,
  aiCorrigido: number,
  winding: 'ccw' | 'cw'
): { az: number; provisorio: number; ruleLabel: string } {
  if (winding === 'cw') {
    const prov = azAnterior - aiCorrigido + 180;
    const az = normalizeAzimuth(prov);
    return {
      az,
      provisorio: prov,
      ruleLabel: 'Sentido horário (Az_ant − AI + 180°)',
    };
  }

  const prov = azAnterior + aiCorrigido;
  if (prov < 180) {
    return {
      az: normalizeAzimuth(prov + 180),
      provisorio: prov,
      ruleLabel: '< 180° → soma-se 180°',
    };
  }
  if (prov >= 540) {
    return {
      az: normalizeAzimuth(prov - 540),
      provisorio: prov,
      ruleLabel: '≥ 540° → subtrai-se 540°',
    };
  }
  return {
    az: normalizeAzimuth(prov - 180),
    provisorio: prov,
    ruleLabel: '≥ 180° → subtrai-se 180°',
  };
}

export function computeTraverse(survey: SurveyState): TraverseResult {
  const verts = survey.vertices;
  const n = verts.length;

  const perimeter = verts.reduce((acc, v) => acc + Math.max(0, Number(v.distancia) || 0), 0);
  const sumAiTeorica = n >= 3 ? (n - 2) * 180 : 0;

  const aiObsList = verts.map((v) => dmsToDec(v.aiDeg, v.aiMin, v.aiSec));
  const sumAiObs = aiObsList.reduce((acc, a) => acc + a, 0);

  // Conforme Folha de Fórmulas do Professor:
  // Erro Angular = Σ_Calculada AI - Σ_Observada AI
  // Correção Angular = Erro Angular / n
  // AI_Corrigido = AI + Correção Angular
  const erroAngular = sumAiTeorica - sumAiObs;
  const correcaoAngular = n > 0 ? erroAngular / n : 0;
  const aiCorrList = aiObsList.map((a) => a + correcaoAngular);

  const angularToleranceSec = n * 60; // 1' por vértice como referência didática
  const angularWithinCheck = Math.abs(erroAngular * 3600) <= angularToleranceSec;

  const azInputDec = normalizeAzimuth(dmsToDec(survey.azDeg, survey.azMin, survey.azSec));
  const azP1P2 =
    survey.azMode === 're' ? azimuthToBack(azInputDec) : azInputDec;

  const azList: number[] = [];
  const azProvList: (number | null)[] = [];
  const azRuleList: string[] = [];

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      azList.push(azP1P2);
      azProvList.push(null);
      azRuleList.push(
        survey.azMode === 're'
          ? azInputDec >= 180
            ? 'Az de ré ≥ 180° → subtrai 180°'
            : 'Az de ré < 180° → soma 180°'
          : 'Azimute de vante informado'
      );
    } else {
      const step = propagateAzimuth(azList[i - 1], aiCorrList[i], survey.winding);
      azList.push(step.az);
      azProvList.push(step.provisorio);
      azRuleList.push(step.ruleLabel);
    }
  }

  // Conferência de fechamento azimutal voltando para P1-P2 usando AI_corr[0]
  const closureStep =
    n > 0
      ? propagateAzimuth(azList[n - 1], aiCorrList[0], survey.winding)
      : { az: 0, provisorio: 0, ruleLabel: '—' };

  // Etapa 3: Projeções ΔX = D·sen(Az), ΔY = D·cos(Az)
  const dxList = verts.map((v, i) => {
    const d = Math.max(0, Number(v.distancia) || 0);
    return d * Math.sin(azList[i] * DEG2RAD);
  });
  const dyList = verts.map((v, i) => {
    const d = Math.max(0, Number(v.distancia) || 0);
    return d * Math.cos(azList[i] * DEG2RAD);
  });

  const sumDx = dxList.reduce((a, b) => a + b, 0);
  const sumDy = dyList.reduce((a, b) => a + b, 0);

  // Etapa 4: Erro linear e precisão
  const erroLinear = Math.hypot(sumDx, sumDy);
  const precisao = erroLinear > 1e-9 ? perimeter / erroLinear : Infinity;

  // Etapa 5: Compensação linear — Método de Bowditch (Regra do Compasso)
  const cxList = verts.map((v) => {
    const d = Math.max(0, Number(v.distancia) || 0);
    return perimeter > 0 ? -sumDx * (d / perimeter) : 0;
  });
  const cyList = verts.map((v) => {
    const d = Math.max(0, Number(v.distancia) || 0);
    return perimeter > 0 ? -sumDy * (d / perimeter) : 0;
  });

  const dxCorrList = dxList.map((dx, i) => dx + cxList[i]);
  const dyCorrList = dyList.map((dy, i) => dy + cyList[i]);

  const sumCx = cxList.reduce((a, b) => a + b, 0);
  const sumCy = cyList.reduce((a, b) => a + b, 0);
  const sumDxCorr = dxCorrList.reduce((a, b) => a + b, 0);
  const sumDyCorr = dyCorrList.reduce((a, b) => a + b, 0);

  // Etapa 6: Coordenadas Brutas e Coordenadas Corrigidas
  const xRawList: number[] = [];
  const yRawList: number[] = [];
  const xFinalList: number[] = [];
  const yFinalList: number[] = [];

  let curRawX = Number.isFinite(survey.x1) ? survey.x1 : 0;
  let curRawY = Number.isFinite(survey.y1) ? survey.y1 : 0;
  let curX = curRawX;
  let curY = curRawY;

  for (let i = 0; i < n; i++) {
    xRawList.push(curRawX);
    yRawList.push(curRawY);
    xFinalList.push(curX);
    yFinalList.push(curY);

    curRawX += dxList[i];
    curRawY += dyList[i];
    curX += dxCorrList[i];
    curY += dyCorrList[i];
  }

  const endRawX = curRawX;
  const endRawY = curRawY;

  // Etapa 7: Área pelo Método de Gauss: A = |Σ(Xi * Y_{i+1}) - Σ(Yi * X_{i+1})| / 2
  const gaussXYList: number[] = [];
  const gaussYXList: number[] = [];
  for (let i = 0; i < n; i++) {
    const nextIdx = (i + 1) % n;
    gaussXYList.push(xFinalList[i] * yFinalList[nextIdx]);
    gaussYXList.push(yFinalList[i] * xFinalList[nextIdx]);
  }
  const gaussSumXY = gaussXYList.reduce((a, b) => a + b, 0);
  const gaussSumYX = gaussYXList.reduce((a, b) => a + b, 0);
  const areaM2 = Math.abs(gaussSumXY - gaussSumYX) / 2;
  const areaHa = areaM2 / 10000;

  const stations: StationResult[] = verts.map((v, i) => {
    const next = verts[(i + 1) % n];
    const azVante = azList[i];
    return {
      index: i,
      id: v.id,
      label: v.label,
      nextLabel: next ? next.label : 'P1',
      alinhamento: `${v.label}–${next ? next.label : 'P1'}`,
      distancia: Math.max(0, Number(v.distancia) || 0),
      aiObsDec: aiObsList[i],
      aiCorrDec: aiCorrList[i],
      azProvisorio: azProvList[i],
      azRuleLabel: azRuleList[i],
      azVante,
      azRe: azimuthToBack(azVante),
      rumo: azimuthToRumo(azVante),
      dx: dxList[i],
      dy: dyList[i],
      cx: cxList[i],
      cy: cyList[i],
      dxCorr: dxCorrList[i],
      dyCorr: dyCorrList[i],
      xRaw: xRawList[i],
      yRaw: yRawList[i],
      xFinal: xFinalList[i],
      yFinal: yFinalList[i],
      gaussXY: gaussXYList[i],
      gaussYX: gaussYXList[i],
    };
  });

  return {
    n,
    perimeter,
    sumAiTeorica,
    sumAiObs,
    erroAngular,
    correcaoAngular,
    angularToleranceSec,
    angularWithinCheck,
    azInputDec,
    azP1P2,
    azClosureCheck: closureStep.az,
    azClosureProvisorio: closureStep.provisorio,
    azClosureRuleLabel: closureStep.ruleLabel,
    sumDx,
    sumDy,
    erroLinear,
    precisao,
    sumCx,
    sumCy,
    sumDxCorr,
    sumDyCorr,
    endRawX,
    endRawY,
    gaussSumXY,
    gaussSumYX,
    areaM2,
    areaHa,
    stations,
  };
}
