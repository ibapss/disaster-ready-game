/*
 * Props = everything placed in a level: walls, furniture, trees, buildings…
 *
 * Each function returns a prop object:
 *   { x, y, w, h,        // footprint (also the collision box if solid)
 *     solid,             // can the player walk through it?
 *     hits,              // optional list of collision boxes (instead of the footprint)
 *     layer,             // 'floor' (under people), 'low' (furniture) or 'high' (above people)
 *     draw(ctx, t, world) }
 *
 * Levels add props with world.add(DR.P.desk(100, 200)).
 */
DR.P = (function () {
  const G = DR.G;
  const O = G.OUTLINE;

  function prop(x, y, w, h, draw, extra) {
    return Object.assign({ x, y, w, h, solid: true, layer: 'low', draw }, extra || {});
  }

  /** Is the player standing close to (or under) a box? Used to fade roofs/tree tops. */
  function playerUnder(world, x, y, w, h, pad = 0) {
    const p = world && world.player;
    return p && p.x > x - pad && p.x < x + w + pad && p.y > y - pad && p.y < y + h + pad + 20;
  }

  const P = {
    // ---------------- Building parts ----------------
    wall(x, y, w, h, color) {
      return prop(x, y, w, h, null, { wall: true, color: color || '#fbe9d0' });
    },

    /** Window in a wall. `closed` shows storm shutters. */
    window(x, y, w, h) {
      const p = prop(x, y, w, h, function (c) {
        G.box(c, x - 1, y - 1, w + 2, h + 2, { fill: '#ffffff', r: 2 });
        if (p.closed) {
          G.box(c, x + 1, y + 1, w - 2, h - 2, { fill: '#8d6e63', r: 1, lw: 1.5 });
          c.strokeStyle = '#5d4037'; c.lineWidth = 1.5;
          const horiz = w > h;
          for (let i = 6; i < (horiz ? w : h); i += 6) {
            c.beginPath();
            if (horiz) { c.moveTo(x + i, y + 2); c.lineTo(x + i, y + h - 2); } else { c.moveTo(x + 2, y + i); c.lineTo(x + w - 2, y + i); }
            c.stroke();
          }
          return;
        }
        G.box(c, x + 2, y + 2, w - 4, h - 4, { fill: '#a9def9', r: 1, lw: 1.5 });
        c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2;
        c.beginPath();
        if (w > h) { c.moveTo(x + w * 0.3, y + 3); c.lineTo(x + w * 0.3 - 4, y + h - 3); } else { c.moveTo(x + 3, y + h * 0.3); c.lineTo(x + w - 3, y + h * 0.3 - 4); }
        c.stroke();
      }, { solid: false, closed: false });
      return p;
    },

    /** A door. Set prop.open = true to show it open. */
    door(x, y, w, h) {
      const p = prop(x, y, w, h, function (c) {
        G.box(c, x, y, w, h, { fill: p.open ? '#d7b48a' : '#a0673b', r: 2 });
        if (!p.open) {
          const horiz = w > h;
          G.circle(c, horiz ? x + w - 8 : x + w / 2, horiz ? y + h / 2 : y + h - 8, 2.5, '#ffd166', O, 1);
        }
      }, { solid: true, open: false });
      return p;
    },

    mat(x, y, w, h, color) {
      return prop(x, y, w, h, (c) => {
        G.box(c, x, y, w, h, { fill: color || '#b5838d', r: 3, stroke: false });
        c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 2; c.strokeRect(x + 4, y + 4, w - 8, h - 8);
      }, { solid: false, layer: 'floor' });
    },

    rug(x, y, w, h, kind) {
      return prop(x, y, w, h, (c) => {
        G.rr(c, x, y, w, h, 10);
        c.fillStyle = kind ? G.pattern(c, kind) : '#83c5be';
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3; c.stroke();
      }, { solid: false, layer: 'floor' });
    },

    stairs(x, y, w, h, label) {
      return prop(x, y, w, h, (c) => {
        G.box(c, x, y, w, h, { fill: '#c9d3dc', r: 2 });
        c.strokeStyle = '#9aa8b5'; c.lineWidth = 3;
        for (let i = 10; i < h; i += 14) { c.beginPath(); c.moveTo(x + 4, y + i); c.lineTo(x + w - 4, y + i); c.stroke(); }
        G.line(c, x + 6, y + 4, x + 6, y + h - 4, '#7b8794', 3);
        G.line(c, x + w - 6, y + 4, x + w - 6, y + h - 4, '#7b8794', 3);
        if (label) G.label(c, label, x + w / 2, y + h / 2, { size: 13 });
      }, { solid: false, layer: 'floor' });
    },

    // ---------------- Furniture ----------------
    /** A sturdy desk. When `occupied`, the desk top is drawn over the player hiding underneath. */
    desk(x, y, w = 70, h = 38) {
      const top = function (c) {
        G.block(c, x, y, w, h, '#d9a066', '#a8743f', 8, 4);
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + 5, y + 4, w - 10, 3);
      };
      return prop(x, y, w, h, function (c) {
        if (!this.occupied) top(c);
        else {
          // legs only — the top is drawn above the character (drawHigh)
          [[x + 2, y + h - 10], [x + w - 8, y + h - 10]].forEach(([lx, ly]) => G.box(c, lx, ly, 6, 10, { fill: '#a8743f', r: 1, lw: 1.5 }));
        }
      }, {
        occupied: false,
        drawHigh(c) {
          if (!this.occupied) return;
          c.save(); c.globalAlpha = 0.72; top(c); c.restore();
        }
      });
    },

    chair(x, y, color) {
      return prop(x, y, 22, 20, (c) => {
        G.block(c, x, y, 22, 20, color || '#90be6d', '#6a994e', 5, 4);
        G.box(c, x, y - 5, 22, 6, { fill: color || '#90be6d', r: 3, lw: 1.5 });
      }, { solid: false });
    },

    table(x, y, w, h, color) {
      return prop(x, y, w, h, (c) => {
        G.block(c, x, y, w, h, color || '#e9c46a', '#c49a3c', 7, 8);
      });
    },

    bookshelf(x, y, w, h) {
      const p = prop(x, y, w, h, (c) => {
        G.block(c, x, y, w, h, '#8d6e63', '#6d4c41', 6, 3);
        const colors = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#ffd166', '#9d4edd'];
        const horiz = w >= h;
        const n = Math.floor((horiz ? w : h) / 9);
        for (let i = 0; i < n; i++) {
          if (p.fallen && i % 3 === 0) continue;
          c.fillStyle = colors[i % colors.length];
          if (horiz) c.fillRect(x + 4 + i * 9, y + 4, 7, h - 14);
          else c.fillRect(x + 4, y + 4 + i * 9, w - 10, 7);
        }
        if (p.fallen) {
          // a few books on the floor after the shaking
          [[0.2, 1], [0.5, 1.3], [0.8, 1.1]].forEach(([fx, fy], i) => {
            c.save();
            c.translate(horiz ? x + w * fx : x + w + 14 * fy, horiz ? y - 14 * fy : y + h * fx);
            c.rotate(i * 0.7 + 0.3);
            G.box(c, -7, -4, 14, 8, { fill: colors[i + 1], r: 1, lw: 1.2 });
            c.restore();
          });
        }
      }, { fallen: false });
      return p;
    },

    cabinet(x, y, w, h, color) {
      return prop(x, y, w, h, (c) => {
        G.block(c, x, y, w, h, color || '#b08968', '#8a6a4f', 6, 3);
        G.line(c, x + w / 2, y + 3, x + w / 2, y + h - 8, '#7f5539', 1.5);
        G.circle(c, x + w / 2 - 5, y + h / 2 - 3, 1.8, '#ffd166');
        G.circle(c, x + w / 2 + 5, y + h / 2 - 3, 1.8, '#ffd166');
      });
    },

    bed(x, y, w, h, color) {
      return prop(x, y, w, h, (c) => {
        G.block(c, x, y, w, h, '#f1faee', '#a8dadc', 6, 6);
        G.box(c, x + 6, y + 6, w - 12, 28, { fill: '#ffffff', r: 8 });
        G.box(c, x, y + 40, w, h - 46, { fill: color || '#457b9d', r: 6 });
        G.line(c, x + 4, y + 52, x + w - 4, y + 52, 'rgba(255,255,255,0.5)', 3);
      });
    },

    sofa(x, y, w, h, color) {
      return prop(x, y, w, h, (c) => {
        const col = color || '#6a4c93';
        G.block(c, x, y, w, h, col, '#4d3670', 6, 10);
        G.box(c, x, y + h - 22, w, 16, { fill: '#8a6bbd', r: 8 });
        G.box(c, x - 4, y + 4, 14, h - 10, { fill: col, r: 6 });
        G.box(c, x + w - 10, y + 4, 14, h - 10, { fill: col, r: 6 });
      });
    },

    tv(x, y, w, h) {
      return prop(x, y, w, h, (c) => {
        G.block(c, x, y, w, h, '#a5a58d', '#6b705c', 6, 3);
        G.box(c, x + w / 2 - 34, y - 4, 68, 12, { fill: '#2d3142', r: 2 });
      });
    },

    fridge(x, y, w, h) {
      return prop(x, y, w, h, (c) => {
        G.block(c, x, y, w, h, '#f8f9fa', '#ced4da', 7, 5);
        G.line(c, x + 4, y + h * 0.35, x + w - 4, y + h * 0.35, '#adb5bd', 2);
        G.line(c, x + w - 9, y + 6, x + w - 9, y + h * 0.3, '#adb5bd', 2);
      });
    },

    counter(x, y, w, h, opts = {}) {
      return prop(x, y, w, h, (c) => {
        G.block(c, x, y, w, h, '#ced4da', '#8d99ae', 7, 3);
        if (opts.sink !== undefined) G.box(c, x + opts.sink, y + 6, 40, h - 18, { fill: '#a9def9', r: 6 });
        if (opts.stove !== undefined) {
          G.box(c, x + opts.stove, y + 4, 48, h - 14, { fill: '#2d3142', r: 3 });
          [[10, 9], [34, 9]].forEach(([dx, dy]) => G.circle(c, x + opts.stove + dx, y + 4 + dy + 4, 6, null, '#ef476f', 2));
        }
      });
    },

    wardrobe(x, y, w, h) {
      return prop(x, y, w, h, (c) => {
        G.block(c, x, y, w, h, '#cb997e', '#a5765d', 8, 3);
        G.line(c, x + w / 2, y + 3, x + w / 2, y + h - 10, '#7f5539', 2);
      });
    },

    plant(x, y, size = 26) {
      return prop(x, y, size, size, (c) => {
        G.box(c, x + 4, y + size * 0.45, size - 8, size * 0.55, { fill: '#e07a5f', r: 4 });
        [[0.5, 0.25, 0.32], [0.25, 0.4, 0.26], [0.75, 0.4, 0.26]].forEach(([fx, fy, fr]) =>
          G.circle(c, x + size * fx, y + size * fy, size * fr, '#52b788', O, 1.5));
      });
    },

    whiteboard(x, y, w, h) {
      return prop(x, y, w, h, (c) => {
        G.box(c, x, y, w, h, { fill: '#ffffff', r: 2 });
        c.strokeStyle = '#4361ee'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x + w / 2, y + 12); c.lineTo(x + w / 2, y + h - 12); c.stroke();
      }, { solid: false });
    },

    /** Ceiling light. It swings when prop.swing > 0. */
    hangingLight(x, y) {
      return prop(x - 14, y - 14, 28, 28, function (c, t) {
        const off = Math.sin(t * 9) * (this.swing || 0) * 10;
        c.strokeStyle = 'rgba(61,58,75,0.5)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + off, y); c.stroke();
        G.circle(c, x + off, y, 13, '#ffe8a3', O, 2);
        G.circle(c, x + off, y, 6, '#fff7d6');
      }, { solid: false, layer: 'high', swing: 0 });
    },

    // ---------------- Outdoors ----------------
    /** A tree: the trunk is solid, the leaves are drawn above people. */
    tree(x, y, r = 34, color) {
      const col = color || '#52b788';
      return prop(x - r, y - r * 1.6, r * 2, r * 2, function (c) {
        // trunk (drawn under people)
        G.ellipse(c, x + 6, y + 2, r * 0.8, r * 0.3, 'rgba(40,30,70,0.18)');
        G.box(c, x - 6, y - 26, 12, 30, { fill: '#8d6e63', r: 4 });
      }, {
        hits: [{ x: x - 8, y: y - 6, w: 16, h: 12 }],
        drawHigh(c, t, world) {
          // leaves (drawn above people, see-through when you walk under)
          const sway = Math.sin(t * 1.3 + x) * (this.sway || 1) * 1.5;
          const fade = playerUnder(world, x - r, y - r * 2.2, r * 2, r * 2.4);
          c.save();
          if (fade) c.globalAlpha = 0.55;
          c.translate(sway, 0);
          G.circle(c, x, y - r * 1.15, r, col, O, 2);
          G.circle(c, x - r * 0.35, y - r * 1.35, r * 0.45, 'rgba(255,255,255,0.18)');
          G.circle(c, x + r * 0.45, y - r * 0.9, r * 0.35, 'rgba(0,0,0,0.06)');
          c.restore();
        }
      });
    },

    bush(x, y, r = 16) {
      return prop(x - r, y - r, r * 2, r * 2, (c) => {
        G.circle(c, x, y, r, '#40916c', O, 2);
        G.circle(c, x - r * 0.3, y - r * 0.3, r * 0.4, 'rgba(255,255,255,0.15)');
      });
    },

    flowers(x, y) {
      return prop(x, y, 30, 20, (c) => {
        [[4, 6, '#ff70a6'], [14, 2, '#ffd670'], [24, 8, '#70d6ff'], [10, 14, '#ff9770'], [22, 16, '#e9ff70']].forEach(([dx, dy, col]) =>
          G.circle(c, x + dx, y + dy, 3.5, col, O, 1));
      }, { solid: false, layer: 'floor' });
    },

    /** A house seen from above: roof with a ridge, front wall with a door. */
    house(x, y, w, h, roof, wallCol) {
      return prop(x, y, w, h, (c) => {
        G.shadow(c, x, y, w, h, 4);
        G.box(c, x, y + h - 26, w, 26, { fill: wallCol || '#fefae0', r: 2 });
        G.box(c, x + w / 2 - 12, y + h - 22, 24, 22, { fill: '#a0673b', r: 2 });
        G.box(c, x + 14, y + h - 20, 22, 12, { fill: '#a9def9', r: 2 });
        G.box(c, x + w - 36, y + h - 20, 22, 12, { fill: '#a9def9', r: 2 });
        c.fillStyle = roof || '#e76f51';
        c.strokeStyle = O; c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x - 6, y + h - 24); c.lineTo(x - 6, y + 6); c.lineTo(x + w / 2, y - 6);
        c.lineTo(x + w + 6, y + 6); c.lineTo(x + w + 6, y + h - 24); c.closePath();
        c.fill(); c.stroke();
        G.line(c, x + w / 2, y - 6, x + w / 2, y + h - 24, 'rgba(0,0,0,0.2)', 3);
        c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2;
        for (let yy = y + 14; yy < y + h - 26; yy += 12) { c.beginPath(); c.moveTo(x - 4, yy); c.lineTo(x + w + 4, yy); c.stroke(); }
      });
    },

    /** A big flat-roofed building (school hall, community centre, shelter). */
    building(x, y, w, h, o = {}) {
      return prop(x, y, w, h, (c) => {
        G.shadow(c, x, y, w, h, 4);
        G.box(c, x, y, w, h, { fill: o.wall || '#ffe5b4', r: 3 });
        c.fillStyle = G.pattern(c, 'roof');
        c.fillRect(x + 8, y + 8, w - 16, h - 40);
        c.strokeStyle = O; c.lineWidth = 2; c.strokeRect(x + 8, y + 8, w - 16, h - 40);
        // front wall with windows
        for (let wx = x + 16; wx < x + w - 30; wx += 40) G.box(c, wx, y + h - 26, 24, 14, { fill: '#a9def9', r: 2, lw: 1.5 });
        if (o.door !== false) G.box(c, x + w / 2 - 16, y + h - 28, 32, 28, { fill: o.doorColor || '#457b9d', r: 2 });
        G.box(c, x + 24, y + 22, 34, 24, { fill: '#e9ecef', r: 3 });
        G.circle(c, x + 41, y + 34, 8, null, '#adb5bd', 2);
        if (o.label) {
          G.box(c, x + w / 2 - o.label.length * 5 - 12, y + h / 2 - 28, o.label.length * 10 + 24, 28, { fill: o.labelColor || '#2a9d8f', r: 6 });
          G.label(c, o.label, x + w / 2, y + h / 2 - 14, { size: 15, color: '#fff', outline: 'rgba(0,0,0,0.25)', lw: 3 });
        }
      });
    },

    fence(x, y, w, h) {
      return prop(x, y, w, h, (c) => {
        const horiz = w > h;
        c.fillStyle = '#f2e8cf';
        c.strokeStyle = O; c.lineWidth = 1.5;
        if (horiz) {
          c.fillRect(x, y + h / 2 - 2, w, 4); c.strokeRect(x, y + h / 2 - 2, w, 4);
          for (let i = x + 2; i < x + w - 4; i += 14) { G.box(c, i, y - 4, 7, h + 4, { fill: '#f2e8cf', r: 2, lw: 1.5 }); }
        } else {
          c.fillRect(x + w / 2 - 2, y, 4, h); c.strokeRect(x + w / 2 - 2, y, 4, h);
          for (let i = y + 2; i < y + h - 4; i += 14) { G.box(c, x, i, w, 7, { fill: '#f2e8cf', r: 2, lw: 1.5 }); }
        }
      });
    },

    bench(x, y, w = 60, h = 20) {
      return prop(x, y, w, h, (c) => {
        G.block(c, x, y, w, h, '#bc6c25', '#8c4f1b', 6, 3);
        G.line(c, x + 3, y + 6, x + w - 3, y + 6, 'rgba(255,255,255,0.3)', 2);
      });
    },

    /** Electricity pole (wires are drawn by powerLines). */
    pole(x, y) {
      return prop(x - 6, y - 6, 12, 12, (c) => {
        G.ellipse(c, x + 4, y + 3, 10, 4, 'rgba(40,30,70,0.2)');
        G.box(c, x - 4, y - 46, 8, 50, { fill: '#8d6e63', r: 2 });
        G.box(c, x - 16, y - 48, 32, 6, { fill: '#6d4c41', r: 2 });
      }, { hits: [{ x: x - 6, y: y - 6, w: 12, h: 12 }] });
    },

    powerLines(points) {
      return prop(0, 0, 0, 0, (c, t) => {
        c.strokeStyle = '#2d3142'; c.lineWidth = 1.5;
        [-12, 0, 12].forEach((off) => {
          c.beginPath();
          for (let i = 0; i < points.length - 1; i++) {
            const [ax, ay] = points[i];
            const [bx, by] = points[i + 1];
            c.moveTo(ax + off, ay - 46);
            c.quadraticCurveTo((ax + bx) / 2 + off, (ay + by) / 2 - 30 + Math.sin(t * 2 + i) * 1.5, bx + off, by - 46);
          }
          c.stroke();
        });
      }, { solid: false, layer: 'high' });
    },

    /** A fallen power line on the ground: dangerous! */
    fallenWire(x, y, len = 120, angle = 0.3) {
      return prop(x - len / 2, y - 20, len, 40, (c, t) => {
        c.save();
        c.translate(x, y); c.rotate(angle);
        G.box(c, -len / 2 - 20, -5, 34, 10, { fill: '#8d6e63', r: 3 });
        c.strokeStyle = '#2d3142'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(-len / 2 + 10, 0);
        c.bezierCurveTo(-len / 6, 18, len / 6, -18, len / 2, 4); c.stroke();
        // sparks
        for (let i = 0; i < 4; i++) {
          const a = t * 13 + i * 1.7;
          const r = 6 + (Math.sin(a * 1.3) + 1) * 5;
          c.strokeStyle = i % 2 ? '#ffd60a' : '#ffffff'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(len / 2, 4); c.lineTo(len / 2 + Math.cos(a) * r, 4 + Math.sin(a) * r); c.stroke();
        }
        c.restore();
        G.label(c, 'DANGER!', x, y - 30, { size: 12, color: '#d00000' });
      }, { solid: false, layer: 'floor' });
    },

    car(x, y, color, vertical) {
      const w = vertical ? 40 : 70;
      const h = vertical ? 70 : 40;
      return prop(x, y, w, h, (c) => {
        G.shadow(c, x, y, w, h, 10);
        G.box(c, x, y, w, h, { fill: color || '#4cc9f0', r: 10 });
        if (vertical) G.box(c, x + 5, y + 16, w - 10, 30, { fill: '#caf0f8', r: 5 });
        else G.box(c, x + 16, y + 5, 30, h - 10, { fill: '#caf0f8', r: 5 });
      });
    },

    /** Market stall: a counter with a striped awning that makes shade in front. */
    stall(x, y, color) {
      const col = color || '#e63946';
      return prop(x, y, 130, 90, function (c) {
        // counter with fruit and vegetables
        G.block(c, x + 5, y + 34, 120, 26, '#ddb892', '#b08968', 7, 3);
        ['#ffb703', '#fb8500', '#8ac926', '#ff595e', '#6a4c93'].forEach((g, i) => G.circle(c, x + 20 + i * 23, y + 41, 6, g, O, 1.2));
      }, {
        hits: [{ x: x + 5, y: y + 34, w: 120, h: 26 }],
        drawHigh(c, t, world) {
          // striped awning (fades if you are underneath)
          const under = playerUnder(world, x, y - 10, 130, 44);
          c.save();
          if (under) c.globalAlpha = 0.55;
          for (let i = 0; i < 6; i++) {
            c.fillStyle = i % 2 ? '#ffffff' : col;
            c.fillRect(x + i * (130 / 6), y - 8, 130 / 6 + 0.5, 36);
          }
          c.strokeStyle = O; c.lineWidth = 2; c.strokeRect(x, y - 8, 130, 36);
          for (let i = 0; i < 6; i++) {
            c.fillStyle = i % 2 ? '#ffffff' : col;
            c.beginPath(); c.arc(x + (i + 0.5) * (130 / 6), y + 28, 130 / 12, 0, Math.PI); c.fill(); c.stroke();
          }
          c.restore();
        }
      });
    },

    /** Big roof with pillars where people can rest in the shade. */
    pavilion(x, y, w, h) {
      const posts = [[x + 6, y + 6], [x + w - 20, y + 6], [x + 6, y + h - 20], [x + w - 20, y + h - 20]];
      return prop(x, y, w, h, function (c) {
        posts.forEach(([px, py]) => G.box(c, px, py - 10, 14, 24, { fill: '#cdb4db', r: 3 }));
      }, {
        hits: posts.map(([px, py]) => ({ x: px, y: py, w: 14, h: 14 })),
        drawHigh(c, t, world) {
          const under = playerUnder(world, x, y, w, h);
          c.save();
          c.globalAlpha = under ? 0.3 : 0.95;
          G.box(c, x - 10, y - 30, w + 20, h + 10, { fill: '#2a9d8f', r: 10 });
          c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3;
          for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(x - 10 + (w + 20) * i / 6, y - 28); c.lineTo(x - 10 + (w + 20) * i / 6, y + h - 22); c.stroke(); }
          c.restore();
          if (!under) G.label(c, 'Shady rest area', x + w / 2, y + h / 2 - 20, { size: 16, color: '#fff', outline: 'rgba(0,0,0,0.3)' });
        }
      });
    },

    /** Drinking water tap. */
    tap(x, y) {
      return prop(x - 14, y - 10, 28, 20, (c, t) => {
        G.block(c, x - 14, y - 10, 28, 20, '#90e0ef', '#48cae4', 6, 6);
        G.box(c, x - 3, y - 26, 6, 18, { fill: '#adb5bd', r: 2 });
        G.box(c, x - 3, y - 26, 12, 5, { fill: '#adb5bd', r: 2 });
        const drip = (t * 2) % 1;
        G.circle(c, x + 7, y - 18 + drip * 10, 2, '#4cc9f0');
      });
    },

    /** Signpost with a short message. */
    sign(x, y, text, color, arrow) {
      return prop(x - 4, y - 4, 8, 8, null, {
        layer: 'high',
        hits: [{ x: x - 4, y: y - 4, w: 8, h: 8 }],
        draw(c) {
          G.box(c, x - 3, y - 40, 6, 44, { fill: '#8d6e63', r: 2 });
          c.font = `800 13px ${G.FONT}`;
          const tw = c.measureText(text).width + 22 + (arrow ? 14 : 0);
          G.box(c, x - tw / 2, y - 66, tw, 28, { fill: color || '#2a9d8f', r: 6 });
          G.label(c, text + (arrow ? ' ' + arrow : ''), x, y - 52, { size: 13, color: '#fff', outline: 'rgba(0,0,0,0.25)', lw: 3 });
        }
      });
    },

    /** Playground swing frame. */
    swings(x, y) {
      return prop(x, y, 110, 50, (c, t) => {
        G.box(c, x, y, 8, 50, { fill: '#ef476f', r: 3 });
        G.box(c, x + 102, y, 8, 50, { fill: '#ef476f', r: 3 });
        G.box(c, x, y, 110, 8, { fill: '#ef476f', r: 3 });
        [30, 70].forEach((dx, i) => {
          const s = Math.sin(t * 2 + i) * 4;
          G.line(c, x + dx, y + 8, x + dx + s, y + 36, O, 1.5);
          G.box(c, x + dx - 8 + s, y + 34, 16, 6, { fill: '#ffd166', r: 2, lw: 1.5 });
        });
      }, { solid: false });
    },

    slide(x, y) {
      return prop(x, y, 36, 80, (c) => {
        G.box(c, x + 6, y, 24, 18, { fill: '#118ab2', r: 3 });
        G.box(c, x + 6, y + 18, 24, 62, { fill: '#06d6a0', r: 8 });
        G.line(c, x + 18, y + 24, x + 18, y + 74, 'rgba(255,255,255,0.5)', 3);
      });
    },

    shed(x, y, w, h) {
      return prop(x, y, w, h, (c) => {
        G.shadow(c, x, y, w, h, 3);
        G.box(c, x, y, w, h, { fill: '#a98467', r: 3 });
        c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 2;
        for (let i = x + 10; i < x + w; i += 10) { c.beginPath(); c.moveTo(i, y + 2); c.lineTo(i, y + h - 2); c.stroke(); }
        G.box(c, x + w / 2 - 12, y + h - 26, 24, 26, { fill: '#6c584c', r: 2 });
      });
    },

    /** Fallen tree lying across the ground (blocks the way). */
    fallenTree(x, y, w) {
      return prop(x, y, w, 30, (c) => {
        G.shadow(c, x, y, w, 30, 12);
        G.box(c, x, y + 4, w - 30, 22, { fill: '#8d6e63', r: 10 });
        G.circle(c, x + 6, y + 15, 9, '#d4a373', O, 2);
        [[w - 40, 0, 26], [w - 18, 14, 22], [w - 50, 24, 18]].forEach(([dx, dy, r]) => G.circle(c, x + dx, y + dy, r, '#52b788', O, 2));
      });
    },

    ambulance(x, y) {
      return prop(x, y, 110, 54, function (c, t) {
        const ax = this.x;
        const ay = this.y;
        G.shadow(c, ax, ay, 110, 54, 10);
        G.box(c, ax, ay, 110, 54, { fill: '#ffffff', r: 10 });
        G.box(c, ax + 80, ay + 6, 24, 42, { fill: '#caf0f8', r: 5 });
        c.fillStyle = '#e63946';
        c.fillRect(ax + 30, ay + 22, 30, 10); c.fillRect(ax + 40, ay + 12, 10, 30);
        c.fillStyle = '#2ec4b6'; c.fillRect(ax + 4, ay + 44, 72, 5);
        const on = Math.floor(t * 4) % 2;
        G.circle(c, ax + 70, ay + 10, 5, on ? '#4cc9f0' : '#ffffff', O, 1.5);
        G.circle(c, ax + 70, ay + 44, 5, on ? '#ffffff' : '#4cc9f0', O, 1.5);
      }, { solid: false });
    },

    /** Main electricity switch box on a wall. */
    fuseBox(x, y) {
      return prop(x - 14, y - 14, 28, 28, function (c) {
        DR.Icons.draw(c, 'switchbox', x, y, 30);
        if (this.off) G.label(c, 'OFF', x, y + 22, { size: 11, color: '#2a9d8f' });
      }, { solid: false, off: false });
    },

    /** A radio on a shelf. It blinks when there is a new message. */
    radio(x, y) {
      return prop(x - 14, y - 12, 28, 24, function (c, t) {
        DR.Icons.draw(c, 'radio', x, y, 28);
        if (this.beeping && Math.floor(t * 3) % 2) {
          c.strokeStyle = '#ffd166'; c.lineWidth = 2;
          [10, 16].forEach((r) => { c.beginPath(); c.arc(x + 4, y - 4, r, -1.2, -0.2); c.stroke(); });
        }
      }, { solid: false, beeping: false });
    },

    /** A painted area on the ground, e.g. the assembly point. */
    paintedArea(x, y, w, h, text, color) {
      return prop(x, y, w, h, (c) => {
        c.fillStyle = color || 'rgba(6, 214, 160, 0.25)';
        G.rr(c, x, y, w, h, 14); c.fill();
        c.setLineDash([14, 10]);
        c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.stroke();
        c.setLineDash([]);
        if (text) G.label(c, text, x + w / 2, y + h / 2, { size: 22, color: '#ffffff', outline: 'rgba(0,0,0,0.25)', lw: 5 });
      }, { solid: false, layer: 'floor' });
    },

    /** Painted arrow on the ground for evacuation routes. */
    arrow(x, y, angle, color) {
      return prop(x - 16, y - 16, 32, 32, (c) => {
        c.save(); c.translate(x, y); c.rotate(angle);
        c.fillStyle = color || 'rgba(255,255,255,0.85)';
        c.beginPath(); c.moveTo(16, 0); c.lineTo(0, -14); c.lineTo(0, -6); c.lineTo(-16, -6); c.lineTo(-16, 6); c.lineTo(0, 6); c.lineTo(0, 14); c.closePath(); c.fill();
        c.restore();
      }, { solid: false, layer: 'floor' });
    },

    // ---------- Loose yard objects (storm level) ----------
    /** kind: 'chair' | 'bin' | 'bike' | 'pot'. Shows a strap when secured. */
    looseObject(x, y, kind) {
      const p = prop(x - 18, y - 14, 36, 28, function (c, t) {
        let ox = 0;
        if (!this.secured && this.wind) ox = Math.sin(t * 12 + x) * this.wind * 3;
        c.save(); c.translate(x + ox, y);
        if (kind === 'chair') {
          G.block(c, -14, -8, 28, 20, '#ffffff', '#ced4da', 5, 4);
          G.box(c, -14, -16, 28, 8, { fill: '#ffffff', r: 3, lw: 1.5 });
        } else if (kind === 'bin') {
          G.box(c, -12, -16, 24, 30, { fill: '#2a9d8f', r: 4 });
          G.box(c, -14, -18, 28, 7, { fill: '#21867a', r: 3 });
        } else if (kind === 'bike') {
          G.circle(c, -12, 4, 9, null, O, 3); G.circle(c, 12, 4, 9, null, O, 3);
          c.strokeStyle = '#ef476f'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(-12, 4); c.lineTo(-2, -8); c.lineTo(10, -8); c.lineTo(12, 4); c.moveTo(-2, -8); c.lineTo(2, 4); c.stroke();
        } else {
          G.box(c, -11, -4, 22, 16, { fill: '#e07a5f', r: 4 });
          G.circle(c, 0, -10, 10, '#52b788', O, 2);
          G.circle(c, -6, -14, 3, '#ff70a6'); G.circle(c, 5, -12, 3, '#ffd670');
        }
        if (this.secured) {
          c.strokeStyle = '#ffd166'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(-16, -12); c.lineTo(16, 12); c.moveTo(16, -12); c.lineTo(-16, 12); c.stroke();
          G.circle(c, 14, -14, 7, '#06d6a0', O, 1.5);
          c.strokeStyle = '#fff'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(10.5, -14); c.lineTo(13, -11.5); c.lineTo(17.5, -17); c.stroke();
        }
        c.restore();
      }, { secured: false, wind: 0, kind });
      return p;
    }
  };

  return P;
})();
