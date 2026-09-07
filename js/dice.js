/* dice.js — D&D dice parsing & rolling */
const Dice = (() => {
  const DICE = [4, 6, 8, 10, 12, 20, 100];
  const FACES = { 4: '▲', 6: '⬢', 8: '◆', 10: '⬟', 12: '⬢', 20: '⏣', 100: '%' };

  function rollDie(sides) { return 1 + Math.floor(Math.random() * sides); }

  /* parse expressions like: 1d20+5, 2d6-1, d20, 4d6kh3, advantage handled separately */
  function parse(expr) {
    const m = String(expr).trim().toLowerCase()
      .match(/^(\d*)d(\d+)\s*(kh|kl)?\s*(\d+)?\s*([+-]\s*\d+)?$/);
    if (!m) return null;
    return {
      count: Math.min(parseInt(m[1] || '1', 10), 50),
      sides: Math.min(parseInt(m[2], 10), 1000),
      keep: m[3] || null,
      keepN: m[4] ? parseInt(m[4], 10) : null,
      mod: m[5] ? parseInt(m[5].replace(/\s/g, ''), 10) : 0,
    };
  }

  /* adv: 'adv' | 'dis' | null — applies to a single d20 roll */
  function roll(expr, adv = null) {
    const p = parse(expr);
    if (!p) return null;
    let rolls, label = expr.replace(/\s/g, '');

    if (adv && p.count === 1 && p.sides === 20) {
      const a = rollDie(20), b = rollDie(20);
      rolls = [a, b];
      const total = (adv === 'adv' ? Math.max(a, b) : Math.min(a, b)) + p.mod;
      return {
        expr: label + (adv === 'adv' ? ' (advantage)' : ' (disadvantage)'),
        rolls, kept: adv === 'adv' ? Math.max(a, b) : Math.min(a, b),
        mod: p.mod, total, adv,
      };
    }

    rolls = Array.from({ length: p.count }, () => rollDie(p.sides));
    let keptList = rolls;
    if (p.keep && p.keepN != null) {
      const sorted = [...rolls].sort((a, b) => b - a);
      const n = Math.min(p.keepN, rolls.length);
      keptList = p.keep === 'kh' ? sorted.slice(0, n) : sorted.slice(rolls.length - n);
    }
    const sum = keptList.reduce((a, b) => a + b, 0);
    return { expr: label, rolls, kept: sum, keptList, mod: p.mod, total: sum + p.mod, adv: null };
  }

  /* chat command: "/roll 1d20+5" / "/r d8" */
  function parseCommand(text) {
    const m = String(text).trim().match(/^\/(?:roll|r)\s+(.+)$/i);
    if (!m) return null;
    let adv = null, expr = m[1];
    if (/\badv(antage)?\b/i.test(expr)) { adv = 'adv'; expr = expr.replace(/\b(adv(antage)?)\b/i, ''); }
    if (/\bdis(advantage)?\b/i.test(expr)) { adv = 'dis'; expr = expr.replace(/\b(dis(advantage)?)\b/i, ''); }
    expr = expr.trim() || '1d20';
    const r = roll(expr, adv);
    return r;
  }

  function describe(r) {
    if (!r) return '';
    let s = `${r.expr} → `;
    if (r.adv) s += `[${r.rolls.join(' / ')}] kept ${r.kept}${r.mod ? (r.mod > 0 ? ' + ' + r.mod : ' − ' + Math.abs(r.mod)) : ''}`;
    else if (r.rolls.length > 1) s += `[${r.rolls.join(' + ')}]${r.keptList && r.keptList.length !== r.rolls.length ? ` kept (${r.keptList.join('+')})` : ''}${r.mod ? (r.mod > 0 ? ' + ' + r.mod : ' − ' + Math.abs(r.mod)) : ''}`;
    s += ` = <b>${r.total}</b>`;
    if (r.total === 20 && r.expr.includes('d20')) s += ' 🌟 Natural 20!';
    else if (r.kept === 1 && r.expr.includes('d20') && !r.adv) s += ' 💀 Natural 1…';
    return s;
  }

  return { DICE, FACES, roll, parse, parseCommand, describe, rollDie };
})();
