importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyApLErkBMaLTKLAVDeA_-aZYMnPilaDGU8",
  authDomain: "searchhub-mobile.firebaseapp.com",
  projectId: "searchhub-mobile",
  storageBucket: "searchhub-mobile.firebasestorage.app",
  messagingSenderId: "18757861506",
  appId: "1:18757861506:web:4826ba1337e48431f0f49b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // 🌟 重要:notificationペイロードだと、ブラウザの「自動表示」とonBackgroundMessage
  // が両方反応して2重に表示されることがある(Web Push特有の既知の癖)。
  // dataペイロードだけを使うことで、表示をこのコードだけに一本化する。
  const title = payload.data?.title || payload.notification?.title || "SearchHub";
  const body = payload.data?.body || payload.notification?.body || "";
  const link = payload.data?.link || payload.fcmOptions?.link || "/";

  // 🌟 同じ内容(タイトル+本文)には同じtagを付ける。ブラウザは同じtagの通知が
  // 来たら、新しく増やすのではなく既存のものを上書きしてくれるので、
  // 原因がどこにあっても、画面に2つ並んで表示されることは物理的に無くなる。
  const tag = `sh-notify-${title}-${body}`.substring(0, 100);

  self.registration.showNotification(title, {
    body,
    icon: "https://i.ibb.co/Tx2N76YL/icon.png",
    data: { url: link },
    tag,
    renotify: false
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
