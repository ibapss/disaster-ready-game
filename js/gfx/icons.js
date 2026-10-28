/*
 * Item icons, drawn with code. Each icon is drawn inside a 32×32 box
 * centred on (0, 0), then scaled to the size you ask for.
 *
 *   DR.Icons.draw(ctx, 'torch', x, y, 28)   // on the game canvas
 *   DR.Icons.url('torch', 48)               // picture for HTML <img>
 *
 * To add an icon for a new item, add a function to the ICON list below
 * with the same id as the item in js/data/items.js.
 */
DR.Icons = (function () {
  const G = DR.G;
  const O = G.OUTLINE;

  const ICON = {
    water(c) {
      G.box(c, -7, -9, 14, 23, { fill: '#9fd8f7', r: 5 });
      G.box(c, -7, 0, 14, 14, { fill: '#5bb6ea', r: 5, stroke: false });
      G.box(c, -7, -9, 14, 23, { r: 5 });
      G.box(c, -4, -15, 8, 7, { fill: '#2a6fdb', r: 2 });
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.fillRect(-4, -6, 2, 12);
    },
    torch(c) {
      c.fillStyle = 'rgba(255, 230, 120, 0.55)';
      c.beginPath(); c.moveTo(6, -5); c.lineTo(16, -12); c.lineTo(16, 12); c.lineTo(6, 5); c.fill();
      G.box(c, -14, -4, 16, 8, { fill: '#e85d3f', r: 3 });
      G.box(c, 1, -7, 7, 14, { fill: '#cfd6de', r: 2 });
      G.box(c, -9, -2, 5, 4, { fill: '#ffd166', r: 1, lw: 1.5 });
    },
    firstaid(c) {
      G.box(c, -14, -10, 28, 22, { fill: '#ffffff', r: 4 });
      G.box(c, -5, -14, 10, 5, { fill: '#e5e7eb', r: 2 });
      c.fillStyle = '#e63946';
      c.fillRect(-3, -6, 6, 14); c.fillRect(-7, -2, 14, 6);
    },
    batteries(c) {
      [-7, 5].forEach((x) => {
        G.box(c, x - 4, -10, 9, 22, { fill: '#2d3142', r: 2 });
        c.fillStyle = '#e9a23b'; c.fillRect(x - 3, -9, 7, 7);
        G.box(c, x - 1.5, -13, 4, 3, { fill: '#cfd6de', r: 1, lw: 1 });
        c.fillStyle = '#fff'; c.fillRect(x - 0.5, 4, 2, 5); c.fillRect(x - 2, 5.5, 5, 2);
      });
    },
    powerbank(c) {
      G.box(c, -10, -14, 20, 28, { fill: '#4a5568', r: 4 });
      c.fillStyle = '#7ef29d';
      c.beginPath(); c.moveTo(2, -9); c.lineTo(-5, 2); c.lineTo(0, 2); c.lineTo(-2, 9); c.lineTo(5, -2); c.lineTo(0, -2); c.closePath(); c.fill();
      [-5, -1, 3].forEach((x) => G.circle(c, x + 1, 11, 1.2, '#7ef29d'));
    },
    food(c) {
      G.box(c, -13, -8, 26, 20, { fill: '#f4a261', r: 3 });
      G.box(c, -13, -12, 26, 6, { fill: '#e76f51', r: 2 });
      [[-7, 2], [0, 4], [7, 1]].forEach(([x, y]) => G.circle(c, x, y, 3.5, '#f9dcab', O, 1.5));
    },
    documents(c) {
      G.box(c, -12, -14, 22, 26, { fill: '#ffffff', r: 2 });
      c.strokeStyle = '#9aa5b1'; c.lineWidth = 2;
      [-8, -3, 2].forEach((y) => { c.beginPath(); c.moveTo(-8, y); c.lineTo(6, y); c.stroke(); });
      c.fillStyle = 'rgba(120, 190, 255, 0.35)';
      G.rr(c, -15, -16, 30, 32, 4); c.fill();
      c.strokeStyle = '#4b8fe2'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#4b8fe2'; c.fillRect(-15, -16, 30, 4);
    },
    whistle(c) {
      c.strokeStyle = '#2a9d8f'; c.lineWidth = 2;
      c.beginPath(); c.arc(-6, -6, 8, Math.PI * 0.6, Math.PI * 1.9); c.stroke();
      G.box(c, -6, -4, 20, 10, { fill: '#f77f00', r: 4 });
      G.circle(c, -4, 5, 7, '#f77f00', O);
      G.circle(c, -4, 5, 2.5, '#fff');
    },
    shoes(c) {
      c.fillStyle = '#7a4b2a';
      G.box(c, -13, -12, 14, 20, { fill: '#8d5a33', r: 4 });
      G.box(c, -13, 2, 27, 10, { fill: '#8d5a33', r: 5 });
      c.fillStyle = '#3d3a4b'; c.fillRect(-12, 10, 25, 3);
      c.strokeStyle = '#f4d35e'; c.lineWidth = 1.5;
      [-8, -3].forEach((y) => { c.beginPath(); c.moveTo(-10, y); c.lineTo(-3, y); c.stroke(); });
    },
    raincoat(c) {
      c.fillStyle = '#ffd23f';
      c.beginPath(); c.moveTo(-6, -14); c.lineTo(6, -14); c.lineTo(14, 13); c.lineTo(-14, 13); c.closePath(); c.fill();
      c.strokeStyle = O; c.lineWidth = 2; c.stroke();
      G.box(c, -6, -16, 12, 7, { fill: '#ffd23f', r: 3 });
      c.beginPath(); c.moveTo(0, -9); c.lineTo(0, 13); c.stroke();
      [-3, 3, 9].forEach((y) => G.circle(c, 2.5, y, 1.2, O));
    },
    hat(c) {
      G.ellipse(c, 0, 5, 16, 8, '#e9c46a');
      c.strokeStyle = O; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 5, 16, 8, 0, 0, Math.PI * 2); c.stroke();
      G.box(c, -8, -9, 16, 14, { fill: '#f1d58a', r: 6 });
      c.fillStyle = '#e76f51'; c.fillRect(-8, 0, 16, 4);
    },
    radio(c) {
      c.strokeStyle = O; c.lineWidth = 2;
      c.beginPath(); c.moveTo(6, -8); c.lineTo(12, -16); c.stroke();
      G.box(c, -14, -8, 28, 20, { fill: '#3a86ff', r: 4 });
      G.circle(c, -5, 2, 6, '#e0e7ff', O);
      [-8, -5, -2].forEach((x) => G.circle(c, x, 2, 0.9, O));
      G.box(c, 4, -3, 7, 4, { fill: '#ffd166', r: 1, lw: 1.5 });
      G.circle(c, 7.5, 6, 2, '#fff', O, 1.5);
    },
    remote(c) {
      G.box(c, -6, -15, 12, 30, { fill: '#2d3142', r: 4 });
      G.circle(c, 0, -9, 2.5, '#e63946');
      [[-2.5, -2], [2.5, -2], [-2.5, 3], [2.5, 3], [-2.5, 8], [2.5, 8]].forEach(([x, y]) => G.circle(c, x, y, 1.4, '#c9ced6'));
    },
    videogame(c) {
      G.box(c, -15, -8, 30, 17, { fill: '#7b2cbf', r: 8 });
      c.fillStyle = '#fff'; c.fillRect(-10, -1.5, 8, 3); c.fillRect(-7.5, -4, 3, 8);
      G.circle(c, 7, -2, 2, '#ffd166'); G.circle(c, 10, 2, 2, '#06d6a0');
    },
    perfume(c) {
      G.box(c, -10, -6, 20, 20, { fill: '#ffafcc', r: 6 });
      G.box(c, -3, -11, 6, 6, { fill: '#cdb4db', r: 1 });
      G.box(c, -5, -16, 10, 6, { fill: '#a2d2ff', r: 2 });
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(-6, -2, 3, 10);
    },
    skateboard(c) {
      G.box(c, -16, -5, 32, 10, { fill: '#06d6a0', r: 5 });
      [-9, 9].forEach((x) => { G.circle(c, x, -7, 3, '#ffd166', O, 1.5); G.circle(c, x, 7, 3, '#ffd166', O, 1.5); });
    },
    hairdryer(c) {
      G.box(c, -14, -10, 22, 13, { fill: '#ef476f', r: 6 });
      G.box(c, 6, -8, 8, 9, { fill: '#c9ced6', r: 2 });
      G.box(c, -8, 1, 8, 14, { fill: '#ef476f', r: 3 });
      c.strokeStyle = O; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-4, 15); c.quadraticCurveTo(4, 18, 10, 12); c.stroke();
    },
    fizzy(c) {
      [-6, 6].forEach((x) => {
        G.box(c, x - 6, -12, 12, 25, { fill: '#e63946', r: 3 });
        c.fillStyle = '#fff'; c.fillRect(x - 6, -2, 12, 4);
        c.fillStyle = '#cfd6de'; c.fillRect(x - 4, -13, 8, 2);
      });
    },
    candles(c) {
      [-7, 4].forEach((x, i) => {
        const h = i ? 16 : 22;
        G.box(c, x - 4, 14 - h, 8, h, { fill: '#fff1d0', r: 2 });
        c.fillStyle = '#ff9f1c';
        c.beginPath(); c.ellipse(x, 14 - h - 5, 3, 5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffe66d';
        c.beginPath(); c.ellipse(x, 14 - h - 4, 1.5, 2.5, 0, 0, Math.PI * 2); c.fill();
      });
    },
    cloth(c) {
      G.box(c, -13, -10, 26, 20, { fill: '#8ecae6', r: 4 });
      c.strokeStyle = '#5aa9d6'; c.lineWidth = 2;
      [-4, 2].forEach((y) => { c.beginPath(); c.moveTo(-10, y); c.quadraticCurveTo(0, y + 4, 10, y); c.stroke(); });
      G.circle(c, 6, 13, 2, '#5bb6ea');
    },
    phone(c) {
      G.box(c, -8, -14, 16, 28, { fill: '#2d3142', r: 4 });
      G.box(c, -6, -10, 12, 19, { fill: '#a0e7e5', r: 2, stroke: false });
      G.circle(c, 0, 11, 1.5, '#cfd6de');
    },
    switchbox(c) {
      G.box(c, -12, -14, 24, 28, { fill: '#cfd6de', r: 3 });
      G.box(c, -6, -8, 12, 16, { fill: '#2d3142', r: 2 });
      G.box(c, -3, -6, 6, 6, { fill: '#e63946', r: 1, lw: 1.5 });
      c.fillStyle = '#ffd166';
      c.beginPath(); c.moveTo(-9, -12); c.lineTo(-11, -8); c.lineTo(-8, -8); c.fill();
    }
  };

  const urlCache = {};

  return {
    has: (id) => !!ICON[id],

    /** Draws an icon centred at (x, y), `size` pixels wide. */
    draw(ctx, id, x, y, size = 32) {
      const fn = ICON[id];
      if (!fn) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size / 32, size / 32);
      ctx.lineJoin = 'round';
      fn(ctx);
      ctx.restore();
    },

    /** Picture of an icon as a data URL, for use in the HTML menus. */
    url(id, px = 48) {
      const key = id + '@' + px;
      if (!urlCache[key]) {
        const c = document.createElement('canvas');
        c.width = c.height = px;
        this.draw(c.getContext('2d'), id, px / 2, px / 2, px * 0.9);
        urlCache[key] = c.toDataURL();
      }
      return urlCache[key];
    }
  };
})();
