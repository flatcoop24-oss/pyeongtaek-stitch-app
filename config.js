window.PYEONGTAEK_CHAEZIP_CONFIG = {
  googleSheetWebAppUrl: "https://script.google.com/macros/s/AKfycbyboLp8QHuByzJ5OkWHciFbdPNCMWBRaro2gtkMbJpBfcHLn5OXPsHoTVzpBZNqZMTV/exec",
  logoSrc: "assets/logo-chaezip-cutout-20260624.png"
};

(function () {
  function swapLogo() {
    var cfg = window.PYEONGTAEK_CHAEZIP_CONFIG || {};
    var src = cfg.logoSrc || "assets/logo-chaezip-cutout-20260624.png";
    document.querySelectorAll('img[src*="logo-chaezip"]').forEach(function (img) {
      img.setAttribute("src", src);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", swapLogo);
  } else {
    swapLogo();
  }
})();
