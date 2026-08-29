# BlokMotor

C++ ile yazılmış, Unity / Godot benzeri sahne editörü olan ve oyunu **Scratch tarzı kod bloklarıyla** kurulan bir 3D oyun motoru.

Oyunu C++ ile yazmazsın. Motor C++ ile çalışır; sen nesneleri sahneye koyar, blokları birbirine takar, **Oynat** dersin.

## Neler var

- 3D sahne: küp, küre, piramit, zemin ve **gerçek 3D karakter modelleri** (insan, hayvan, robot, hayalet, balık…)
- 45+ karakter kütüphanesi; her karakter kutu/küre gruplarından oluşan 3D figür
- Kostüm / animasyon (3D poz) ve isteğe bağlı 2D boyama
- Kodun yerini tutan geniş blok seti: olay, hareket, görünüm, ses, kontrol, algı, **işlemler** (+ − × ÷), değişken/liste, kalem, 3D/kamera
- Oyunda **kamera açısı** (yaw / pitch / mesafe / FOV), hazır görünümler ve Q/E çevirme
- Karakter animasyonları (idle / yürüme / zıplama / el sallama) ve daha dolu 3D dekorlar
- **Web oyunu**, **APK / AAB** Android projesi ve GitHub Pages kalıcı site
- Yazılım rasterizer + Three.js görünüm
- Proje kaydet / yükle
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

1. Soldan bir nesne seç (örnek: **Kup**).
2. Alttaki paletten **Her kare** olayını ekle.
3. **döndür** veya **zıpla** gibi bloklara tıkla; seçili scriptin altına eklenir.
4. `eğer` bloğunda tuşu `Space` yap, içine `zıpla` koy.
5. **Oynat** — Space ile zıpla, ok tuşlarıyla örnek küreyi hareket ettir.
6. **Durdur** sahneyi başlangıca alır.

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

Kalıcı site (şimdi açık): https://cdn.jsdelivr.net/gh/as34244555-lgtm/oyun-motoru-@gh-pages/index.html

GitHub Pages: https://as34244555-lgtm.github.io/oyun-motoru-/ — repo Settings → Pages → Source: GitHub Actions veya `gh-pages` dalı.

**Web oyunu** tek HTML indirir. **APK / AAB** Android projesini zip’ler (`assembleRelease` → APK, `bundleRelease` → Play Store AAB). GitHub Actions da debug APK/AAB üretir.

## Sonraki adımlar

Bu bir çalışan çekirdek. Üzerine mesh yükleme, ses, daha zengin fizik, kaydet/yükle proje dosyası ve daha fazla blok eklenebilir.
