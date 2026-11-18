/* Shape data for the cut-paper artwork: the palette and the path outlines of the seated
   figures and their chairs. Kept apart from the components (stage-art.tsx) so the 3D set
   (scene/) can paint the same figures onto its standees. */
export const IVORY = '#efece5';
export const INK = '#121213';
/** Offset 'sticker' shadows and small accents use the theme's warm greys. */
export const STONE = '#80796d';
export const ASH = '#a7a5a0';
/** The die-cut edge around ivory artwork. */
export const EDGE = '#0b0b0c';

export const dot = (cx: number, cy: number, r: number) => `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;

export const PLAYER_CHAIR = [
  'M24 118 Q30 110 38 116 L47 238 H31 Z',
  'M28 228 H122 Q126 228 126 233 V240 H28 Z',
  'M31 240 L25 338 H36 L44 240 Z',
  'M106 240 L111 338 H121 L118 240 Z',
];

/** A seated figure in profile, facing right. Floor y = 340, table top y = 156. */
export const SEATED = {
  coat: 'M50 230 C44 176 54 118 82 88 Q102 74 120 90 L128 116 C116 152 108 192 108 230 Z',
  coatTail: 'M50 226 L43 270 L66 263 L70 228 Z',
  thigh: 'M56 206 H150 Q162 206 162 218 V230 H56 Z',
  shin: 'M138 224 H162 L158 322 H136 Z',
  shoe: 'M132 318 H168 Q186 322 186 334 V338 H132 Z',
  collar: 'M92 94 L104 62 L117 88 Z',
  neck: 'M102 82 L116 60 L134 72 L122 94 Z',
  head: dot(134, 52, 24),
  hatBrim: 'M98 42 Q134 26 180 44 L177 51 Q134 36 100 50 Z',
  hatCrown: 'M111 37 Q110 9 134 8 Q158 9 161 35 Q136 29 111 37 Z',
  upperArm: 'M94 102 L107 88 L167 140 L153 154 Z',
  forearm: 'M149 152 L167 146 L158 82 L141 86 Z', // hand to chin
  fist: dot(150, 82, 10),
  restingArm: 'M120 140 H198 Q206 140 206 147.5 Q206 155 198 155 H120 Z', // on the table
};
/** The visitor: every part of the seated figure, hat included. */
export const PLAYER = Object.values(SEATED);
/** The light band round the hat's crown. */
export const HAT_BAND = 'M112 32.5 Q136 24.5 161 30.5 L161 35 Q136 29 111 37 Z';
/** The guest: bare-headed, one arm resting on the table. */
export const GUEST = [SEATED.coat, SEATED.thigh, SEATED.shin, SEATED.shoe, SEATED.neck, SEATED.head, SEATED.restingArm];

export const OPPONENT_CHAIR = [
  'M116 100 Q123 90 130 100 L120 238 H106 Z',
  'M107 100 Q121 85 135 100 L130 152 Q119 158 107 152 Z',
  'M30 228 Q26 228 26 233 V240 H122 V228 Z',
  'M33 240 L30 338 H41 L46 240 Z',
  'M106 240 L113 338 H124 L120 240 Z',
  'M40 286 H112 V292 H40 Z',
];
/** The cushion on the opponent's chair. */
export const OPPONENT_SEAT = 'M32 218 H114 Q121 218 121 224 V229 H27 V224 Q27 218 32 218 Z';
/** The guest sits in the opponent's chair as the seated figure mirrored about x = 77. */
export const GUEST_MIRROR_X = 154;
/** Where the guest's picture goes: the mirrored head, a little larger. */
export const GUEST_FACE = { cx: 20, cy: 49, r: 28 };
