# BlokMotor

C++ ile yazılmış, Unity / Godot benzeri sahne editörü olan ve oyunu **Scratch tarzı kod bloklarıyla** kurulan bir 3D oyun motoru.

Oyunu C++ ile yazmazsın. Motor C++ ile çalışır; sen nesneleri sahneye koyar, blokları birbirine takar, **Oynat** dersin.

## Neler var

- 3D sahne: küp, küre, piramit, zemin
- Yazılım rasterizer (GPU gerekmez) + tarayıcıda Three.js görünüm
- Yerçekimi ve basit çarpışma
- Blok VM: her kare, tuş, dön, zıpla, konum, renk, eğer, tekrarla
- Web editör: hiyerarşi, denetçi, sahne, kod blokları
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

Desteklenen işlemler: `when_start`, `every_frame`, `when_key`, `set_position`, `change_position`, `rotate`, `set_velocity`, `jump`, `move_forward`, `set_color`, `set_scale`, `set_visible`, `if`, `repeat`, `wait`, `key_down`, `grounded`, `set_var`, `change_var`.

## Sonraki adımlar

Bu bir çalışan çekirdek. Üzerine mesh yükleme, ses, daha zengin fizik, kaydet/yükle proje dosyası ve daha fazla blok eklenebilir.
