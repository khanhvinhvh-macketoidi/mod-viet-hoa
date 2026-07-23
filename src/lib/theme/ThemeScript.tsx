const themeBootstrapScript = `
(function () {
  try {
    var key = "mod-thu-vien-theme";
    var allowed = ["azure", "abyss", "moonlight"];
    var stored = window.localStorage.getItem(key);
    var theme = allowed.indexOf(stored) !== -1 ? stored : "azure";

    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = "dark";
  } catch (error) {
    document.documentElement.setAttribute("data-theme", "azure");
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

export default function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
      suppressHydrationWarning
    />
  );
}
