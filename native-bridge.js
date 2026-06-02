(() => {
  const apiBase = "https://pyeongtaek-stitch-app.onrender.com";
  const nativeHosts = new Set(["pyeongtaek-native", "localhost"]);
  const isNativeShell = Boolean(window.Capacitor) || location.protocol === "capacitor:" || location.protocol === "ionic:" || nativeHosts.has(location.hostname);

  document.documentElement.classList.toggle("is-native-shell", isNativeShell);
  document.documentElement.classList.toggle("is-web-shell", !isNativeShell);

  if (isNativeShell) {
    const style = document.createElement("style");
    style.textContent = `
      .is-native-shell .install-panel { display: none !important; }
      .is-native-shell #navInstallButton { display: none !important; }
      .is-native-shell .bottom-nav { grid-template-columns: repeat(5, minmax(0, 1fr)); }
      .is-native-shell body { background-color: #120f1f; }
    `;
    document.head.append(style);
  }

  if (!isNativeShell) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const href = typeof input === "string" ? input : input.url;
    const url = new URL(href, location.href);

    if (url.pathname.startsWith("/api/")) {
      const target = `${apiBase}${url.pathname}${url.search}`;
      if (typeof input === "string") return originalFetch(target, init);
      return originalFetch(new Request(target, input), init);
    }

    return originalFetch(input, init);
  };
})();
