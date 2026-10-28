/*
 * Drawing helpers shared by all the art code.
 * Everything in the game is drawn with these simple shapes —
 * there are no image files.
 */
DR.G = (function () {
  const OUTLINE = '#3d3a4b';
  const patternCache = {};

  /** Adds a rounded-rectangle path (call fill/stroke afterwards). */
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Filled rounded box with an optional outline. o = {fill, stroke, lw, r} */
  function box(ctx, x, y, w, h, o = {}) {
    rr(ctx, x, y, w, h, o.r === undefined ? 4 : o.r);
    if (o.fill) {
      ctx.fillStyle = o.fill;
      ctx.fill();
    }
    if (o.stroke !== false) {
      ctx.strokeStyle = o.stroke || OUTLINE;
      ctx.lineWidth = o.lw || 2;
      ctx.stroke();
    }
  }

  /** Soft drop shadow under an object. */
  function shadow(ctx, x, y, w, h, r = 6) {
    rr(ctx, x + 3, y + 5, w, h, r);
    ctx.fillStyle = 'rgba(40, 30, 70, 0.18)';
    ctx.fill();
  }

  /**
   * A piece of furniture seen from above at a slight angle:
   * a top face plus a darker front face, so it looks solid.
   */
  function block(ctx, x, y, w, h, top, side, depth = 7, r = 4) {
    shadow(ctx, x, y, w, h, r);
    box(ctx, x, y, w, h, { fill: side, r });
    box(ctx, x, y, w, h - depth, { fill: top, r });
  }

  function circle(ctx, cx, cy, r, fill, stroke, lw = 2) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }

  function ellipse(ctx, cx, cy, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function line(ctx, x1, y1, x2, y2, color, lw = 2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
  }

  /** Text with a soft outline so it is readable on any background. */
  function label(ctx, str, x, y, o = {}) {
    ctx.font = `${o.weight || 800} ${o.size || 14}px ${DR.G.FONT}`;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = o.outline || 'rgba(255,255,255,0.9)';
    ctx.lineWidth = o.lw || 4;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = o.color || OUTLINE;
    ctx.fillText(str, x, y);
  }

  // ---------- Repeating floor patterns ----------
  // Each maker draws one small square tile; the canvas repeats it.
  const MAKERS = {
    grass: { size: 64, draw(g, rnd) {
      g.fillStyle = '#9ad46f'; g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 14; i++) {
        const x = rnd() * 64, y = rnd() * 64;
        g.strokeStyle = rnd() < 0.5 ? '#86c45d' : '#aee086';
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x, y - 4); g.lineTo(x + 2, y); g.stroke();
      }
    } },
    wood: { size: 64, draw(g) {
      g.fillStyle = '#ecc996'; g.fillRect(0, 0, 64, 64);
      g.strokeStyle = '#d9b07a'; g.lineWidth = 2;
      for (let y = 0; y < 64; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
      for (let r = 0; r < 4; r++) { const x = (r % 2) * 32 + 12; g.beginPath(); g.moveTo(x, r * 16); g.lineTo(x, r * 16 + 16); g.stroke(); }
    } },
    tiles: { size: 40, draw(g) {
      g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, 40, 40);
      g.strokeStyle = '#ddd5c4'; g.lineWidth = 2; g.strokeRect(0, 0, 40, 40);
    } },
    kitchen: { size: 40, draw(g) {
      g.fillStyle = '#eaf3f8'; g.fillRect(0, 0, 40, 40);
      g.fillStyle = '#d3e6f0'; g.fillRect(0, 0, 20, 20); g.fillRect(20, 20, 20, 20);
    } },
    school: { size: 48, draw(g) {
      g.fillStyle = '#e9eef2'; g.fillRect(0, 0, 48, 48);
      g.strokeStyle = '#d4dde4'; g.lineWidth = 2; g.strokeRect(0, 0, 48, 48);
      g.fillStyle = '#dde5eb'; g.fillRect(6, 6, 4, 4); g.fillRect(30, 28, 4, 4);
    } },
    paving: { size: 48, draw(g) {
      g.fillStyle = '#efdcb8'; g.fillRect(0, 0, 48, 48);
      g.strokeStyle = '#dcc49a'; g.lineWidth = 2;
      g.strokeRect(0, 0, 24, 24); g.strokeRect(24, 0, 24, 24); g.strokeRect(12, 24, 24, 24);
      g.beginPath(); g.moveTo(0, 24); g.lineTo(12, 24); g.moveTo(36, 24); g.lineTo(48, 24); g.stroke();
    } },
    concrete: { size: 48, draw(g, rnd) {
      g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, 48, 48);
      g.fillStyle = '#cdc9c1';
      for (let i = 0; i < 10; i++) g.fillRect(rnd() * 48, rnd() * 48, 2, 2);
      g.strokeStyle = '#c4c0b8'; g.lineWidth = 2; g.strokeRect(0, 0, 48, 48);
    } },
    road: { size: 48, draw(g, rnd) {
      g.fillStyle = '#767f8f'; g.fillRect(0, 0, 48, 48);
      g.fillStyle = '#6c7585';
      for (let i = 0; i < 16; i++) g.fillRect(rnd() * 48, rnd() * 48, 2, 2);
    } },
    roof: { size: 32, draw(g, rnd) {
      g.fillStyle = '#b9bec7'; g.fillRect(0, 0, 32, 32);
      g.fillStyle = '#aab0ba';
      for (let i = 0; i < 12; i++) g.fillRect(rnd() * 32, rnd() * 32, 2, 2);
    } },
    rug: { size: 24, draw(g) {
      g.fillStyle = '#e76f51'; g.fillRect(0, 0, 24, 24);
      g.fillStyle = '#f08a6c'; g.fillRect(0, 0, 12, 12); g.fillRect(12, 12, 12, 12);
    } }
  };

  /** Returns (and caches) a repeating pattern by name. */
  function pattern(ctx, name) {
    if (!patternCache[name]) {
      const m = MAKERS[name];
      const c = document.createElement('canvas');
      c.width = c.height = m.size;
      m.draw(c.getContext('2d'), DR.U.seeded(name.length * 97 + 13));
      patternCache[name] = ctx.createPattern(c, 'repeat');
    }
    return patternCache[name];
  }

  /** Fills a rectangle with a named floor pattern. */
  function floor(ctx, name, x, y, w, h) {
    ctx.fillStyle = pattern(ctx, name);
    ctx.fillRect(x, y, w, h);
  }

  return {
    OUTLINE, FONT: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    rr, box, shadow, block, circle, ellipse, line, label, pattern, floor
  };
})();
