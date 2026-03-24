document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startBtn');
  const bitOutput = document.getElementById('bitOutput');
  const charOutput = document.getElementById('charOutput');
  const status = document.getElementById('status');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  status.textContent = 'フォントを読み込んでいます...';

  try {
    const fontName = 'MisakiGothic';
    const font = new FontFace(fontName, "url('./misaki_gothic_2nd.ttf')");
    const loadedFont = await font.load();
    document.fonts.add(loadedFont);
    await document.fonts.ready;
    ctx.font = '8px "MisakiGothic"';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    status.textContent = '準備完了！';
    startBtn.disabled = false;
  } catch (err) {
    status.textContent = 'エラー：フォントが見つかりません。';
    return;
  }

  // --- 特定の全角記号・英数を半角に変換する関数 ---
  function getHalfCharTarget(fullChar) {
    const code = fullChar.charCodeAt(0);
    
    // 1. 全角英数記号 (！ ～ ｝) の範囲を半角に変換
    if (code >= 0xFF01 && code <= 0xFF5D) {
      return String.fromCharCode(code - 0xFEE0);
    }
    
    // 2. 個別対応が必要な記号 (JISにある全角記号を半角へ)
    const specialMap = {
      '　': ' ',  // 全角スペース
      '’': "'",
      '”': '"',
      '￥': '¥',
      '～': '~',
      'ー': '-',
      '‐': '-',
      '―': '-',
      '￠': '¢',
      '￡': '£',
      '￣': '~',
      '＿': '_',
      '〈': '<',
      '〉': '>',
      '／': '/',
      '＼': '\\'
    };
    
    return specialMap[fullChar] || null;
  }

  // --- データ文字列生成 (ヘッダ + 矩形) ---
  function createDataString(grid, hasPixel, minX, maxX, isHalfWidth) {
    let startX = 0, charW = 8;
    if (!isHalfWidth) {
      startX = 0; charW = 8;
    } else {
      startX = hasPixel ? minX : 0;
      charW = hasPixel ? (maxX - minX + 1) : 0;
    }
    const header = `${startX}${charW}`;

    const processed = Array.from({ length: 8 }, () => Array(8).fill(false));
    let rects = "";
    while (true) {
      let target = null;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          if (grid[y][x] === 1 && !processed[y][x]) { target = { x, y }; break; }
        }
        if (target) break;
      }
      if (!target) break;

      let bR = { x: target.x, y: target.y, w: 1, h: 1, area: 1 };
      for (let sy = 0; sy <= target.y; sy++) {
        for (let sx = 0; sx <= target.x; sx++) {
          for (let ey = target.y; ey < 8; ey++) {
            for (let ex = target.x; ex < 8; ex++) {
              let solid = true;
              for (let y = sy; y <= ey; y++) {
                for (let x = sx; x <= ex; x++) { if (grid[y][x] !== 1) { solid = false; break; } }
                if (!solid) break;
              }
              if (solid) {
                const w = ex - sx + 1, h = ey - sy + 1;
                if (w * h > bR.area) bR = { x: sx, y: sy, w, h, area: w * h };
              }
            }
          }
        }
      }
      for (let y = bR.y; y < bR.y + bR.h; y++) {
        for (let x = bR.x; x < bR.x + bR.w; x++) processed[y][x] = true;
      }
      rects += `${bR.x}${bR.y}${bR.w}${bR.h}`;
    }
    return header + rects;
  }

  // --- 実行処理 ---
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    const bitBuffer = [], charBuffer = [];
    const processedChars = new Set();
    const decoder = new TextDecoder('euc-jp');

    for (let q = 1; q <= 84; q++) {
      for (let p = 1; p <= 94; p++) {
        const buf = new Uint8Array([q + 0xA0, p + 0xA0]);
        const fullChar = decoder.decode(buf);
        if (fullChar === '\uFFFD' || fullChar.length === 0 || processedChars.has(fullChar)) continue;

        // 全角文字で描画・解析
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 8, 8);
        ctx.fillStyle = 'black'; ctx.fillText(fullChar, 0, 0);

        const imgData = ctx.getImageData(0, 0, 8, 8).data;
        let grid = [], minX = 8, maxX = -1, hasPixel = false;
        for (let y = 0; y < 8; y++) {
          grid[y] = [];
          for (let x = 0; x < 8; x++) {
            const idx = (y * 8 + x) * 4;
            const bit = (imgData[idx] + imgData[idx+1] + imgData[idx+2]) / 3 < 128 ? 1 : 0;
            grid[y][x] = bit;
            if (bit === 1) { hasPixel = true; if (x < minX) minX = x; if (x > maxX) maxX = x; }
          }
        }

        // 1. 全角データ追加
        bitBuffer.push(createDataString(grid, hasPixel, minX, maxX, false));
        charBuffer.push(fullChar);
        processedChars.add(fullChar);

        // 2. 指定された記号・英数なら、半角ペアも同じドットで追加
        const halfChar = getHalfCharTarget(fullChar);
        if (halfChar && !processedChars.has(halfChar)) {
          bitBuffer.push(createDataString(grid, hasPixel, minX, maxX, true));
          charBuffer.push(halfChar);
          processedChars.add(halfChar);
        }
      }
      if (q % 5 === 0) {
        status.textContent = `同期変換中... ${q}/84区`;
        bitOutput.value = bitBuffer.join('\n');
        charOutput.value = charBuffer.join('\n');
        await new Promise(r => setTimeout(r, 0));
      }
    }
    bitOutput.value = bitBuffer.join('\n');
    charOutput.value = charBuffer.join('\n');
    status.textContent = `完了！ ${charBuffer.length} 文字（ペア対応済）`;
    startBtn.disabled = false;
  });
});
