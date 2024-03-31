const { contextBridge, ipcRenderer } = require('electron');

ipcRenderer.on("spooder-clone-start", () => {
    console.log("CLONE START");
    window.dispatchEvent(new Event("spooder-clone-start"));
})

ipcRenderer.on("spooder-install-start", () => {
    console.log("INSTALL START");
    window.dispatchEvent(new Event("spooder-install-start"));
})

ipcRenderer.on("spooder-install-finish", () => {
    console.log("INSTALL FINISH");
    window.dispatchEvent(new Event("spooder-install-finish"));
})

ipcRenderer.on("spooder-run-start", () => {
    console.log("RUN START");
    window.dispatchEvent(new Event("spooder-run-start"));
})

ipcRenderer.on("spooder-stdout", (e, msg) => {
    console.log("WHAT THIS?", msg);
    
    window.dispatchEvent(new CustomEvent("spooder-stdout", {detail:msg.message}));
});

ipcRenderer.on("spooder-status", (e, status) => {
    window.dispatchEvent(new CustomEvent("spooder-status", {detail:status}));
})

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
    toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
    system: () => ipcRenderer.invoke('dark-mode:system'),
    // we can also expose variables, not just functions
  });

  contextBridge.exposeInMainWorld('installer', {
    runSpooder: () => ipcRenderer.invoke('spooder:run'),
    stopSpooder: () => ipcRenderer.invoke('spooder:stop'),
    restartSpooder: () => ipcRenderer.invoke('spooder:restart'),
    cleanSpooder: () => ipcRenderer.invoke('spooder:clean'),
    deleteSpooder: () => ipcRenderer.invoke('spooder:delete'),
    viewSpooder: () => ipcRenderer.invoke("spooder:view"),
    updateSpooder: () => ipcRenderer.invoke("spooder:update"),
    status: () => ipcRenderer.invoke("spooder:status"),
    installStatus:() => ipcRenderer.invoke("spooder:install_status"),
    installNode: () => ipcRenderer.invoke("node:install"),
    openSpooder: () => ipcRenderer.invoke("spooder:open"),
    setBranch: (branch) => ipcRenderer.invoke("branch:set", branch)
  })