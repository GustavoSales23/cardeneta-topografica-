import { SurveyState } from '../lib/topography';
import { DEFAULT_ANCHOR_IFRO, latLngPolygonToSurvey } from '../lib/geo';

/**
 * 1ª Avaliação de Topografia — IFRO Campus Colorado do Oeste (Engenharia Agronômica)
 * Prof. Willian Daróz Matte · Turma EA224
 * 7 vértices (P1–P7) · Azimute de ré no ponto P2 visando P1: Az_P2-P1 = 222°15'00"
 * Coordenadas de partida: P1 = (1000,00 m; 1000,00 m)
 */
export const PRESET_PROVA_1: SurveyState = {
  id: 'preset-prova-1',
  title: '1ª Avaliação — Poligonal Fechada (7 vértices)',
  subtitle:
    'IFRO Colorado do Oeste · Azimute de ré P2→P1 = 222°15′00″ · Partida P1 (1000,00; 1000,00)',
  source: 'preset-prova',
  azMode: 're',
  azDeg: 222,
  azMin: 15,
  azSec: 0,
  x1: 1000,
  y1: 1000,
  winding: 'ccw',
  vertices: [
    { id: 'p1', label: 'P1', distancia: 85.42, aiDeg: 112, aiMin: 14, aiSec: 18 },
    { id: 'p2', label: 'P2', distancia: 112.36, aiDeg: 128, aiMin: 32, aiSec: 12 },
    { id: 'p3', label: 'P3', distancia: 94.78, aiDeg: 104, aiMin: 18, aiSec: 6 },
    { id: 'p4', label: 'P4', distancia: 126.53, aiDeg: 137, aiMin: 45, aiSec: 24 },
    { id: 'p5', label: 'P5', distancia: 78.64, aiDeg: 96, aiMin: 27, aiSec: 30 },
    { id: 'p6', label: 'P6', distancia: 103.27, aiDeg: 151, aiMin: 8, aiSec: 18 },
    { id: 'p7', label: 'P7', distancia: 91.85, aiDeg: 169, aiMin: 34, aiSec: 54 },
  ],
  geoOrigin: {
    latLngs: [],
    utmZone: 20,
    hemisphere: 'S',
    anchorLat: DEFAULT_ANCHOR_IFRO.lat,
    anchorLng: DEFAULT_ANCHOR_IFRO.lng,
    isRealUtm: false,
  },
};

/**
 * Questão 28 — Caderneta de Campo (Bloco 9)
 * 5 vértices (A–E) · Azimute de vante AB = 45°00'00" · Partida A (1000,00; 1000,00)
 */
export const PRESET_Q28: SurveyState = {
  id: 'preset-q28',
  title: 'Questão 28 — Poligonal de Estudo (5 vértices)',
  subtitle:
    'Caderneta de Campo · Bloco 9 · Azimute de vante A→B = 45°00′00″ · Partida A (1000,00; 1000,00)',
  source: 'preset-q28',
  azMode: 'vante',
  azDeg: 45,
  azMin: 0,
  azSec: 0,
  x1: 1000,
  y1: 1000,
  winding: 'ccw',
  vertices: [
    { id: 'a', label: 'A', distancia: 120, aiDeg: 108, aiMin: 15, aiSec: 20 },
    { id: 'b', label: 'B', distancia: 95, aiDeg: 115, aiMin: 42, aiSec: 10 },
    { id: 'c', label: 'C', distancia: 130, aiDeg: 95, aiMin: 18, aiSec: 40 },
    { id: 'd', label: 'D', distancia: 110, aiDeg: 121, aiMin: 24, aiSec: 30 },
    { id: 'e', label: 'E', distancia: 100, aiDeg: 99, aiMin: 19, aiSec: 20 },
  ],
  geoOrigin: {
    latLngs: [],
    utmZone: 20,
    hemisphere: 'S',
    anchorLat: DEFAULT_ANCHOR_IFRO.lat,
    anchorLng: DEFAULT_ANCHOR_IFRO.lng,
    isRealUtm: false,
  },
};

/**
 * Talhão demonstrativo real em Colorado do Oeste (RO) sobre satélite — UTM Fuso 20S
 */
export function createPresetTalhaoMapa(): SurveyState {
  const { survey } = latLngPolygonToSurvey(
    [
      { lat: -13.1178, lng: -60.5458 },
      { lat: -13.1173, lng: -60.5432 },
      { lat: -13.1154, lng: -60.5436 },
      { lat: -13.1159, lng: -60.5461 },
    ],
    {
      title: 'Talhão Experimental — Satélite (UTM 20S)',
      subtitle:
        'Campus Colorado do Oeste (RO) · Polígono georreferenciado em WGS84 / SIRGAS 2000',
      ensureCcw: true,
      source: 'preset-mapa',
    }
  );
  return {
    ...survey,
    id: 'preset-talhao-mapa',
  };
}
