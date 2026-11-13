/* Vector signals use the existing ivory/charcoal palette, not font glyphs. */
export function ScreenArt({ index }: { index: number }) {
  if (index % 3 === 1) return <g fill="#1c1d1e">
    <path d="M28 130 Q31 89 65 86 H98 Q131 91 137 130Z" />
    <ellipse cx="82" cy="57" rx="24" ry="30" />
    <text x="82" y="70" textAnchor="middle" fill="#f7f6f3" fontSize="37" fontWeight="900">?</text>
  </g>;
  const kind = ['king','queen','knight','rook','bishop','pawn'][[0,2,3,5,6,8].indexOf(index)] || 'king';
  return <g className={'signal-piece signal-'+kind} fill="#f7f6f3" stroke="#1c1d1e" strokeWidth="2">
    <g className="signal-body">
      <path d="M52 111 H112 L107 102 H57Z M61 99 Q74 78 74 67 H91 Q91 82 103 99Z" />
      {kind === 'king' && <><path d="M64 46 L70 70 H96 L103 46 L89 54 L82 39 L75 54Z" /><path d="M82 23 V41 M74 31 H90" stroke="#f7f6f3" strokeWidth="5" /></>}
      {kind === 'queen' && <path d="M61 39 L70 70 H95 L105 39 L92 51 L82 30 L73 51Z" />}
      {kind === 'knight' && <path d="M64 72 Q64 53 84 45 L69 49 L56 41 L69 24 L81 24 L90 15 L93 29 Q112 43 98 73Z" />}
      {kind === 'rook' && <path d="M65 70 V44 H59 V25 H72 V35 H78 V25 H89 V35 H96 V25 H108 V44 H100 V70Z" />}
      {kind === 'bishop' && <><path d="M82 23 Q54 49 74 70 H91 Q111 48 82 23Z" /><path d="M82 35 L92 49" /></>}
      {kind === 'pawn' && <circle cx="82" cy="52" r="19" />}
    </g>
    {(kind === 'king' || kind === 'queen') && <g className="signal-glint" fill="#fffefa" stroke="none"><path d="M108 19 L111 28 L120 31 L111 34 L108 43 L105 34 L96 31 L105 28Z" /><path d="M57 42 L59 48 L65 50 L59 52 L57 58 L55 52 L49 50 L55 48Z" /></g>}
    {kind === 'knight' && <path className="signal-steam" d="M58 41 Q40 33 49 24 Q57 16 46 8" fill="none" stroke="#fffefa" />}
    {kind === 'bishop' && <path className="signal-steam" d="M49 91 L112 24" stroke="#fffefa" opacity=".5" />}
  </g>;
}
