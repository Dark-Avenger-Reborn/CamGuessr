// ─────────────────────────────────────────────
// MAP.JS — World map drawing + coordinate math
// ─────────────────────────────────────────────

const WorldMap = (() => {
  // Simplified world country polygons (viewBox 0 0 340 220)
  const COUNTRIES = [
    { d:'M 44 60 L 100 58 L 105 82 L 95 92 L 50 90 Z', name:'United States' },
    { d:'M 44 40 L 110 38 L 108 60 L 44 62 Z', name:'Canada' },
    { d:'M 50 92 L 88 90 L 90 108 L 58 113 Z', name:'Mexico' },
    { d:'M 60 113 L 82 110 L 84 125 L 60 128 Z', name:'Central America' },
    { d:'M 78 108 L 100 105 L 102 120 L 78 123 Z', name:'Colombia/Venezuela' },
    { d:'M 90 115 L 138 108 L 142 150 L 96 155 Z', name:'Brazil' },
    { d:'M 90 148 L 122 148 L 118 178 L 88 178 Z', name:'Argentina' },
    { d:'M 82 138 L 100 137 L 100 152 L 82 153 Z', name:'Peru/Bolivia' },
    { d:'M 110 148 L 130 146 L 128 162 L 110 163 Z', name:'Paraguay/Uruguay' },
    { d:'M 106 108 L 128 106 L 130 120 L 106 122 Z', name:'Venezuela' },
    { d:'M 130 108 L 150 106 L 152 128 L 130 130 Z', name:'Guyana/Suriname' },
    { d:'M 162 44 L 178 42 L 179 56 L 162 57 Z', name:'United Kingdom' },
    { d:'M 169 55 L 185 54 L 186 68 L 169 69 Z', name:'France' },
    { d:'M 182 46 L 198 44 L 199 58 L 182 59 Z', name:'Germany' },
    { d:'M 162 67 L 182 65 L 182 78 L 162 79 Z', name:'Spain/Portugal' },
    { d:'M 184 63 L 196 61 L 198 80 L 184 78 Z', name:'Italy' },
    { d:'M 188 44 L 208 42 L 209 57 L 188 58 Z', name:'Poland/Czech' },
    { d:'M 196 32 L 300 26 L 305 65 L 196 66 Z', name:'Russia' },
    { d:'M 198 57 L 228 55 L 229 67 L 198 68 Z', name:'Ukraine/Belarus' },
    { d:'M 208 65 L 236 63 L 238 78 L 208 80 Z', name:'Turkey' },
    { d:'M 185 73 L 210 71 L 210 88 L 185 90 Z', name:'Greece/Balkans' },
    { d:'M 214 46 L 240 44 L 241 60 L 214 61 Z', name:'Kazakhstan' },
    { d:'M 218 78 L 252 75 L 254 110 L 218 112 Z', name:'Saudi Arabia' },
    { d:'M 234 68 L 262 65 L 263 88 L 234 90 Z', name:'Iran' },
    { d:'M 200 85 L 220 83 L 221 100 L 200 102 Z', name:'Egypt' },
    { d:'M 165 88 L 205 85 L 206 115 L 165 117 Z', name:'North Africa' },
    { d:'M 165 115 L 210 112 L 212 140 L 165 142 Z', name:'West Africa' },
    { d:'M 210 112 L 245 110 L 246 138 L 210 140 Z', name:'East Africa' },
    { d:'M 192 138 L 225 136 L 226 160 L 192 162 Z', name:'Central Africa' },
    { d:'M 195 158 L 225 156 L 226 182 L 195 184 Z', name:'Southern Africa' },
    { d:'M 226 155 L 246 153 L 247 178 L 226 180 Z', name:'Mozambique/Madagascar' },
    { d:'M 258 70 L 282 68 L 283 88 L 258 90 Z', name:'Afghanistan/Pakistan' },
    { d:'M 266 88 L 302 85 L 302 122 L 266 125 Z', name:'India' },
    { d:'M 283 55 L 335 48 L 338 90 L 283 93 Z', name:'China' },
    { d:'M 302 80 L 318 79 L 318 98 L 302 99 Z', name:'Myanmar/Thailand' },
    { d:'M 318 60 L 330 58 L 332 74 L 318 75 Z', name:'South Korea' },
    { d:'M 330 54 L 342 52 L 344 74 L 330 75 Z', name:'Japan' },
    { d:'M 295 95 L 335 92 L 336 108 L 295 111 Z', name:'Southeast Asia' },
    { d:'M 288 148 L 338 144 L 340 182 L 288 186 Z', name:'Australia' },
    { d:'M 338 172 L 350 170 L 352 188 L 338 190 Z', name:'New Zealand' },
    { d:'M 250 108 L 268 106 L 268 125 L 250 127 Z', name:'Yemen/Oman' },
    { d:'M 248 78 L 268 75 L 268 90 L 248 92 Z', name:'Iraq/Syria' },
    { d:'M 268 72 L 286 70 L 286 82 L 268 84 Z', name:'Uzbekistan' },
  ];

  function lonToX(lon, W = 340) { return ((lon + 180) / 360) * W; }
  function latToY(lat, H = 220) { return ((90 - lat) / 180) * H; }
  function xToLon(x, W = 340) { return (x / W) * 360 - 180; }
  function yToLat(y, H = 220) { return 90 - (y / H) * 180; }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function calcPoints(distKm) {
    if (distKm < 10)   return 5000;
    if (distKm < 100)  return Math.round(5000 - (distKm - 10) * 40);
    if (distKm < 1000) return Math.round(1400 - (distKm - 100) * 1.1);
    if (distKm < 5000) return Math.round(400 - (distKm - 1000) * 0.08);
    return 0;
  }

  function ns(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }

  function drawGrid(svg, vx = 1, vy = 1) {
    const g = ns('g');
    for (let x = 0; x <= 340; x += 20) {
      const line = ns('line');
      line.setAttribute('x1', x * vx); line.setAttribute('x2', x * vx);
      line.setAttribute('y1', 0); line.setAttribute('y2', 220 * vy);
      line.setAttribute('stroke', 'rgba(0,255,65,0.05)'); line.setAttribute('stroke-width', '0.5');
      g.appendChild(line);
    }
    for (let y = 0; y <= 220; y += 20) {
      const line = ns('line');
      line.setAttribute('x1', 0); line.setAttribute('x2', 340 * vx);
      line.setAttribute('y1', y * vy); line.setAttribute('y2', y * vy);
      line.setAttribute('stroke', 'rgba(0,255,65,0.05)'); line.setAttribute('stroke-width', '0.5');
      g.appendChild(line);
    }
    svg.appendChild(g);
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function clientToMap(svg, clientX, clientY, baseW = 340, baseH = 220) {
    const rect = svg.getBoundingClientRect();
    const relX = clamp(clientX - rect.left, 0, rect.width);
    const relY = clamp(clientY - rect.top, 0, rect.height);
    const x = (relX / rect.width) * baseW;
    const y = (relY / rect.height) * baseH;
    return {
      x,
      y,
      lat: yToLat(y, baseH),
      lon: xToLon(x, baseW),
      relX,
      relY,
      rect
    };
  }

  function drawCountries(svg, vx = 1, vy = 1) {
    COUNTRIES.forEach(c => {
      const path = ns('path');
      const scaled = c.d.replace(/[\d.]+/g, (n, idx) => {
        let di = 0;
        const pre = c.d.slice(0, idx);
        const nums = pre.match(/[\d.]+/g);
        di = nums ? nums.length : 0;
        return di % 2 === 0 ? (parseFloat(n) * vx).toFixed(1) : (parseFloat(n) * vy).toFixed(1);
      });
      path.setAttribute('d', scaled);
      path.setAttribute('fill', 'rgba(0,255,65,0.07)');
      path.setAttribute('stroke', 'rgba(0,255,65,0.25)');
      path.setAttribute('stroke-width', '0.5');
      svg.appendChild(path);
    });
  }

  function drawPin(svg, cx, cy, color, label) {
    const g = ns('g');

    const pulse = ns('circle');
    pulse.setAttribute('cx', cx); pulse.setAttribute('cy', cy);
    pulse.setAttribute('r', '9');
    pulse.setAttribute('fill', color); pulse.setAttribute('fill-opacity', '0.15');
    pulse.setAttribute('stroke', color); pulse.setAttribute('stroke-width', '0.5');
    g.appendChild(pulse);

    const dot = ns('circle');
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
    dot.setAttribute('r', '4');
    dot.setAttribute('fill', color); dot.setAttribute('fill-opacity', '0.35');
    dot.setAttribute('stroke', color); dot.setAttribute('stroke-width', '1.5');
    g.appendChild(dot);

    const inner = ns('circle');
    inner.setAttribute('cx', cx); inner.setAttribute('cy', cy);
    inner.setAttribute('r', '2'); inner.setAttribute('fill', color);
    g.appendChild(inner);

    if (label) {
      const text = ns('text');
      text.setAttribute('x', cx + 10); text.setAttribute('y', cy + 4);
      text.setAttribute('fill', color); text.setAttribute('font-size', '8');
      text.setAttribute('font-family', 'Share Tech Mono, monospace');
      text.textContent = label;
      g.appendChild(text);
    }

    svg.appendChild(g);
  }

  function drawConnector(svg, x1, y1, x2, y2, color = 'rgba(255,170,0,0.45)') {
    const line = ns('line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', color); line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-dasharray', '4,3');
    svg.appendChild(line);
  }

  // Draw the clickable mini-map in game panel
  function drawGameMap(svgId) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    svg.innerHTML = '';
    drawGrid(svg);
    drawCountries(svg);
  }

  // Draw result map (larger, with guess + actual pins)
  function drawResultMap(svgId, opts = {}) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    svg.innerHTML = '';

    const BASE_W = 340, BASE_H = 220;
    svg.setAttribute('viewBox', `0 0 ${BASE_W} ${BASE_H}`);
    drawGrid(svg, 1, 1);
    drawCountries(svg, 1, 1);

    // Draw all player guesses
    if (opts.results && opts.actual) {
      const ax = lonToX(opts.actual.lon);
      const ay = latToY(opts.actual.lat);

      opts.results.forEach((r, i) => {
        if (!r.guess) return;
        const gx = lonToX(r.guess.lon);
        const gy = latToY(r.guess.lat);
        drawConnector(svg, gx, gy, ax, ay);
        const colors = ['#ffaa00', '#00aaff', '#ff44aa', '#aa00ff', '#00ffcc', '#ff8800', '#44ff00', '#ff0044'];
        drawPin(svg, gx, gy, colors[i % colors.length], r.playerName ? r.playerName.slice(0, 8) : null);
      });
      drawPin(svg, ax, ay, '#00ff41', 'ACTUAL');
    } else if (opts.guess && opts.actual) {
      // Single player
      const gx = lonToX(opts.guess.lon);
      const gy = latToY(opts.guess.lat);
      const ax = lonToX(opts.actual.lon);
      const ay = latToY(opts.actual.lat);
      drawConnector(svg, gx, gy, ax, ay);
      drawPin(svg, gx, gy, '#ffaa00', 'YOU');
      drawPin(svg, ax, ay, '#00ff41', 'ACTUAL');
    }
  }

  return { lonToX, latToY, xToLon, yToLat, haversineKm, calcPoints, clientToMap, drawGameMap, drawResultMap };
})();
