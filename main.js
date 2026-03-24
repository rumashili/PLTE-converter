document.addEventListener('DOMContentLoaded', async () => {
  const charInput = document.getElementById('charInput');
  const convertBtn = document.getElementById('convertBtn');
  const hiddenCanvas = document.getElementById('hiddenCanvas');
  const previewCanvas = document.getElementById('preview');
  const output = document.getElementById('output');

  // getContextの設定。getImageDataを多用するので willReadFrequently を true にしておく
  const ctx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
  const previewCtx = previewCanvas.getContext('2d');

  // フォントのロードを待ってからボタンを有効化する
  try {
    const font = new FontFace('MisakiGothic', 'url(./misaki_gothic_2nd.ttf)');
    await font.load();
    document.fonts.add(font);
    convertBtn.textContent = '配列に変換';
    convertBtn.disabled = false;
  } catch (err) {
    alert('フォントの読み込みに失敗しちゃった。misaki_gothic_2nd.ttfが同じ階層にあるか確認してみてね！');
    console.error(err);
    return;
  }

  convertBtn.addEventListener('click', () => {
    const char = charInput.value;
    if (!char) return;

    // キャンバスを白で塗りつぶす（背景）
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 8, 8);

    // フォントの描画設定
    // 美咲フォントは8px指定でジャストサイズになる
    ctx.font = '8px "MisakiGothic"';
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // (0, 0)の位置に文字を描画
    // ※ブラウザのレンダリングエンジンによっては1pxほど上下にズレる場合があるので、
    // もしドットが切れる場合は fillText(char, 0, 1) のように微調整してみてね
    ctx.fillText(char, 0, 0);

    // プレビュー用のキャンバスにもコピーして表示
    previewCtx.drawImage(hiddenCanvas, 0, 0);

    // 8x8のピクセルデータを取得
    const imageData = ctx.getImageData(0, 0, 8, 8);
    const data = imageData.data;
    const binaryArray = [];

    // data配列は [R, G, B, A, R, G, B, A...] と1ピクセルにつき4要素入っている
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // RGBの平均値で明るさを出す (0が黒、255が白)
      const brightness = (r + g + b) / 3;
      
      // アンチエイリアス対策としてしきい値（今回は128）で判定
      if (brightness < 128) {
        binaryArray.push(1); // 黒っぽいのでドットあり
      } else {
        binaryArray.push(0); // 白っぽいのでドットなし
      }
    }

    // 結果を出力（カンマ区切りの文字列にして配列っぽく見せる）
    output.value = `[${binaryArray.join(', ')}]`;
  });
});
