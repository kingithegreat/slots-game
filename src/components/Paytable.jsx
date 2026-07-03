import { SCATTER_PAYTABLE, WILD, SCATTER, FREE_SPINS_AWARDED } from '../engine/engine.js';

export default function Paytable({ machine, dialogRef }) {
  return (
    <dialog ref={dialogRef} className="paytable">
      <h2>{machine.name}</h2>
      <p className="paytable-note">Line wins pay per line bet, 3/4/5 of a kind left to right.</p>
      <table>
        <tbody>
          {Object.entries(machine.paytable).map(([id, pays]) => (
            <tr key={id}>
              <td>{machine.symbols[id].letter ?? machine.symbols[id].emoji}</td>
              <td>{machine.symbols[id].label}</td>
              <td>{pays.join(' / ')}</td>
            </tr>
          ))}
          <tr>
            <td>{machine.symbols[WILD].emoji}</td>
            <td>{machine.symbols[WILD].label}</td>
            <td>substitutes, reels 2–4</td>
          </tr>
          <tr>
            <td>{machine.symbols[SCATTER].emoji}</td>
            <td>{machine.symbols[SCATTER].label}</td>
            <td>
              {Object.values(SCATTER_PAYTABLE).join(' / ')}× total bet, pays anywhere
            </td>
          </tr>
        </tbody>
      </table>
      <p className="paytable-note">
        3+ pāua award {FREE_SPINS_AWARDED} free spins with all wins doubled (retriggers add
        {' '}{FREE_SPINS_AWARDED} more). A tiki on each of reels 2, 3 and 4 opens the
        Tiki Trio pick-a-box bonus.
      </p>
      <form method="dialog"><button className="pill-btn" type="submit">Close</button></form>
    </dialog>
  );
}
