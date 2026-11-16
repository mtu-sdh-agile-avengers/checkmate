# Landing chessboard
React/TypeScript with inline SVG and CSS keyframes. Each move takes 0.8 seconds, followed by a one-second pause. Captures fade out. The piece layer fades out at the end; positions reset while invisible, then fade back in. No animation dependency or per-frame React updates. A pause control freezes both timelines. Reduced-motion users see the initial position.

Edit MOVES in live-chessboard.tsx: each string contains source and destination squares, e.g. e2e4. The supplied sequence is a legal Scotch opening with two captures. The renderer assumes legal input; castling, en passant and promotion require additional handling. For arbitrary PGN, generate validated snapshots with stable piece IDs using a chess rules parser first.

Physical styling uses shared SVG material gradients, rounded crowns, layered elliptical bases, and radial contact shadows. The frame has a beveled edge. These are lightweight sculpted SVG illustrations, with no WebGL renderer or downloaded textures.

The camera now looks down from the top-right (h8) corner. The board uses an orthographic SVG matrix; project() maps square centers through the same matrix, while pieces remain upright. Layered board edges supply visible thickness. Adjust the matrix and project() together when changing the camera.
