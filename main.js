document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startBtn');
  const bitOutput = document.getElementById('bitOutput');
  const charOutput = document.getElementById('charOutput');
  const status = document.getElementById('status');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // --- 1. フォント読み込み設定 ---
  status.textContent = 'フォントを読み込んでいます...';

  try {
    const fontName = 'MisakiGothic';
    const font = new FontFace(fontName, "url('./misaki_gothic_2nd.ttf')");
    const loadedFont = await font.load();
    document.fonts.add(loadedFont);
    await document.fonts.ready;
    
    ctx.font = '8px "MisakiGothic"';
    ctx.fillText(' ', 0, 0);

    status.textContent = '準備完了！';
    startBtn.textContent = '全変換（半角化＋矩形圧縮）を開始';
    startBtn.disabled = false;
  } catch (err) {
    console.error(err);
    status.textContent = 'エラー：フォントファイルが見つからないか、読み込めませんでした。';
    return;
  }

  // --- 2. JIS文字生成（全角→半角変換付き） ---
  function getJISCharacters() {
    const charsSet = new Set(); // 重複排除のためSetを使う
    const decoder = new TextDecoder('euc-jp');
    
    for (let q = 1; q <= 84; q++) {
      for (let p = 1; p <= 94; p++) {
        const buffer = new Uint8Array([q + 0xA0, p + 0xA0]);
        let char = decoder.decode(buffer);
        
        if (char !== '\uFFFD' && char.length > 0) {
          // normalize('NFKC') で全角英数字・記号を半角に変換
          // 例：「Ａ」→「A」、「１」→「1」、「！」→「!」
          char = char.normalize('NFKC');
          charsSet.add(char);
        }
      }
    }
    return Array.from(charsSet);
  }

  // --- 3. 矩形圧縮 (Greedy Mesh) ロジック ---
  function compressToRects(bitsArray) {
    let grid = [];
    for (let y = 0; y < 8; y++) {
      grid[y] = bitsArray.slice(y * 8, y * 8 + 8);
    }

    const processed = Array.from({ length: 8 }, () => Array(8).fill(false));
    let rectsResult = "";

    while (true) {
      let target = null;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          if (grid[y][x] === 1 && !processed[y][x]) {
            target = { x, y };
            break;
          }
        }
        if (target) break;
      }

      if (!target) break;

      let bestRect = { x: target.x, y: target.y, w: 1, h: 1, area: 1 };

      for (let sy = 0; sy <= target.y; sy++) {
        for (let sx = 0; sx <= target.x; sx++) {
          for (let ey = target.y; ey < 8; ey++) {
            for (let ex = target.x; ex < 8; ex++) {
              let isSolid = true;
              for (let y = sy; y <= ey; y++) {
                for (let x = sx; x <= ex; x++) {
                  if (grid[y][x] !== 1) {
                    isSolid = false;
                    break;
                  }
                }
                if (!isSolid) break;
              }

              if (isSolid) {
                const w = ex - sx + 1;
                const h = ey - sy + 1;
                if (w * h > bestRect.area) {
                  bestRect = { x: sx, y: sy, w, h, area: w * h };
                }
              }
            }
          }
        }
      }

      for (let y = bestRect.y; y < bestRect.y + bestRect.h; y++) {
        for (let x = bestRect.x; x < bestRect.x + bestRect.w; x++) {
          processed[y][x] = true;
        }
      }

      rectsResult += `${bestRect.x}${bestRect.y}${bestRect.w}${bestRect.h}`;
    }

    return rectsResult;
  }

  // --- 4. メイン実行処理 ---
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    bitOutput.value = '';
    charOutput.value = '';
    
    const allChars = getJISCharacters();
    const total = allChars.length;
    
    let bitBuffer = [];
    let charBuffer = [];

    ctx.font = '8px "MisakiGothic"';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    for (let i = 0; i < total; i++) {
      const char = allChars[i];

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = 'black';
      ctx.fillText(char, 0, 0);

      const imgData = ctx.getImageData(0, 0, 8, 8).data;
      const bitsArray = [];
      for (let j = 0; j < imgData.length; j += 4) {
        const brightness = (imgData[j] + imgData[j+1] + imgData[j+2]) / 3;
        bitsArray.push(brightness < 128 ? 1 : 0);
      }

      const compressedString = compressToRects(bitsArray);
      
      bitBuffer.push(compressedString);
      charBuffer.push(char);

      if (i % 100 === 0) {
        status.textContent = `処理中... ${i} / ${total}`;
        bitOutput.value = bitBuffer.join('\n') + '\n';
        charOutput.value = charBuffer.join('\n') + '\n';
        bitOutput.scrollTop = bitOutput.scrollHeight;
        charOutput.scrollTop = charOutput.scrollHeight;
        await new Promise(r => setTimeout(r, 0));
      }
    }

    bitOutput.value = bitBuffer.join('\n');
    charOutput.value = charBuffer.join('\n');
    status.textContent = `完了！ (${total}文字に最適化されました)`;
    startBtn.disabled = false;
  });
});
