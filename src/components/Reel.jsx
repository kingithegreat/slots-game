import { REEL_STRIPS, SYMBOLS } from '../engine/engine.js';

function Symbol({ id, highlighted }) {
  const sym = SYMBOLS[id];
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
 */
export default function Reel({ index, spinning, symbols, highlights }) {
  if (spinning) {
    // Render the strip twice so the loop animation wraps seamlessly.
    const strip = [...REEL_STRIPS[index], ...REEL_STRIPS[index]];
    return (
      <div className="reel">
        <div className="strip spinning" style={{ '--strip-len': REEL_STRIPS[index].length }}>
          {strip.map((id, i) => (
            <Symbol key={i} id={id} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="reel">
      <div className="strip settled">
        {symbols.map((id, row) => (
          <Symbol key={row} id={id} highlighted={highlights.has(`${index},${row}`)} />
        ))}
      </div>
    </div>
  );
}
