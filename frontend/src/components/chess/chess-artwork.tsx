export type ChessArtworkVariant = 'opening' | 'midgame' | 'endgame' | 'profile';

const assets: Record<ChessArtworkVariant, { src: string; alt: string }> = {
  opening: {
    src: '/assets/search-silhouette.webp',
    alt: 'Faceless chess player seated beyond an opening chessboard',
  },
  midgame: {
    src: '/assets/chessboard-midgame.webp',
    alt: 'Angled realistic black-and-ivory 3D chessboard with pieces in a middlegame position',
  },
  endgame: {
    src: '/assets/chessboard-endgame.webp',
    alt: 'Angled realistic 3D chessboard showing a sparse finished-game position',
  },
  profile: {
    src: '/assets/search-silhouette.webp',
    alt: 'Anonymous seated chess player silhouette',
  },
};

export function ChessArtwork({ variant, className = '' }: { variant: ChessArtworkVariant; className?: string }) {
  const asset = assets[variant];
  return (
    <div className={`chess-art chess-art-${variant} ${className}`.trim()}>
      <img src={asset.src} alt={asset.alt} draggable={false} />
    </div>
  );
}
