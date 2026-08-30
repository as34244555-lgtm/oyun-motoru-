function crc32(bytes) {
  let c = ~0;
  for (let i = 0; i < bytes.length; i += 1) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function u16(n) {
  return new Uint8Array([n & 255, (n >>> 8) & 255]);
}
function u32(n) {
  return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
}

function concat(parts) {
  const n = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function encode(str) {
  return new TextEncoder().encode(str);
}

export function makeZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = encode(file.name);
    const data = typeof file.data === "string" ? encode(file.data) : file.data;
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0),
      name, data,
    ]);
    locals.push(local);
    const central = concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0),
      u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]);
    centrals.push(central);
    offset += local.length;
  }
  const central = concat(centrals);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(offset), u16(0),
  ]);
  return new Blob([concat([...locals, central, end])], { type: "application/zip" });
}

function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function loadText(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} okunamadi`);
  return res.text();
}

const WEB_FILES = [
  "player.html",
  "index.html",
  "favicon.svg",
  "css/app.css",
  "js/api.js",
  "js/editor.js",
  "js/blocks.js",
  "js/viewport.js",
  "js/characters3d.js",
  "js/world3d.js",
  "js/library.js",
  "js/paint.js",
  "js/engine-js.js",
  "js/export.js",
  "js/examples.js",
  "js/sounds.js",
];

function androidManifest() {
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.INTERNET"/>
  <application android:label="BlokMotor Oyun" android:icon="@android:drawable/ic_menu_compass" android:usesCleartextTraffic="true">
    <activity android:name=".MainActivity" android:exported="true" android:configChanges="orientation|screenSize|keyboardHidden"
      android:theme="@android:style/Theme.DeviceDefault.NoActionBar.Fullscreen">
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>
    </activity>
  </application>
</manifest>
`;
}

function mainActivity() {
  return `package com.blokmotor.oyun;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
  @SuppressLint("SetJavaScriptEnabled")
  @Override protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WebView web = new WebView(this);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setAllowFileAccess(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    web.setWebViewClient(new WebViewClient());
    web.setWebChromeClient(new WebChromeClient());
    web.loadUrl("file:///android_asset/www/player.html");
    setContentView(web);
  }
}
`;
}

function gradleFiles() {
  return {
    "settings.gradle": "rootProject.name = 'BlokMotorOyun'\ninclude ':app'\n",
    "build.gradle": `buildscript {
  repositories { google(); mavenCentral() }
  dependencies { classpath 'com.android.tools.build:gradle:8.2.2' }
}
allprojects { repositories { google(); mavenCentral() } }
`,
    "gradle.properties": "org.gradle.jvmargs=-Xmx2g\nandroid.useAndroidX=true\n",
    "app/build.gradle": `plugins { id 'com.android.application' }
android {
  namespace 'com.blokmotor.oyun'
  compileSdk 34
  defaultConfig {
    applicationId 'com.blokmotor.oyun'
    minSdk 24
    targetSdk 34
    versionCode 1
    versionName '1.0'
  }
  buildTypes {
    release {
      minifyEnabled false
    }
  }
}
`,
    "app/src/main/AndroidManifest.xml": androidManifest(),
    "app/src/main/java/com/blokmotor/oyun/MainActivity.java": mainActivity(),
    "README-ANDROID.md": `# Android APK / AAB

1. Android Studio ile bu klasoru ac.
2. APK: Gradle > app > assembleRelease
   veya: \`./gradlew assembleRelease\`
3. AAB (Play Store): \`./gradlew bundleRelease\`

Ciktilar:
- app/build/outputs/apk/release/app-release-unsigned.apk
- app/build/outputs/bundle/release/app-release.aab

Imzalamak icin bir keystore olustur ve \`signingConfig\` ekle.
GitHub Actions bu projeyi debug APK olarak da derler.
`,
  };
}

export async function exportWebGame(project) {
  const player = await loadText("player.html");
  const filled = player.replace(
    '<script type="application/json" id="project-data"></script>',
    `<script type="application/json" id="project-data">${JSON.stringify(project)}</script>`
  );
  downloadBlob(new Blob([filled], { type: "text/html" }), "blokmotor-oyun.html");
}

export async function exportAndroidProject(project) {
  const files = [];
  const gradle = gradleFiles();
  for (const [name, data] of Object.entries(gradle)) {
    files.push({ name: `blokmotor-android/${name}`, data });
  }
  for (const path of WEB_FILES) {
    try {
      files.push({ name: `blokmotor-android/app/src/main/assets/www/${path}`, data: await loadText(path) });
    } catch (_) {
      /* optional */
    }
  }
  files.push({ name: "blokmotor-android/app/src/main/assets/www/project.json", data: JSON.stringify(project, null, 2) });
  const player = await loadText("player.html");
  const filled = player.replace(
    '<script type="application/json" id="project-data"></script>',
    `<script type="application/json" id="project-data">${JSON.stringify(project)}</script>`
  );
  files.push({ name: "blokmotor-android/app/src/main/assets/www/player.html", data: filled });
  downloadBlob(makeZip(files), "blokmotor-android.zip");
}

export function siteUrl() {
  return "https://cdn.jsdelivr.net/gh/as34244555-lgtm/oyun-motoru-@gh-pages/index.html";
}

export function pagesUrl() {
  return "https://as34244555-lgtm.github.io/oyun-motoru-/";
}
