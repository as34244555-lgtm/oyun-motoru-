const KEYS = ["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD", "KeyE", "KeyQ"];
const BACKS = ["cayir", "gece", "gunbatimi", "uzay", "deniz", "col", "kar", "sehir", "orman", "magara", "kale", "sahne", "sualti", "volkan", "bulutlar", "ay", "ciftlik", "stadyum", "sinif", "labirent", "neon", "sonbahar", "gol", "dag"];

export const DEFS = [
  { op: "when_start", kind: "hat", cat: "events", cls: "hat", title: "Oyun başlayınca" },
  { op: "every_frame", kind: "hat", cat: "events", cls: "hat", title: "Her kare" },
  { op: "when_key", kind: "hat", cat: "events", cls: "hat", title: "Tuşa basılınca", fields: [{ key: "key", type: "select", options: KEYS }] },
  { op: "when_broadcast", kind: "hat", cat: "events", cls: "hat", title: "Mesaj gelince", fields: [{ key: "name", type: "text", value: "merhaba" }] },
  { op: "when_backdrop", kind: "hat", cat: "events", cls: "hat", title: "Dekor olunca", fields: [{ key: "name", type: "select", options: BACKS }] },
  { op: "when_clone", kind: "hat", cat: "events", cls: "hat", title: "Kopya olunca" },
  { op: "broadcast", kind: "stack", cat: "events", cls: "hat", title: "mesaj yolla", fields: [{ key: "name", type: "text", value: "merhaba" }] },

  { op: "set_position", kind: "stack", cat: "motion", cls: "motion", title: "konumu ayarla", fields: [{ key: "x", type: "number", value: "0" }, { key: "y", type: "number", value: "1" }, { key: "z", type: "number", value: "0" }] },
  { op: "change_position", kind: "stack", cat: "motion", cls: "motion", title: "konumu değiştir", fields: [{ key: "x", type: "number", value: "0" }, { key: "y", type: "number", value: "0" }, { key: "z", type: "number", value: "0" }] },
  { op: "set_x", kind: "stack", cat: "motion", cls: "motion", title: "x =", fields: [{ key: "value", type: "number", value: "0" }] },
  { op: "set_y", kind: "stack", cat: "motion", cls: "motion", title: "y =", fields: [{ key: "value", type: "number", value: "1" }] },
  { op: "set_z", kind: "stack", cat: "motion", cls: "motion", title: "z =", fields: [{ key: "value", type: "number", value: "0" }] },
  { op: "change_x", kind: "stack", cat: "motion", cls: "motion", title: "x değiştir", fields: [{ key: "value", type: "number", value: "0.1" }] },
  { op: "change_y", kind: "stack", cat: "motion", cls: "motion", title: "y değiştir", fields: [{ key: "value", type: "number", value: "0.1" }] },
  { op: "change_z", kind: "stack", cat: "motion", cls: "motion", title: "z değiştir", fields: [{ key: "value", type: "number", value: "0.1" }] },
  { op: "glide", kind: "stack", cat: "motion", cls: "motion", title: "git", fields: [{ key: "x", type: "number", value: "0" }, { key: "y", type: "number", value: "1" }, { key: "z", type: "number", value: "0" }] },
  { op: "rotate", kind: "stack", cat: "motion", cls: "motion", title: "döndür", fields: [{ key: "axis", type: "select", options: ["x", "y", "z"], value: "y" }, { key: "degrees", type: "number", value: "90" }] },
  { op: "set_velocity", kind: "stack", cat: "motion", cls: "motion", title: "hızı ayarla", fields: [{ key: "x", type: "number", value: "0" }, { key: "y", type: "number", value: "0" }, { key: "z", type: "number", value: "0" }] },
  { op: "jump", kind: "stack", cat: "motion", cls: "motion", title: "zıpla güç", fields: [{ key: "force", type: "number", value: "8" }] },
  { op: "move_forward", kind: "stack", cat: "motion", cls: "motion", title: "ileri git", fields: [{ key: "amount", type: "number", value: "3" }] },
  { op: "point_towards", kind: "stack", cat: "motion", cls: "motion", title: "bak", fields: [{ key: "name", type: "text", value: "Kure" }] },
  { op: "go_to", kind: "stack", cat: "motion", cls: "motion", title: "yanına git", fields: [{ key: "name", type: "text", value: "Kure" }] },
  { op: "bounce_edge", kind: "stack", cat: "motion", cls: "motion", title: "kenardan sek" },
  { op: "apply_force", kind: "stack", cat: "motion", cls: "motion", title: "kuvvet uygula", fields: [{ key: "x", type: "number", value: "0" }, { key: "y", type: "number", value: "2" }, { key: "z", type: "number", value: "0" }] },

  { op: "set_color", kind: "stack", cat: "looks", cls: "looks", title: "renk", fields: [{ key: "color", type: "color", value: "#ff5533" }] },
  { op: "set_scale", kind: "stack", cat: "looks", cls: "looks", title: "ölçek", fields: [{ key: "value", type: "number", value: "1" }] },
  { op: "set_size", kind: "stack", cat: "looks", cls: "looks", title: "boyut %", fields: [{ key: "value", type: "number", value: "100" }] },
  { op: "change_size", kind: "stack", cat: "looks", cls: "looks", title: "boyutu değiştir", fields: [{ key: "value", type: "number", value: "10" }] },
  { op: "set_opacity", kind: "stack", cat: "looks", cls: "looks", title: "saydamlık %", fields: [{ key: "value", type: "number", value: "100" }] },
  { op: "show", kind: "stack", cat: "looks", cls: "looks", title: "göster" },
  { op: "hide", kind: "stack", cat: "looks", cls: "looks", title: "gizle" },
  { op: "say", kind: "stack", cat: "looks", cls: "looks", title: "söyle", fields: [{ key: "text", type: "text", value: "Merhaba!" }, { key: "seconds", type: "number", value: "2" }] },
  { op: "think", kind: "stack", cat: "looks", cls: "looks", title: "düşün", fields: [{ key: "text", type: "text", value: "Hmm..." }, { key: "seconds", type: "number", value: "2" }] },
  { op: "next_costume", kind: "stack", cat: "looks", cls: "looks", title: "sonraki kostüm" },
  { op: "set_costume", kind: "stack", cat: "looks", cls: "looks", title: "kostüm no", fields: [{ key: "index", type: "number", value: "1" }] },
  { op: "start_anim", kind: "stack", cat: "looks", cls: "looks", title: "animasyonu başlat", fields: [{ key: "fps", type: "number", value: "8" }] },
  { op: "stop_anim", kind: "stack", cat: "looks", cls: "looks", title: "animasyonu durdur" },
  { op: "play_anim", kind: "stack", cat: "looks", cls: "looks", title: "animasyon", fields: [{ key: "name", type: "select", options: ["idle", "walk", "jump", "wave"] }] },
  { op: "set_backdrop", kind: "stack", cat: "looks", cls: "looks", title: "dekor", fields: [{ key: "name", type: "select", options: BACKS }] },
  { op: "next_backdrop", kind: "stack", cat: "looks", cls: "looks", title: "sonraki dekor" },
  { op: "set_layer", kind: "stack", cat: "looks", cls: "looks", title: "katman", fields: [{ key: "value", type: "number", value: "0" }] },

  { op: "play_sound", kind: "stack", cat: "sound", cls: "sound", title: "ses çal", fields: [{ key: "name", type: "select", options: ["meow", "jump", "coin", "hit", "win", "boom"] }] },
  { op: "play_note", kind: "stack", cat: "sound", cls: "sound", title: "nota çal", fields: [{ key: "note", type: "select", options: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"] }] },
  { op: "set_volume", kind: "stack", cat: "sound", cls: "sound", title: "ses düzeyi", fields: [{ key: "value", type: "number", value: "80" }] },

  { op: "if", kind: "c", cat: "control", cls: "control", title: "eğer", fields: [{ key: "condOp", type: "select", options: ["key_down", "grounded", "touching", "visible", "var_gt", "timer_gt", "compare", "random_chance", "edge"] }, { key: "key", type: "select", options: KEYS }, { key: "name", type: "text", value: "skor" }, { key: "value", type: "number", value: "1" }, { key: "a", type: "number", value: "0" }, { key: "b", type: "number", value: "10" }, { key: "cmp", type: "select", options: [">", "<", "=", ">=", "<="] }] },
  { op: "if_else", kind: "c2", cat: "control", cls: "control", title: "eğer / değilse", fields: [{ key: "condOp", type: "select", options: ["key_down", "grounded", "touching", "var_gt", "timer_gt", "compare"] }, { key: "key", type: "select", options: KEYS }, { key: "name", type: "text", value: "skor" }, { key: "value", type: "number", value: "1" }, { key: "a", type: "number", value: "0" }, { key: "b", type: "number", value: "10" }, { key: "cmp", type: "select", options: [">", "<", "="] }] },
  { op: "repeat", kind: "c", cat: "control", cls: "control", title: "tekrarla", fields: [{ key: "times", type: "number", value: "4" }] },
  { op: "forever", kind: "c", cat: "control", cls: "control", title: "sürekli" },
  { op: "wait", kind: "stack", cat: "control", cls: "control", title: "bekle saniye", fields: [{ key: "seconds", type: "number", value: "1" }] },
  { op: "create_clone", kind: "stack", cat: "control", cls: "control", title: "kopya oluştur" },
  { op: "delete_clone", kind: "stack", cat: "control", cls: "control", title: "kopyayı sil" },

  { op: "reset_timer", kind: "stack", cat: "sensing", cls: "sensing", title: "zamanlayıcıyı sıfırla" },

  { op: "set_var", kind: "stack", cat: "vars", cls: "vars", title: "değişken yap", fields: [{ key: "name", type: "text", value: "skor" }, { key: "value", type: "number", value: "0" }] },
  { op: "change_var", kind: "stack", cat: "vars", cls: "vars", title: "değişkeni değiştir", fields: [{ key: "name", type: "text", value: "skor" }, { key: "value", type: "number", value: "1" }] },
  { op: "list_add", kind: "stack", cat: "vars", cls: "vars", title: "listeye ekle", fields: [{ key: "name", type: "text", value: "liste" }, { key: "value", type: "number", value: "1" }] },
  { op: "list_clear", kind: "stack", cat: "vars", cls: "vars", title: "listeyi temizle", fields: [{ key: "name", type: "text", value: "liste" }] },

  { op: "pen_down", kind: "stack", cat: "pen", cls: "pen", title: "kalemi bastır" },
  { op: "pen_up", kind: "stack", cat: "pen", cls: "pen", title: "kalemi kaldır" },
  { op: "set_pen", kind: "stack", cat: "pen", cls: "pen", title: "kalem", fields: [{ key: "color", type: "color", value: "#2244ee" }, { key: "size", type: "number", value: "3" }] },

  { op: "set_gravity", kind: "stack", cat: "world", cls: "world", title: "yerçekimi", fields: [{ key: "value", type: "number", value: "-20" }] },
  { op: "set_fov", kind: "stack", cat: "world", cls: "world", title: "kamera fov", fields: [{ key: "value", type: "number", value: "50" }] },
  { op: "camera_look", kind: "stack", cat: "world", cls: "world", title: "kamera bana baksın" },
  { op: "set_camera_orbit", kind: "stack", cat: "world", cls: "world", title: "kamera açı", fields: [{ key: "yaw", type: "number", value: "45" }, { key: "pitch", type: "number", value: "28" }, { key: "distance", type: "number", value: "9" }] },
  { op: "set_camera_yaw", kind: "stack", cat: "world", cls: "world", title: "kamera yaw", fields: [{ key: "value", type: "number", value: "45" }] },
  { op: "set_camera_pitch", kind: "stack", cat: "world", cls: "world", title: "kamera pitch", fields: [{ key: "value", type: "number", value: "28" }] },
  { op: "change_camera_yaw", kind: "stack", cat: "world", cls: "world", title: "kamerayı çevir", fields: [{ key: "value", type: "number", value: "40" }] },
  { op: "change_camera_pitch", kind: "stack", cat: "world", cls: "world", title: "kamerayı eğ", fields: [{ key: "value", type: "number", value: "20" }] },
  { op: "set_camera_distance", kind: "stack", cat: "world", cls: "world", title: "kamera mesafe", fields: [{ key: "value", type: "number", value: "9" }] },
  { op: "camera_follow", kind: "stack", cat: "world", cls: "world", title: "kamerayı takip ettir", fields: [{ key: "name", type: "text", value: "Kedi" }] },
  { op: "camera_unfollow", kind: "stack", cat: "world", cls: "world", title: "takibi bırak" },
  { op: "camera_preset", kind: "stack", cat: "world", cls: "world", title: "kamera görünümü", fields: [{ key: "name", type: "select", options: ["izometrik", "on", "yan", "ust", "fps"] }] },

  { op: "turn_left", kind: "stack", cat: "motion", cls: "motion", title: "sola dön", fields: [{ key: "degrees", type: "number", value: "15" }] },
  { op: "turn_right", kind: "stack", cat: "motion", cls: "motion", title: "sağa dön", fields: [{ key: "degrees", type: "number", value: "15" }] },
  { op: "set_heading", kind: "stack", cat: "motion", cls: "motion", title: "yön", fields: [{ key: "degrees", type: "number", value: "0" }] },
  { op: "change_heading", kind: "stack", cat: "motion", cls: "motion", title: "yön değiştir", fields: [{ key: "degrees", type: "number", value: "90" }] },
  { op: "move_steps", kind: "stack", cat: "motion", cls: "motion", title: "adım at", fields: [{ key: "steps", type: "number", value: "3" }] },

  { op: "stop_sounds", kind: "stack", cat: "sound", cls: "sound", title: "sesleri durdur" },
  { op: "change_volume", kind: "stack", cat: "sound", cls: "sound", title: "sesi değiştir", fields: [{ key: "value", type: "number", value: "-10" }] },

  { op: "wait_until_key", kind: "stack", cat: "control", cls: "control", title: "tuşa kadar bekle", fields: [{ key: "key", type: "select", options: KEYS }] },
  { op: "stop_this", kind: "stack", cat: "control", cls: "control", title: "bu scripti durdur" },

  { op: "touching_edge", kind: "stack", cat: "sensing", cls: "sensing", title: "kenara değince sek" },

  { op: "when_timer", kind: "hat", cat: "events", cls: "hat", title: "süre dolunca", fields: [{ key: "seconds", type: "number", value: "3" }] },
  { op: "when_var", kind: "hat", cat: "events", cls: "hat", title: "değişken büyükse", fields: [{ key: "name", type: "text", value: "skor" }, { key: "value", type: "number", value: "10" }] },
  { op: "when_touching", kind: "hat", cat: "events", cls: "hat", title: "değinece", fields: [{ key: "name", type: "text", value: "Kure" }] },

  { op: "set_rotation", kind: "stack", cat: "motion", cls: "motion", title: "döndürmeyi ayarla", fields: [{ key: "x", type: "number", value: "0" }, { key: "y", type: "number", value: "0" }, { key: "z", type: "number", value: "0" }] },
  { op: "set_rot_x", kind: "stack", cat: "motion", cls: "motion", title: "rx =", fields: [{ key: "value", type: "number", value: "0" }] },
  { op: "set_rot_y", kind: "stack", cat: "motion", cls: "motion", title: "ry =", fields: [{ key: "value", type: "number", value: "0" }] },
  { op: "set_rot_z", kind: "stack", cat: "motion", cls: "motion", title: "rz =", fields: [{ key: "value", type: "number", value: "0" }] },
  { op: "change_rot_x", kind: "stack", cat: "motion", cls: "motion", title: "rx değiştir", fields: [{ key: "value", type: "number", value: "10" }] },
  { op: "change_rot_y", kind: "stack", cat: "motion", cls: "motion", title: "ry değiştir", fields: [{ key: "value", type: "number", value: "10" }] },
  { op: "change_rot_z", kind: "stack", cat: "motion", cls: "motion", title: "rz değiştir", fields: [{ key: "value", type: "number", value: "10" }] },
  { op: "stop_moving", kind: "stack", cat: "motion", cls: "motion", title: "hareketi durdur" },
  { op: "set_dynamic", kind: "stack", cat: "motion", cls: "motion", title: "fizik", fields: [{ key: "value", type: "select", options: ["true", "false"] }] },

  { op: "clear_say", kind: "stack", cat: "looks", cls: "looks", title: "konuşmayı sil" },
  { op: "change_opacity", kind: "stack", cat: "looks", cls: "looks", title: "saydamlığı değiştir", fields: [{ key: "value", type: "number", value: "-10" }] },
  { op: "go_front", kind: "stack", cat: "looks", cls: "looks", title: "öne gel" },
  { op: "go_back", kind: "stack", cat: "looks", cls: "looks", title: "arkaya git" },
  { op: "change_layer", kind: "stack", cat: "looks", cls: "looks", title: "katman değiştir", fields: [{ key: "value", type: "number", value: "1" }] },
  { op: "set_sky", kind: "stack", cat: "looks", cls: "looks", title: "gökyüzü rengi", fields: [{ key: "color", type: "color", value: "#73b8f2" }] },

  { op: "play_drum", kind: "stack", cat: "sound", cls: "sound", title: "davul çal", fields: [{ key: "name", type: "select", options: ["kick", "snare", "hat"] }] },

  { op: "if_compare", kind: "c", cat: "control", cls: "control", title: "eğer sayı", fields: [{ key: "a", type: "number", value: "0" }, { key: "cmp", type: "select", options: [">", "<", "=", ">=", "<="] }, { key: "b", type: "number", value: "10" }] },
  { op: "if_var", kind: "c", cat: "control", cls: "control", title: "eğer değişken", fields: [{ key: "name", type: "text", value: "skor" }, { key: "cmp", type: "select", options: [">", "<", "="] }, { key: "value", type: "number", value: "10" }] },
  { op: "if_random", kind: "c", cat: "control", cls: "control", title: "eğer rastgele %", fields: [{ key: "value", type: "number", value: "50" }] },
  { op: "repeat_until_var", kind: "c", cat: "control", cls: "control", title: "değişkene kadar tekrarla", fields: [{ key: "name", type: "text", value: "skor" }, { key: "value", type: "number", value: "10" }] },
  { op: "wait_until_var", kind: "stack", cat: "control", cls: "control", title: "değişkene kadar bekle", fields: [{ key: "name", type: "text", value: "skor" }, { key: "value", type: "number", value: "1" }] },
  { op: "stop_all", kind: "stack", cat: "control", cls: "control", title: "her şeyi durdur" },

  { op: "store_sensor", kind: "stack", cat: "sensing", cls: "sensing", title: "algıyı değişkene yaz", fields: [{ key: "sensor", type: "select", options: ["x", "y", "z", "heading", "timer", "size", "costume", "random", "grounded", "key", "distance", "volume"] }, { key: "name", type: "text", value: "deger" }, { key: "key", type: "select", options: KEYS }, { key: "a", type: "number", value: "1" }, { key: "b", type: "number", value: "10" }, { key: "target", type: "text", value: "Kure" }] },
  { op: "store_x", kind: "stack", cat: "sensing", cls: "sensing", title: "x'i yaz", fields: [{ key: "name", type: "text", value: "x" }] },
  { op: "store_y", kind: "stack", cat: "sensing", cls: "sensing", title: "y'yi yaz", fields: [{ key: "name", type: "text", value: "y" }] },
  { op: "store_z", kind: "stack", cat: "sensing", cls: "sensing", title: "z'yi yaz", fields: [{ key: "name", type: "text", value: "z" }] },
  { op: "store_timer", kind: "stack", cat: "sensing", cls: "sensing", title: "süreyi yaz", fields: [{ key: "name", type: "text", value: "sure" }] },
  { op: "store_distance", kind: "stack", cat: "sensing", cls: "sensing", title: "mesafeyi yaz", fields: [{ key: "name", type: "text", value: "mesafe" }, { key: "target", type: "text", value: "Kure" }] },
  { op: "store_random", kind: "stack", cat: "sensing", cls: "sensing", title: "rastgele yaz", fields: [{ key: "name", type: "text", value: "r" }, { key: "a", type: "number", value: "1" }, { key: "b", type: "number", value: "10" }] },

  { op: "calc", kind: "stack", cat: "ops", cls: "ops", title: "hesapla", fields: [{ key: "name", type: "text", value: "skor" }, { key: "a", type: "number", value: "0" }, { key: "fn", type: "select", options: ["+", "-", "*", "/", "mod", "min", "max"] }, { key: "b", type: "number", value: "1" }] },
  { op: "unary_set", kind: "stack", cat: "ops", cls: "ops", title: "tekli işlem", fields: [{ key: "name", type: "text", value: "skor" }, { key: "fn", type: "select", options: ["abs", "sqrt", "round", "floor", "sin", "cos"] }, { key: "a", type: "number", value: "4" }] },
  { op: "pick_random", kind: "stack", cat: "ops", cls: "ops", title: "rastgele seç", fields: [{ key: "name", type: "text", value: "r" }, { key: "a", type: "number", value: "1" }, { key: "b", type: "number", value: "10" }] },
  { op: "compare_set", kind: "stack", cat: "ops", cls: "ops", title: "karşılaştır yaz", fields: [{ key: "name", type: "text", value: "ok" }, { key: "a", type: "number", value: "1" }, { key: "cmp", type: "select", options: [">", "<", "="] }, { key: "b", type: "number", value: "0" }] },
  { op: "copy_var", kind: "stack", cat: "ops", cls: "ops", title: "değişken kopyala", fields: [{ key: "from", type: "text", value: "skor" }, { key: "name", type: "text", value: "eski" }] },

  { op: "list_delete", kind: "stack", cat: "vars", cls: "vars", title: "listeden sil", fields: [{ key: "name", type: "text", value: "liste" }, { key: "index", type: "number", value: "1" }] },
  { op: "list_replace", kind: "stack", cat: "vars", cls: "vars", title: "listeyi değiştir", fields: [{ key: "name", type: "text", value: "liste" }, { key: "index", type: "number", value: "1" }, { key: "value", type: "number", value: "0" }] },
  { op: "list_len_store", kind: "stack", cat: "vars", cls: "vars", title: "liste uzunluğunu yaz", fields: [{ key: "name", type: "text", value: "liste" }, { key: "into", type: "text", value: "n" }] },
  { op: "show_var", kind: "stack", cat: "vars", cls: "vars", title: "değişkeni söyle", fields: [{ key: "name", type: "text", value: "skor" }] },

  { op: "change_pen_size", kind: "stack", cat: "pen", cls: "pen", title: "kalem kalınlığı", fields: [{ key: "value", type: "number", value: "1" }] },
  { op: "set_pen_color", kind: "stack", cat: "pen", cls: "pen", title: "kalem rengi", fields: [{ key: "color", type: "color", value: "#22aa66" }] },
  { op: "stamp", kind: "stack", cat: "pen", cls: "pen", title: "damga (kopya)" },

  { op: "change_camera_distance", kind: "stack", cat: "world", cls: "world", title: "kamerayı yaklaştır", fields: [{ key: "value", type: "number", value: "-1" }] },
  { op: "set_camera_target", kind: "stack", cat: "world", cls: "world", title: "kamera hedefi", fields: [{ key: "x", type: "number", value: "0" }, { key: "y", type: "number", value: "0.5" }, { key: "z", type: "number", value: "0" }] },
  { op: "camera_look_name", kind: "stack", cat: "world", cls: "world", title: "kamera şuna baksın", fields: [{ key: "name", type: "text", value: "Kedi" }] },
  { op: "camera_shake", kind: "stack", cat: "world", cls: "world", title: "kamera sars", fields: [{ key: "value", type: "number", value: "8" }] },
  { op: "spawn", kind: "stack", cat: "world", cls: "world", title: "nesne oluştur", fields: [{ key: "mesh", type: "select", options: ["cube", "sphere", "pyramid"] }, { key: "x", type: "number", value: "0" }, { key: "y", type: "number", value: "1" }, { key: "z", type: "number", value: "0" }] },
  { op: "delete_this", kind: "stack", cat: "world", cls: "world", title: "beni sil" },
];

const CATS = [
  { id: "events", label: "Olaylar" },
  { id: "motion", label: "Hareket" },
  { id: "looks", label: "Görünüm" },
  { id: "sound", label: "Ses" },
  { id: "control", label: "Kontrol" },
  { id: "sensing", label: "Algı" },
  { id: "ops", label: "İşlemler" },
  { id: "vars", label: "Değişken" },
  { id: "pen", label: "Kalem" },
  { id: "world", label: "Dünya / 3D" },
];

function defOf(op) {
  return DEFS.find((d) => d.op === op) || { op, kind: "stack", cls: "motion", title: op, fields: [] };
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function defaultBlock(op) {
  const def = defOf(op);
  const args = {};
  for (const field of def.fields || []) args[field.key] = field.value ?? field.options?.[0] ?? "";
  const block = { op, args };
  if (def.op === "if" || def.op === "if_else") {
    block.cond = { op: args.condOp || "key_down", args: { key: args.key || "Space", name: args.name || "", value: args.value || "1", a: args.a || "0", b: args.b || "10", cmp: args.cmp || ">" } };
    block.then = [];
    if (def.op === "if_else") block.else = [];
  }
  if (def.op === "if_compare" || def.op === "if_var" || def.op === "if_random" || def.op === "repeat_until_var") {
    block.then = [];
    block.stack = [];
  }
  if (def.op === "repeat" || def.op === "forever") block.stack = [];
  return block;
}

function fieldControl(block, field, onChange) {
  const wrap = document.createElement("span");
  const value = block.args?.[field.key] ?? field.value ?? "";
  let el;
  if (field.type === "select") {
    el = document.createElement("select");
    for (const option of field.options) {
      const o = document.createElement("option");
      o.value = option;
      o.textContent = option;
      if (option === value) o.selected = true;
      el.appendChild(o);
    }
  } else {
    el = document.createElement("input");
    el.type = field.type === "color" ? "color" : field.type === "number" ? "number" : "text";
    el.value = value;
    if (field.type === "number") el.step = "0.1";
    if (field.type === "text") el.style.maxWidth = "90px";
  }
  el.addEventListener("pointerdown", (e) => e.stopPropagation());
  el.addEventListener("change", () => {
    block.args = block.args || {};
    block.args[field.key] = el.value;
    if (block.op === "if" || block.op === "if_else") {
      block.cond = { op: block.args.condOp || "key_down", args: { key: block.args.key || "Space", name: block.args.name || "" } };
    }
    onChange();
  });
  wrap.appendChild(el);
  return wrap;
}

function mouth(block, listKey, onChange) {
  const el = document.createElement("div");
  el.className = "mouth";
  const inner = (block[listKey] ||= []);
  if (!inner.length) {
    const hint = document.createElement("div");
    hint.className = "drop-hint";
    hint.textContent = listKey === "else" ? "değilse" : "blok bırak";
    el.appendChild(hint);
  }
  inner.forEach((child, index) => {
    el.appendChild(renderBlock(child, onChange, () => {
      inner.splice(index, 1);
      onChange();
    }));
  });
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const op = e.dataTransfer.getData("text/blok-op");
    if (!op || defOf(op).kind === "hat") return;
    inner.push(defaultBlock(op));
    onChange();
  });
  return el;
}

function renderBlock(block, onChange, onRemove) {
  const def = defOf(block.op);
  const el = document.createElement("div");
  el.className = `block ${def.cls}`;
  const line = document.createElement("div");
  line.className = "line";
  const title = document.createElement("span");
  title.textContent = def.title;
  line.appendChild(title);
  for (const field of def.fields || []) line.appendChild(fieldControl(block, field, onChange));
  const del = document.createElement("button");
  del.type = "button";
  del.textContent = "×";
  del.style.marginLeft = "auto";
  del.style.background = "transparent";
  del.style.border = "0";
  del.style.color = "inherit";
  del.addEventListener("click", (e) => {
    e.stopPropagation();
    onRemove();
  });
  line.appendChild(del);
  el.appendChild(line);
  if (def.kind === "c" || def.op === "if") el.appendChild(mouth(block, def.op === "repeat" || def.op === "forever" ? "stack" : "then", onChange));
  if (def.kind === "c2" || def.op === "if_else") {
    el.appendChild(mouth(block, "then", onChange));
    el.appendChild(mouth(block, "else", onChange));
  }
  return el;
}

export function createBlockEditor({ paletteEl, scriptsEl, onChange }) {
  let scripts = [];
  let target = "";
  let query = "";

  function emit() {
    onChange?.({ scripts: clone(scripts) });
  }

  function visibleScripts() {
    return scripts.filter((s) => !target || s.target === target);
  }

  function addBlock(op) {
    const def = defOf(op);
    if (def.kind === "hat") {
      scripts.push({ target, hat: { op, args: defaultBlock(op).args || {} }, stack: [] });
      emit();
      render();
      return;
    }
    const mine = visibleScripts();
    if (!mine.length) {
      scripts.push({ target, hat: { op: "every_frame", args: {} }, stack: [defaultBlock(op)] });
    } else {
      mine[mine.length - 1].stack = mine[mine.length - 1].stack || [];
      mine[mine.length - 1].stack.push(defaultBlock(op));
    }
    emit();
    render();
  }

  function renderPalette() {
    paletteEl.innerHTML = "";
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "blok ara...";
    search.value = query;
    search.addEventListener("input", () => {
      query = search.value.toLowerCase();
      renderPalette();
    });
    paletteEl.appendChild(search);
    const count = document.createElement("div");
    count.className = "cat";
    count.textContent = `${DEFS.length} blok`;
    paletteEl.appendChild(count);
    for (const cat of CATS) {
      const items = DEFS.filter((d) => d.cat === cat.id && d.title.toLowerCase().includes(query));
      if (!items.length) continue;
      const h = document.createElement("div");
      h.className = "cat";
      h.textContent = cat.label;
      paletteEl.appendChild(h);
      for (const def of items) {
        const item = document.createElement("div");
        item.className = `palette-item ${def.cls}`;
        item.textContent = def.title;
        item.draggable = true;
        item.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/blok-op", def.op));
        item.addEventListener("click", () => addBlock(def.op));
        paletteEl.appendChild(item);
      }
    }
  }

  function render() {
    scriptsEl.innerHTML = "";
    const mine = visibleScripts();
    if (!mine.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Soldan bir olay bloğu ekle, sonra hareket / kostüm / ses bloklarını tıkla.";
      scriptsEl.appendChild(empty);
      return;
    }
    mine.forEach((script) => {
      const card = document.createElement("div");
      card.className = "script-card";
      const hat = { op: typeof script.hat === "string" ? script.hat : script.hat.op, args: script.hat.args || script.hatArgs || {} };
      script.hat = hat;
      card.appendChild(renderBlock(hat, emit, () => {
        scripts = scripts.filter((s) => s !== script);
        emit();
        render();
      }));
      (script.stack || []).forEach((block, index) => {
        card.appendChild(renderBlock(block, () => {
          emit();
          render();
        }, () => {
          script.stack.splice(index, 1);
          emit();
          render();
        }));
      });
      card.addEventListener("dragover", (e) => e.preventDefault());
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        const op = e.dataTransfer.getData("text/blok-op");
        if (!op || defOf(op).kind === "hat") return;
        script.stack = script.stack || [];
        script.stack.push(defaultBlock(op));
        emit();
        render();
      });
      const tools = document.createElement("div");
      tools.className = "script-tools";
      const rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "Scripti sil";
      rm.addEventListener("click", () => {
        scripts = scripts.filter((s) => s !== script);
        emit();
        render();
      });
      tools.appendChild(rm);
      card.appendChild(tools);
      scriptsEl.appendChild(card);
    });
  }

  scriptsEl.addEventListener("dragover", (e) => e.preventDefault());
  scriptsEl.addEventListener("drop", (e) => {
    const op = e.dataTransfer.getData("text/blok-op");
    if (op) addBlock(op);
  });

  renderPalette();

  return {
    load(data) {
      scripts = clone(data?.scripts || []);
      for (const script of scripts) {
        if (typeof script.hat === "string") script.hat = { op: script.hat, args: script.hatArgs || {} };
      }
      render();
    },
    serialize() {
      return { scripts: clone(scripts) };
    },
    setTarget(id) {
      target = id;
      render();
    },
    render,
  };
}
