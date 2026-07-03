import { reelStrips } from '../engine/engine.js';

function Symbol({ machine, id, highlighted }) {
  const sym = machine.symbols[id];
  const cls = `symbol${sym.letter ? ' symbol-letter' : ''}${highlighted ? ' hit' : ''}`;
  return (
    <div className={cls} data-symbol={id}>
      {sym.letter ?? sym.emoji}
    </div>
  );
}

/**
 * One reel column. While `spinning`, shows the real strip scrolling in a
 * blurred loop; once stopped, shows the 3 final symbols with a settle bounce.
 * `anticipating` adds the near-miss glow while a feature is one reel away.
 */
export default function Reel({ machine, index, spinning, symbols, highlights, anticipating }) {
  if (spinning) {
    // Render the strip twice so the loop animation wraps seamlessly.
    const strip = reelStrips(machine)[index];
    return (
      <div className={`reel${anticipating ? ' anticipating' : ''}`}>
        <div className="strip spinning">
          {[...strip, ...strip].map((id, i) => (
            <Symbol key={i} machine={machine} id={id} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="reel">
      <div className="strip settled">
        {symbols.map((id, row) => (
          <Symbol key={row} machine={machine} id={id} highlighted={highlights.has(`${index},${row}`)} />
        ))}
      </div>
    </div>
  );
}
