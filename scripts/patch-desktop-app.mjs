/**
 * notion-enhancer
 * (c) 2023 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

const replaceIfNotFound = ({ string, mode = "replace" }, search, replacement) =>
  string.includes(replacement)
    ? string
    : string.replace(
        search,
        typeof replacement === "string" && mode === "append"
          ? `$&${replacement}`
          : typeof replacement === "string" && mode === "prepend"
          ? `${replacement}$&`
          : replacement
      );

// require()-ing the notion-enhancer in worker scripts
// or in renderer scripts will throw errors => manually
// inject trigger into only the necessary scripts
// (avoid re-injection on re-enhancement)
const injectTriggerOnce = (scriptId, scriptContent) =>
  scriptContent +
  (!/require\(['|"]notion-enhancer['|"]\)/.test(scriptContent)
    ? `\n\nrequire("notion-enhancer")('${scriptId}',exports,(js)=>eval(js));`
    : "");

const mainScript = ".webpack/main/index",
  rendererScripts = [
    ".webpack/renderer/tab_browser_view/preload",
    ".webpack/renderer/draggable_tabs/preload",
    ".webpack/renderer/tabs/preload",
  ],
  patches = {
    // prettier-ignore
    [mainScript]: (scriptContent) => {
      scriptContent = injectTriggerOnce(mainScript, scriptContent);
      const replace = (...args) =>
          (scriptContent = replaceIfNotFound(
            { string: scriptContent, mode: "replace" },
            ...args
          )),
        prepend = (...args) =>
          (scriptContent = replaceIfNotFound(
            { string: scriptContent, mode: "prepend" },
            ...args
          ));

      // https://github.com/notion-enhancer/notion-enhancer/issues/160:
      // enable the notion:// protocol, windows-style tab layouts, and
      // quitting the app when the last window is closed on linux
      const isWindows =
          /(?:"win32"===process\.platform(?:(?=,isFullscreen)|(?=&&\w\.BrowserWindow)|(?=&&\(\w\.app\.requestSingleInstanceLock)))/g,
        isWindowsOrLinux = '["win32","linux"].includes(process.platform)';
      replace(isWindows, isWindowsOrLinux);

      // restore node integration in the renderer process
      // so the notion-enhancer can be require()-d into it
      replace(/sandbox:!0/g, `sandbox:!1,nodeIntegration:!0,session:require('electron').session.fromPartition("persist:notion")`);

      // bypass webRequest filter to load enhancer menu
      replace(/(\w)\.top!==\w\?(\w)\({cancel:!0}\)/, "$1.top!==$1?$2({})");

      // https://github.com/notion-enhancer/desktop/issues/291
      // bypass csp issues by intercepting the notion:// protocol
      const protocolHandler = /try{const \w=await \w\.assetCache\.handleRequest\(\w\);/,
        protocolInterceptor = `{const n="notion://www.notion.so/__notion-enhancer/";if(e.url.startsWith(n))return require("electron").net.fetch(\`file://\${require("path").join(__dirname,"..","..","node_modules","notion-enhancer",e.url.slice(n.length))}\`)}`;
      prepend(protocolHandler, protocolInterceptor);
      
      // expose the app config to the global namespace for manipulation
      // e.g. to enable development mode
      prepend(/\w\.exports=JSON\.parse\('{"env":"production"/, "globalThis.__notionConfig=");

      // expose the app store to the global namespace for reading
      // e.g. to check if keep in background is enabled
      prepend(/\w\.Store=\(0,\w\.configureStore\)/, "globalThis.__notionStore=");
      prepend(/\w\.updatePreferences=\w\.updatePreferences/, "globalThis.__updatePreferences=");

      // conditionally create frameless windows
      const titlebarStyle = `titleBarStyle:globalThis.__notionConfig?.titlebarStyle??"hiddenInset"`;
      replace(`titleBarStyle:"hiddenInset"`, titlebarStyle);

      return scriptContent;
    },
    ["*"]: (scriptId, scriptContent) => {
      if (!rendererScripts.includes(scriptId)) return scriptContent;
      return injectTriggerOnce(scriptId, scriptContent);
    },
  };

export default (scriptId, scriptContent) => {
  if (patches["*"]) scriptContent = patches["*"](scriptId, scriptContent);
  if (patches[scriptId]) scriptContent = patches[scriptId](scriptContent);
  return scriptContent;
};
