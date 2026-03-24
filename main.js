document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startBtn');
  const bitOutput = document.getElementById('bitOutput');
  const charOutput = document.getElementById('charOutput');
  const status = document.getElementById('status');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // フォントのロード待ち
  try {
    const font = new FontFace('MisakiGothic', "url('./misaki_gothic_2nd.ttf')");
    await font.load();
    document.fonts.add(font);
    startBtn.textContent = '全変換を開始';
    startBtn.disabled = false;
  } catch (err) {
    status.textContent = 'フォントが見つかりません。';
    return;
  }

  // JIS第一・第二水準の文字を生成する関数（簡易版）
  function getJISCharacters() {
    const chars = [];
    // 区点コード: 1区〜94区
    for (let q = 1; q <= 94; q++) {
      // 1-15区: 記号・英数・かな
      // 16-47区: 第一水準漢字
      // 48-84区: 第二水準漢字
      if (q >= 1 && q <= 84) {
        for (let p = 1; p <= 94; p++) {
          const char = jisToUnicode(q, p);
          if (char) chars.push(char);
        }
      }
    }
    return chars;
  }

  // 区点コードをUnicode文字に変換
  function jisToUnicode(q, p) {
    try {
      const buffer = new Uint8Array([q + 0xA0, p + 0xA0]);
      const decoder = new TextDecoder('euc-jp');
      const char = decoder.decode(buffer);
      // 変換失敗時や制御文字を除外
      if (char === '\uFFFD' || char.length === 0) return null;
      return char;
    } catch { return null; }
  }

  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    bitOutput.value = '';
    charOutput.value = '';
    
    const allChars = getJISCharacters();
    const total = allChars.length;
    
    let bitResult = '';
    let charResult = '';

    // Canvasの基本設定
    ctx.font = '8px "MisakiGothic"';
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // 処理を分割して実行（フリーズ防止）
    const batchSize = 100;
    for (let i = 0; i < total; i++) {
      const char = allChars[i];

      // Canvasをクリアして描画
      ctx.clearRect(0, 0, 8, 8);
      ctx.fillStyle = 'white'; // 背景
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = 'black'; // 文字
      ctx.fillText(char, 0, 0);

      // ピクセルデータ取得
      const imgData = ctx.getImageData(0, 0, 8, 8).data;
      let bits = '';
      for (let j = 0; j < imgData.length; j += 4) {
        const brightness = (imgData[j] + imgData[j+1] + imgData[j+2]) / 3;
        bits += (brightness < 128) ? '1' : '0';
      }

      bitResult += bits + '\n';
      charResult += char + '\n';

      // 一定数ごとに画面を更新
      if (i % batchSize === 0) {
        status.textContent = `変換中... ${i} / ${total}`;
        bitOutput.value = bitResult;
        charOutput.value = charResult;
        // スクロールを一番下に
        bitOutput.scrollTop = bitOutput.scrollHeight;
        charOutput.scrollTop = charOutput.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    bitOutput.value = bitResult;
    charOutput.value = charResult;
    status.textContent = `完了！ 合計 ${total} 文字`;
    startBtn.disabled = false;
  });
});
