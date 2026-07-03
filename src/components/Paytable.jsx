import { PAYTABLE, SCATTER_PAYTABLE, SYMBOLS, WILD, SCATTER, FREE_SPINS_AWARDED } from '../engine/engine.js';

export default function Paytable({ dialogRef }) {
  return (
    <dialog ref={dialogRef} className="paytable">
      <h2>Paytable</h2>
      <p className="paytable-note">Line wins pay per line bet, 3/4/5 of a kind left to right.</p>
      <table>
        <tbody>
          {Object.entries(PAYTABLE).map(([id, pays]) => (
            <tr key={id}>
              <td>{SYMBOLS[id].letter ?? SYMBOLS[id].emoji}</td>
              <td>{SYMBOLS[id].label}</td>
              <td>{pays.join(' / ')}</td>
            </tr>
          ))}
          <tr>
            <td>{SYMBOLS[WILD].emoji}</td>
            <td>{SYMBOLS[WILD].label}</td>
            <td>substitutes, reels 2–4</td>
          </tr>
          <tr>
            <td>{SYMBOLS[SCATTER].emoji}</td>
            <td>{SYMBOLS[SCATTER].label}</td>
            <td>
              {Object.values(SCATTER_PAYTABLE).join(' / ')}× total bet, pays anywhere
            </td>
          </tr>
        </tbody>
      </table>
      <p className="paytable-note">
        3+ pāua award {FREE_SPINS_AWARDED} free spins (bonus round lands in Phase 3).
      </p>
      <form method="dialog">
        <button className="pill-btn" type="submit">Close</button>
      </form>
    </dialog>
  );
}
