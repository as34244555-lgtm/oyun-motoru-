# BlokMotor

C++ ile yazılmış, **Scratch ile aynı düzenli** editörü olan ve oyunu kod bloklarıyla kurulan bir 3D oyun motoru.

Oyunu C++ ile yazmazsın. Motor C++ ile çalışır; sen nesneleri sahneye koyar, blokları birbirine takar, **Oynat** dersin.

## Neler var

- 3D sahne: küp, küre, piramit, zemin ve **gerçek 3D karakter modelleri** (insan, hayvan, robot, hayalet, balık…)
- 45 karakter kütüphanesi; her karakter kutu/küre gruplarından oluşan 3D figür
- Kostüm / animasyon (3D poz) ve isteğe bağlı 2D boyama
- Kodun yerini tutan geniş blok seti: olay, hareket, görünüm, ses, kontrol, algı, **işlemler** (+ − × ÷), değişken/liste, kalem, 3D/kamera
- Oyunda **kamera açısı** (yaw / pitch / mesafe / FOV), hazır görünümler ve Q/E çevirme
- Karakter animasyonları (idle / yürüme / zıplama / el sallama) ve daha dolu 3D dekorlar
- **Web oyunu**, **APK / AAB** Android projesi ve GitHub Pages kalıcı site
- Yazılım rasterizer + Three.js görünüm
- Proje kaydet / yükle, **geri al / yinele**, ilk oyun rehberi
- **Bloklarım**, C şeklinde eğer/sürekli, sürükleyerek sıra değiştirme, beklemenin kaldığı yerden devam etmesi
- Ses yükleme (.mp3 / .wav), hitbox, platform ve tetik bölge
- Üç hazır örnek: Kedi zıplar, Top yuvarlanır, Kamera takip
- Tek binary: `blokmotor` hem motor hem editör sunucusu

## Derleme

```bash
cmake -S . -B build -DCMAKE_CXX_COMPILER=g++
cmake --build build -j
./build/blokmotor_tests
./build/blokmotor --port 8080
```

Tarayıcıda [http://127.0.0.1:8080](http://127.0.0.1:8080)

Başsız kare (CI / test):

```bash
./build/blokmotor --headless --frames 12 --out /tmp/blokmotor.bmp
```

## Editörde oyun yazmak

1. Açılıştaki **İlk oyun rehberi** veya **Dosya → Örnek: Kedi zıplar**.
2. **Kütüphane** veya kukla **+** ile bir karakter ekle.
3. Kuklayı seç, soldan **Olaylar** → **Oyun başlayınca** veya **Her kare**.
4. **Hareket**ten **zıpla** veya **konumu değiştir**; `eğer` içine bırak.
5. Yeşil bayrak ile dene. `Ctrl+Z` geri alır.

Açılışta sahne ve kod alanı boştur; kukla ve blokları sen eklersin. **Düzen** menüsünden platform, tetik bölge ve hitbox açılır.

Bloklar C++ sanal makinesinde çalışır. Sağ alttaki küçük görüntü motorun kendi yazılım renderer çıktısıdır.

## Mimari

```
web/          editör (HTML/JS)
src/          C++ motor
  json.cpp      küçük JSON
  scene.cpp     nesneler, kamera
  physics.cpp   yerçekimi, AABB
  renderer.cpp  yazılım 3D
  vm.cpp        kod blokları
  engine.cpp    oynat / durdur
  server.cpp    HTTP API
  main.cpp      oyun döngüsü
```

API özeti: `/api/state`, `/api/objects`, `/api/scripts`, `/api/play`, `/api/stop`, `/api/input`, `/api/frame.bmp`.

## Blok JSON

```json
{
  "scripts": [
    {
      "target": "cube",
      "hat": "every_frame",
      "stack": [
        { "op": "rotate", "args": { "axis": "y", "degrees": "90" } },
        {
          "op": "if",
          "cond": { "op": "key_down", "args": { "key": "Space" } },
          "then": [{ "op": "jump", "args": { "force": "8" } }]
        }
      ]
    }
  ]
}
```

Blok paletinde 120’den fazla işlem var. Karakter eklemek için **Kütüphane**; sahnenin sağ üstündeki **Oyun kamerası** kaydırıcılarıyla bakış açısını hem düzenlemede hem oyunda değiştir.

Kalıcı site: https://cdn.jsdelivr.net/gh/as34244555-lgtm/oyun-motoru-@gh-pages/index.html

`github.io` linki ancak repo sahibi Settings → Pages → Source: **gh-pages** / root yaptığında açılır. Actions token’ı Pages’ı kendisi açamıyor.

**Web oyunu** tek HTML indirir. **APK / AAB** Android projesini zip’ler (`assembleRelease` → APK, `bundleRelease` → Play Store AAB). GitHub Actions da debug APK/AAB üretir.

## Sonraki adımlar

GLTF mesh içe aktarma ve GitHub Pages’ı repo sahibinin Settings → Pages → **gh-pages / root** ile açması. Debug APK GitHub Actions `android-apk-aab` artifact’ından iner.
