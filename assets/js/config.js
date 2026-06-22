'use strict';

const CONFIG = {
  TOL: 0.05,
  MAX_SPAN: 7.5,
  TRIB: 4,
  CANVAS_W: 900,
  CANVAS_H: 650
};

const SLAB_TYPES = {
  solid: { name: 'Düz Betonarme', hint: 'Tipik kalınlık 12–16 cm', thick: 0.14, weightMult: 1, extraDead: 0 },
  ribbed: { name: 'Kirişli Döşeme', hint: 'Döşeme 5 cm + kirişler; ek ölü yük artar', thick: 0.05, weightMult: 0.9, extraDead: 0.8 },
  hollow: { name: 'Boşluklu Döşeme', hint: 'Hafif; kalınlık 12–15 cm', thick: 0.12, weightMult: 0.65, extraDead: 0.4 },
  composite: { name: 'Kompozit Metal Kafes', hint: 'Şap + metal kafes; ~10 cm', thick: 0.10, weightMult: 0.5, extraDead: 1.5 },
  prefab: { name: 'Prefabrik TT', hint: 'TT eleman + şap; ~22 cm', thick: 0.22, weightMult: 0.75, extraDead: 0.6 }
};

const SDS_ZONE = { 1: 0.33, 2: 0.50, 3: 0.70, 4: 0.85, 5: 1.00 };
const SOIL_FA = { ZA: 0.8, ZB: 0.9, ZC: 1.0, ZD: 1.2, ZE: 1.4 };
const Ie_MAP = { 1: 1.5, 2: 1.0, 3: 0.85 };
const R_MAP = { frame: 8, wall: 6, mixed: 7 };

const STRUCT_SYSTEM_LABELS = {
  frame: 'Çerçeveli (CMT)',
  wall: 'Perdeli (PMT)',
  mixed: 'Karma Sistem'
};

const BEAM_DEPTH_RULES = [
  { label: 'L/10 (sabit mesnet)', ratio: 10 },
  { label: 'L/12 (basit mesnet)', ratio: 12 },
  { label: 'L/14 (hafif yük)', ratio: 14 }
];
