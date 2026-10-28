/*
 * Draws people: the player (a student) and everyone else in town.
 * All characters share one drawing function; a "look" object picks the
 * colours, hair style and size. Add your own looks to LOOKS below!
 */
DR.People = (function () {
  const G = DR.G;
  const O = G.OUTLINE;

  const LOOKS = {
    student: { skin: '#d9a066', hair: '#3b2a20', hairStyle: 'short', shirt: '#2a9d8f', pants: '#264653', backpack: '#f4a261' },
    classmateA: { skin: '#f1c27d', hair: '#a0522d', hairStyle: 'long', shirt: '#ef476f', pants: '#3d405b', backpack: '#ffd166' },
    classmateB: { skin: '#8d5524', hair: '#1b1b1b', hairStyle: 'curly', shirt: '#118ab2', pants: '#3d405b', backpack: '#06d6a0' },
    teacher: { skin: '#e0ac69', hair: '#5a3825', hairStyle: 'bun', shirt: '#8e7dbe', pants: '#2b2d42', scale: 1.1 },
    elderly: { skin: '#e8b98a', hair: '#e6e6e6', hairStyle: 'bald', shirt: '#b5838d', pants: '#6d6875', cane: true },
    child: { skin: '#c68642', hair: '#2b1d14', hairStyle: 'curly', shirt: '#ffd166', pants: '#118ab2', scale: 0.8 },
    shopper: { skin: '#f1c27d', hair: '#6b4226', hairStyle: 'short', shirt: '#e9c46a', pants: '#577590', hat: '#ffffff' },
    vendor: { skin: '#a16e4b', hair: '#1b1b1b', hairStyle: 'short', shirt: '#43aa8b', pants: '#4d5061', apron: true },
    vendor2: { skin: '#e0ac69', hair: '#b5651d', hairStyle: 'bun', shirt: '#f28482', pants: '#4d5061', apron: true },
    medic: { skin: '#d9a066', hair: '#2b1d14', hairStyle: 'short', shirt: '#2ec4b6', pants: '#1d3557', hat: '#2ec4b6' },
    helper: { skin: '#f1c27d', hair: '#3b2a20', hairStyle: 'short', shirt: '#ff9f1c', pants: '#2b2d42', vest: true }
  };

  function drawHair(c, L, facing) {
    c.fillStyle = L.hair;
    c.strokeStyle = O;
    c.lineWidth = 1.5;
    const style = L.hairStyle;
    if (style === 'bald') {
      // grey hair around the sides only
      c.beginPath(); c.arc(-8, -34, 4, 0, Math.PI * 2); c.arc(8, -34, 4, 0, Math.PI * 2); c.fill();
      return;
    }
    c.beginPath();
    if (facing === 'up') {
      c.arc(0, -34, 10, 0, Math.PI * 2);
    } else {
      c.arc(0, -35, 10.3, Math.PI * 1.02, Math.PI * 1.98);
      c.quadraticCurveTo(4, -38, -10, -36);
    }
    c.fill();
    if (style === 'long') {
      c.fillRect(-10.5, -36, 4, 13);
      c.fillRect(6.5, -36, 4, 13);
    }
    if (style === 'curly') {
      [-8, -3, 3, 8].forEach((x) => { c.beginPath(); c.arc(x, -42 + Math.abs(x) * 0.4, 3.5, 0, Math.PI * 2); c.fill(); });
    }
    if (style === 'bun') {
      c.beginPath(); c.arc(0, -46, 5, 0, Math.PI * 2); c.fill(); c.stroke();
    }
  }

  function drawFace(c, facing, L, mood) {
    if (facing === 'up') return;
    const ex = facing === 'left' ? -4 : facing === 'right' ? 4 : 0;
    c.fillStyle = O;
    if (mood === 'dizzy') {
      // swirly eyes
      c.strokeStyle = O; c.lineWidth = 1.2;
      [-3.5, 3.5].forEach((x) => { c.beginPath(); c.arc(x + ex, -33, 2, 0, Math.PI * 1.6); c.stroke(); });
    } else if (facing === 'down') {
      c.beginPath(); c.arc(-3.5, -33, 1.6, 0, Math.PI * 2); c.arc(3.5, -33, 1.6, 0, Math.PI * 2); c.fill();
    } else {
      c.beginPath(); c.arc(ex, -33, 1.6, 0, Math.PI * 2); c.fill();
    }
    // cheeks + mouth
    c.fillStyle = 'rgba(239, 71, 111, 0.25)';
    if (facing === 'down') { c.beginPath(); c.arc(-6, -30, 2, 0, Math.PI * 2); c.arc(6, -30, 2, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = O; c.lineWidth = 1.3;
    c.beginPath();
    if (mood === 'worried' || mood === 'dizzy') c.arc(ex, -27, 2.5, Math.PI * 1.15, Math.PI * 1.85);
    else c.arc(ex, -30.5, 2.5, Math.PI * 0.15, Math.PI * 0.85);
    c.stroke();
  }

  /** A crouched pose: used for "Drop, Cover and Hold On" and sheltering. */
  function drawCrouch(c, L, t) {
    const wob = Math.sin(t * 20) * 0.6;
    if (L.backpack) G.box(c, -9, -24, 18, 13, { fill: L.backpack, r: 5 });
    G.box(c, -11, -18 + wob, 22, 16, { fill: L.shirt, r: 8 });
    G.circle(c, 0, -20 + wob, 8.5, L.skin, O, 1.5);
    c.fillStyle = L.hair;
    c.beginPath(); c.arc(0, -21 + wob, 8.5, Math.PI, 0); c.fill();
    // arms covering the head and neck
    G.box(c, -11, -27 + wob, 22, 6, { fill: L.skin, r: 3, lw: 1.5 });
    G.box(c, -11, -27 + wob, 6, 6, { fill: L.shirt, r: 3, lw: 1.5 });
    G.box(c, 5, -27 + wob, 6, 6, { fill: L.shirt, r: 3, lw: 1.5 });
  }

  function drawSit(c, L, facing, mood) {
    G.box(c, -8, -10, 7, 10, { fill: L.pants, r: 3, lw: 1.5 });
    G.box(c, 1, -10, 7, 10, { fill: L.pants, r: 3, lw: 1.5 });
    G.box(c, -9, -24, 18, 15, { fill: L.shirt, r: 6, lw: 1.5 });
    G.circle(c, 0, -30, 10, L.skin, O, 1.5);
    c.save(); c.translate(0, 4);
    drawHair(c, L, facing);
    drawFace(c, facing, L, mood);
    c.restore();
  }

  /**
   * Draws a character `ch` (a DR.Character) at its position.
   * ch has: x, y, look, facing, walkT, moving, pose, mood
   */
  function draw(c, ch, t) {
    const L = ch.look;
    const s = (L.scale || 1) * (ch.scale || 1);
    c.save();
    c.translate(ch.x, ch.y);
    c.scale(s, s);
    c.lineJoin = 'round';
    G.ellipse(c, 0, 0, 11, 4, 'rgba(40, 30, 70, 0.22)');

    if (ch.pose === 'cover' || ch.pose === 'drop') {
      drawCrouch(c, L, ch.pose === 'cover' ? t : 0);
      c.restore();
      return;
    }
    if (ch.pose === 'sit') {
      drawSit(c, L, ch.facing, ch.mood);
      c.restore();
      return;
    }

    const f = ch.facing;
    const side = f === 'left' || f === 'right';
    const swing = ch.moving ? Math.sin(ch.walkT) : 0;
    const bob = ch.moving ? Math.abs(Math.cos(ch.walkT)) * 1.5 : 0;
    if (ch.mood === 'dizzy') c.rotate(Math.sin(t * 2.5) * 0.12);
    c.translate(0, -bob);

    // legs
    if (side) {
      G.box(c, -4 + swing * 3, -13, 6, 13, { fill: L.pants, r: 3, lw: 1.5 });
      G.box(c, -2 - swing * 3, -13, 6, 13, { fill: L.pants, r: 3, lw: 1.5 });
    } else {
      G.box(c, -7, -13 + swing * 1.5, 6, 13 - swing * 1.5, { fill: L.pants, r: 3, lw: 1.5 });
      G.box(c, 1, -13 - swing * 1.5, 6, 13 + swing * 1.5, { fill: L.pants, r: 3, lw: 1.5 });
    }

    // backpack behind the body (unless we see the back)
    if (L.backpack && f !== 'up') {
      if (side) G.box(c, f === 'left' ? 4 : -12, -25, 8, 13, { fill: L.backpack, r: 3, lw: 1.5 });
    }

    // body
    G.box(c, -9, -26, 18, 15, { fill: L.shirt, r: 6, lw: 1.5 });
    if (L.apron && f !== 'up') G.box(c, -6, -22, 12, 11, { fill: '#ffffff', r: 3, lw: 1 });
    if (L.vest) { c.fillStyle = '#f9f871'; c.fillRect(-8, -19, 16, 3); }
    if (L.backpack && f === 'down') {
      c.fillStyle = L.backpack;
      c.fillRect(-7, -26, 3, 12); c.fillRect(4, -26, 3, 12);
    }

    // arms
    if (side) {
      G.box(c, -2 + swing * 4, -23, 5, 11, { fill: L.skin, r: 2.5, lw: 1.5 });
    } else {
      G.box(c, -13, -24 - swing * 1.5, 5, 11, { fill: L.skin, r: 2.5, lw: 1.5 });
      G.box(c, 8, -24 + swing * 1.5, 5, 11, { fill: L.skin, r: 2.5, lw: 1.5 });
    }

    // head
    G.circle(c, 0, -34, 10, L.skin, O, 1.5);
    drawHair(c, L, f);
    drawFace(c, f, L, ch.mood);
    if (L.hat) {
      G.ellipse(c, 0, -41, 13, 4, L.hat);
      G.box(c, -7, -48, 14, 8, { fill: L.hat, r: 4, lw: 1.5 });
    }
    if (L.backpack && f === 'up') G.box(c, -8, -26, 16, 14, { fill: L.backpack, r: 4, lw: 1.5 });
    if (L.cane) {
      c.strokeStyle = '#7f5539'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(13, -14); c.lineTo(14, 0); c.stroke();
    }
    c.restore();

    if (ch.mood === 'dizzy') {
      // little stars spinning above the head = dizzy
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + (i * Math.PI * 2) / 3;
        G.circle(c, ch.x + Math.cos(a) * 12, ch.y - 52 * s + Math.sin(a) * 4, 2.5, '#ffd166', O, 1);
      }
    }
  }

  return { LOOKS, draw };
})();
