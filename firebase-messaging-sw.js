importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');
// 🌟 Service Workerの更新が、スマホ側ですぐに反映されない(古いバージョンが
// 残り続ける)ことがあるため、新しいバージョンが来たら即座に切り替えるようにする
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
firebase.initializeApp({
  apiKey: "AIzaSyApLErkBMaLTKLAVDeA_-aZYMnPilaDGU8",
  authDomain: "searchhub-mobile.firebaseapp.com",
  projectId: "searchhub-mobile",
  storageBucket: "searchhub-mobile.firebasestorage.app",
  messagingSenderId: "18757861506",
  appId: "1:18757861506:web:4826ba1337e48431f0f49b"
});
const messaging = firebase.messaging();

// =========================================================
// 🌟 ホーム画面アイコンの赤い数字＝スナイパーの未読(対象外を除く)の件数
//
//   アプリを開いている時は、アプリが一覧から数えて付け、その数をここと共有する
//   (キャッシュ置き場 'sh-badge' の '/sh-badge-count')。
//   アプリを閉じている間は、スナイパーの通知(kind="item")が1件来るたびに1足す。
//   「巡回完了」などのまとめの通知(kind="system")は数えない。
//   既読はアプリの中で付けるので、通知を押したり消したりしても数は変えない
//   (次にアプリを開いた時に、一覧から数え直した正しい数に直る)。
//
//   ※ ホーム画面に追加したアプリで、通知を許可している場合に働きます
//     (iOSは16.4以降)。対応していない端末では何も起きません。
// =========================================================
async function addSniperBadge() {
  try {
    if (!self.navigator || !('setAppBadge' in self.navigator)) return;
    const c = await caches.open('sh-badge');
    const res = await c.match('/sh-badge-count');
    const now = res ? (parseInt(await res.text(), 10) || 0) : 0;
    const next = now + 1;
    await c.put('/sh-badge-count', new Response(String(next)));
    await self.navigator.setAppBadge(next);
  } catch (e) { /* 対応していない端末では黙って何もしない */ }
}

messaging.onBackgroundMessage((payload) => {
  // 🌟 重要:notificationペイロードだと、ブラウザの「自動表示」とonBackgroundMessage
  // が両方反応して2重に表示されることがある(Web Push特有の既知の癖)。
  // dataペイロードだけを使うことで、表示をこのコードだけに一本化する。
  const title = payload.data?.title || payload.notification?.title || "SearchHub";
  const body = payload.data?.body || payload.notification?.body || "";
  const link = payload.data?.link || payload.fcmOptions?.link || "https://searchhubpro.github.io/searchhubnext-mobile/";
  // 🌟 バッジで数えるかどうかの目印。サーバーから送られてくる。
  //   付いていない古い通知は "item" 扱い(＝数えない)にする。
  const kind = payload.data?.kind || "item";
  // 🌟 同じ内容(タイトル+本文)には同じtagを付ける。ブラウザは同じtagの通知が
  // 来たら、新しく増やすのではなく既存のものを上書きしてくれるので、
  // 原因がどこにあっても、画面に2つ並んで表示されることは物理的に無くなる。
  const tag = `sh-notify-${title}-${body}`.substring(0, 100);
  return self.registration.showNotification(title, {
    body,
    icon: "https://searchhubpro.github.io/searchhubnext-mobile/images/icon-192.png",
    data: { url: link, kind },
    tag,
    renotify: false
  }).then(() => (kind === "item" ? addSniperBadge() : null));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "https://searchhubpro.github.io/searchhubnext-mobile/";
  event.waitUntil(clients.openWindow(url));
});

