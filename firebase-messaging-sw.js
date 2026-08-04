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
// 🌟【追加】ホーム画面アイコンの赤バッジ
//
//   通知が届いただけでは、アイコンの赤バッジは付きません。
//   受け取ったここで「バッジを付けろ」と命令する必要があります。
//   これが無かったため、アプリを一度開くまでバッジが出ませんでした。
//
//   数は「今スマホに残っている通知の件数」をそのまま使います。
//   自前で数を覚えておくやり方だと、通知を手で消したときにズレますが、
//   これなら毎回その場で数え直すのでズレません。
//
//   ※ ホーム画面に追加したアプリで、通知を許可している場合に働きます
//     (iOSは16.4以降)。対応していない端末では何も起きません。
// =========================================================
async function refreshAppBadge() {
  try {
    if (!self.navigator || !('setAppBadge' in self.navigator)) return;
    const list = await self.registration.getNotifications();
    // 🌟 数えるのは kind="system" の通知だけ。
    //   巡回で見つけた1件ずつの新着(kind="item")は数に入れない。
    //   1日に何十件も出るので、数えると赤バッジが常に3桁になって意味が無くなる。
    //   数えるのは「ウォッチャー巡回完了」「リサーチ完了」など、
    //   件数が少なくて見落とすと困るものだけ。
    const count = (list || []).filter((n) => (n.data && n.data.kind) === "system").length;
    if (count > 0) {
      await self.navigator.setAppBadge(count);
    } else {
      await self.navigator.clearAppBadge();
    }
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
    icon: "https://i.ibb.co/Tx2N76YL/icon.png",
    data: { url: link, kind },
    tag,
    renotify: false
  }).then(refreshAppBadge);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "https://searchhubpro.github.io/searchhubnext-mobile/";
  // 🌟 通知を1つ閉じたので、残りの件数でバッジを付け直す(0なら消える)
  event.waitUntil(refreshAppBadge().then(() => clients.openWindow(url)));
});

// 🌟 通知を(押さずに)スワイプで消したときも、残りの件数に合わせ直す
self.addEventListener('notificationclose', (event) => {
  event.waitUntil(refreshAppBadge());
});
