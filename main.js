document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startBtn');
  const bitOutput = document.getElementById('bitOutput');
  const charOutput = document.getElementById('charOutput');
  const status = document.getElementById('status');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // --- フォント読み込みセクション ---
  status.textContent = 'フォントを読み込んでいます...';

  try {
    // 1. FontFaceオブジェクトを作成
    const fontName = 'MisakiGothic';
    const font = new FontFace(fontName, "url('./misaki_gothic_2nd.ttf')");
    
    // 2. ドキュメントに追加
    const loadedFont = await font.load();
    document.fonts.add(loadedFont);
    
    // 3. ブラウザがそのフォントを使える状態になるまで待機
    await document.fonts.ready;
    
    // 念のため、1x1のテスト描画をしてフォントを「アクティブ」にする
    ctx.font = '8px "MisakiGothic"';
    ctx.fillText(' ', 0, 0);

    status.textContent = '準備完了！';
    startBtn.textContent = '全変換を開始';
    startBtn.disabled = false;
  } catch (err) {
    console.error(err);
    status.textContent = 'エラー：フォントファイルが見つからないか、読み込めませんでした。';
    return;
  }

  // --- JIS文字生成ロジック (変更なし) ---
  function getJISCharacters() {
    const chars = [];
    const decoder = new TextDecoder('euc-jp');
    for (let q = 1; q <= 84; q++) { // 第1・第2水準
      for (let p = 1; p <= 94; p++) {
        const buffer = new Uint8Array([q + 0xA0, p + 0xA0]);
        const char = decoder.decode(buffer);
        if (char !== '\uFFFD' && char.length > 0) {
          chars.push(char);
        }
      }
    }
    return chars;
  }

  // --- 変換実行セクション ---
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    bitOutput.value = '';
    charOutput.value = '';
    
    const allChars = getJISCharacters();
    const total = allChars.length;
    
    let bitBuffer = [];
    let charBuffer = [];

    // 描画設定を再確認
    ctx.font = '8px "MisakiGothic"';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    for (let i = 0; i < total; i++) {
      const char = allChars[i];

      // キャンバスをリセットして描画
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = 'black';
      ctx.fillText(char, 0, 0);

      // ピクセル抽出
      const imgData = ctx.getImageData(0, 0, 8, 8).data;
      let bits = '';
      for (let j = 0; j < imgData.length; j += 4) {
        const brightness = (imgData[j] + imgData[j+1] + imgData[j+2]) / 3;
        bits += (brightness < 128) ? '1' : '0';
      }

      bitBuffer.push(bits);
      charBuffer.push(char);

      // 50文字ごとに画面更新（負荷軽減）
      if (i % 50 === 0) {
        status.textContent = `変換中... ${i} / ${total}`;
        bitOutput.value = bitBuffer.join('\n') + '\n';
        charOutput.value = charBuffer.join('\n') + '\n';
        bitOutput.scrollTop = bitOutput.scrollHeight;
        charOutput.scrollTop = charOutput.scrollHeight;
        await new Promise(r => setTimeout(r, 0));
      }
    }

    bitOutput.value = bitBuffer.join('\n');
    charOutput.value = charBuffer.join('\n');
    status.textContent = `完了！ (${total}文字)`;
    startBtn.disabled = false;
  });
});
