const { app, BrowserWindow, ipcMain, nativeTheme, shell, MessageChannelMain, dialog, Tray } = require('electron');
const { port1, port2 } = new MessageChannelMain();
const path = require('node:path');
const { exec, spawn, fork } = require("child_process");
const fs = require("fs");
const chmodr = require("chmodr");
const fetch = require("electron-fetch").default;
const AdmZip = require("adm-zip");
const semver = require("semver");
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-downloaded', (event, releaseInfo) => {
    // Handle downloaded update
    const dialogOpts = {
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'Update available',
        message: `A new version ${releaseInfo.version} is available. Do you want to restart and update now?`
    };

    dialog.showMessageBox(null, dialogOpts).then((result) => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

var spooderInstance = null;

let configFilePath = path.join(app.getPath('userData'), "config.json");
let installPath = path.join(app.getPath('userData'), "main");

//Fetched before UI served
let branches = null;

// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}

function handleSquirrelEvent() {
    if (process.argv.length === 1) {
        return false;
    }

    const path = require('path');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawny = function(command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = spawn(command, args, { detached: true });
        } catch (error) {}

        return spawnedProcess;
    };

    const spawnUpdate = function(args) {
        return spawny(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            // Optionally do things such as:
            // - Add your .exe to the PATH
            // - Write to the registry for things like file associations and
            //   explorer context menus

            // Install desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);

            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            // Undo anything you did in the --squirrel-install and
            // --squirrel-updated handlers

            // Remove desktop and start menu shortcuts
            spawnUpdate(['--removeShortcut', exeName]);
            if (fs.existsSync(installPath)) {
                fs.rmSync(installPath, { recursive: true });
            }
            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated

            app.quit();
            return true;
    }
};

if (!fs.existsSync(installPath)) {
    fs.mkdirSync(installPath);
}

// Function to read the config file
function readConfigFile(item) {
    try {
        // Read the config file synchronously
        const configFileContent = fs.readFileSync(configFilePath, 'utf-8');
        if (item != null) {
            return JSON.parse(configFileContent)?.[item];
        } else {
            return JSON.parse(configFileContent);
        }
    } catch (error) {
        // If the file doesn't exist or there's an error, return an empty object
        return {};
    }
}

function saveSelectedFolder(selectedFolder) {
    try {
        // Read the existing config file content
        const configFileContent = readConfigFile();

        // Update the selectedFolder property
        configFileContent.installPath = selectedFolder;
        installPath = selectedFolder + "/main";

        if (!fs.existsSync(installPath)) {
            fs.mkdirSync(installPath);
        }

        // Write the updated content back to the config file
        fs.writeFileSync(configFilePath, JSON.stringify(configFileContent, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving config file:', error);
    }
}

function saveBranch(branch) {
    try {
        // Read the existing config file content
        const configFileContent = readConfigFile();

        // Update the selectedFolder property
        configFileContent.branch = branch;

        if (!fs.existsSync(installPath)) {
            fs.mkdirSync(installPath);
        }

        // Write the updated content back to the config file
        fs.writeFileSync(configFilePath, JSON.stringify(configFileContent, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving config file:', error);
    }
}

function checkForNode(quiet) {
    if (quiet == null) { quiet = true }
    return new Promise((res, rej) => {
        let nodeInstalled = false;
        exec("node -v", (command, stdout, stderr) => {
            if (stdout.startsWith("v")) {
                nodeInstalled = true;
                if (quiet == false) {
                    console.log("Node **" + stdout.trim() + "** installed");
                    sendToBrowser("Node **" + stdout.trim() + "** installed");
                }
                res(true);
            } else {
                if (quiet == false) {
                    sendToBrowser("!!!!! NODE.JS NOT INSTALLED !!!!!");
                    sendToBrowser("Node.js is needed on your system to install Spooder and plugins. Click the Node.js button to get the latest LTS version. Then click the refresh button to verify its installed. You might need to restart the app for installation to take effect.")
                }
                res(false);
            }
        })
    })

}

function compareVersion(v1, v2) {
    console.log("COMPARING", v1, v2);
    let v1Split = v1.split(".");
    let v2Split = v2.split(".");
    if (v1Split.length > v2Split.length) {
        return true;
    } else {
        for (let v in v1Split) {
            if (parseInt(v1Split[v]) > parseInt(v2Split[v])) {
                return true;
            }
        }
    }
    return false;
}

async function checkForSpooderUpdates() {
    let sInfo = fs.existsSync(installPath + "/package.json") ? JSON.parse(fs.readFileSync(installPath + "/package.json", { encoding: "utf-8" })) : null;
    if (sInfo == null) { console.log("Spooder not installed"); return; }
    let repoVersion = await checkRepoVersion();
    if (semver.gt(repoVersion, sInfo.version)) {
        console.log("NEW SPOODER UPDATE!", repoVersion);
        sendToBrowser("NEW SPOODER UPDATE! **v" + repoVersion + "** click the update button in the settings menu!");
    }
    return compareVersion(repoVersion, sInfo.version);
}

function checkForSpooders(quiet) {
    if (quiet == null) { quiet = true }
    let spooderInstalled = false;
    if (fs.existsSync(installPath)) {
        let sInfo = fs.existsSync(installPath + "/package.json") ? JSON.parse(fs.readFileSync(installPath + "/package.json", { encoding: "utf-8" })) : null;
        if (sInfo != null) {
            if (quiet == false) {
                console.log("Spooder v" + sInfo.version + " installed");
                sendToBrowser("Spooder **v" + sInfo.version + "** installed");
            }
            spooderInstalled = true;
        } else {
            if (quiet == false) {
                console.log("Spooder not installed");
                sendToBrowser("Spooder not installed");
            }
            spooderInstalled = false;
        }
    }
    return spooderInstalled;
}

function sendToBrowser(txt) {
    BrowserWindow.getAllWindows()[0].webContents.postMessage("spooder-stdout", { message: txt });
}

function checkRepoVersion(branch) {
    if (branch == null) { branch = "main"; }
    return new Promise((res, rej) => {
        fetch("https://raw.githubusercontent.com/GreySole/Spooder/" + branch + "/package.json")
            .then(res => res.json())
            .then(data => {
                res(data.version);
            })
    })
}

function getBranches() {
    return new Promise((res, rej) => {
        fetch("https://api.github.com/repos/greysole/Spooder/branches")
            .then(res => res.json())
            .then(data => {
                res(data);
            })
    })
}

function mergeDirectories(sourceDir, destDir) {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir);
    }

    const files = fs.readdirSync(sourceDir);

    files.forEach((file) => {
        const srcPath = path.join(sourceDir, file);
        const destPath = path.join(destDir, file);

        const stats = fs.statSync(srcPath);

        if (stats.isDirectory()) {
            mergeDirectories(srcPath, destPath);
        } else {
            fs.moveSync(srcPath, destPath, { overwrite: true });
        }
    });
}

function installSpooder(event, branch) {
    if (branch == null) { branch = "main"; }

    return new Promise((res, rej) => {

        if (installPath == null) {
            let spooderPath = dialog.showOpenDialogSync({
                title: "Where should I install Spooder?",
                properties: ['openDirectory']
            })[0];

            if (spooderPath == null) {
                res("cancel");
                return;
            } else {
                saveSelectedFolder(spooderPath);
            }
        }

        console.log("CLONING SPOODER", installPath);

        event.sender.send('spooder-clone-start', 1);

        fetch("https://api.github.com/repos/greysole/Spooder/zipball/" + branch)
            .then(response => response.arrayBuffer())
            .then(async data => {
                const tempDir = app.getPath('userData') + "\\temp";;
                const tempFile = path.join(tempDir, "spooder.zip");
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true });
                }

                fs.mkdirSync(tempDir, { recursive: true });
                fs.writeFileSync(tempFile, Buffer.from(data));

                let zip = new AdmZip(tempFile);
                zip.extractEntryTo(zip.getEntries()[0], tempDir);

                const fileDir = path.join(tempDir, zip.getEntries()[0].entryName)

                const files = fs.readdirSync(fileDir);
                for (const file of files) {
                    const currentFilePath = path.join(fileDir, file);
                    const newFilePath = path.join(installPath, file);

                    if (fs.existsSync(newFilePath)) {
                        if (newFilePath.includes("backend") && !newFilePath.includes("Spooder_Modules")) { continue; }
                        fs.rmSync(newFilePath, { recursive: true });
                    }

                    fs.renameSync(currentFilePath, newFilePath);
                }

                fs.rmSync(tempFile);
                fs.rmSync(path.join(tempDir, zip.getEntries()[0].entryName), { recursive: true });

                console.log("INSTALLING SPOODER DEPENDENCIES");
                event.sender.send('spooder-install-start', 1);
                await installSpooderDependencies(installPath)
                    .catch(e => {
                        rej("INSTALL DEPENDENCY ERROR: " + e.message);
                        return;
                    })
                console.log("INSTALL COMPLETE");
                chmodr(installPath, 0o777, (err) => {
                    if (err) {
                        console.log('Failed to execute chmod', err);
                    } else {
                        console.log('Chmodr Success');
                    }
                });
                event.sender.send('spooder-install-finish', 1);
                let spooderInfo = fs.existsSync(installPath + "/package.json") ? JSON.parse(fs.readFileSync(installPath + "/package.json", { encoding: "utf-8" })) : {};
                res(spooderInfo);
            })
            .catch(e => {
                sendToBrowser("Error installing Spooder: " + e);
                console.log(e);
            })
    });
}

function installSpooderDependencies(path) {
    let waitTime1 = setTimeout(() => {
        sendToBrowser("This could take some time. I wish I could show progress on this part, but it doesn't seem possible...");
    }, 10000);

    let waitTime2 = setTimeout(() => {
        sendToBrowser("It's about 200 packages with all the integrations and their dependencies 😅 go watch some YouTube or something. Spooder will auto start and open in your browser when finished.");
    }, 30000);

    let waitTime3 = setTimeout(() => {
        sendToBrowser("Still doing its thing...If there's something wrong. It'll stop and print here. It can't get stuck on this task.");
    }, 60000);

    let waitTime4 = setTimeout(() => {
        sendToBrowser("It shouldn't take longer than 5 minutes. Trust me, we're not installing Unity here.");
    }, 120000);

    let waitTime5 = setTimeout(() => {
        sendToBrowser("I'm putting out these timed logs. Because when something's installing without a progress bar, I get anxious. I don't want you to feel anxious :3");
    }, 180000);

    let waitTime6 = setTimeout(() => {
        sendToBrowser("Did you leave this on overnight? Damn bro, I don't know what to say. Maybe it is stuck 🤷");
    }, 28800000);

    return new Promise((res, rej) => {
        console.log(path);
        let install = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ["install"], { cwd: path, stdio: "pipe" });
        install.on('close', code => {
            clearTimeout(waitTime1);
            clearTimeout(waitTime2);
            clearTimeout(waitTime3);
            clearTimeout(waitTime4);
            clearTimeout(waitTime5);
            clearTimeout(waitTime6);
            res("OK");
        })
        install.stdout.on("data", (e) => {
            console.log("STDOUT", e.toString());
            sendToBrowser(e.toString());
        });
        install.stderr.on("data", (e) => {
            console.log("STDERR", e.toString());
            sendToBrowser(e.toString());
        });
    })
}

let restartCount = 0;

function errorRestart() {
    if (spooderInstance != null) {
        spooderInstance.kill();
    }
    if (restartCount < 3) {
        sendToBrowser("Auto restarting:", restartCount);
        runSpooder();
    }
    restartCount++;
}

function runSpooder(event) {
    if (spooderInstance != null) {
        spooderInstance.kill();
    }
    return new Promise((res, rej) => {
        try {
            let spooderInitialized = fs.existsSync(installPath + "/backend/settings/config.json") ? true : false;

            if (spooderInitialized == true) {
                console.log("RUNNING SPOODER");
                spooderInstance = fork(installPath + "/spooder.js", [""], {
                    cwd: installPath,
                    stdio: "pipe"
                });

                spooderInstance.stdout.on("data", (e) => {
                    sendToBrowser(e.toString());
                });
                spooderInstance.stderr.on("data", (e) => {
                    console.log("SPOODER ERROR", e.toString());
                    if (event != null) {
                        event.sender.send('spooder-run-error', 1);
                    }
                    errorRestart();
                    sendToBrowser(e.toString());
                });
                spooderInstance.on('error', (error) => {
                    sendToBrowser("Spooder crashed!");
                    errorRestart();
                    console.error("Spooder crashed! ", error);
                })
            } else {
                console.log("RUNNING SPOODER INIT");
                spooderInstance = fork(installPath + "/spooder.js", ["-i"], {
                    cwd: installPath,
                    stdio: "pipe"
                });
                spooderInstance.stdout.on("data", (e) => {
                    sendToBrowser(e.toString());
                });
                spooderInstance.stderr.on("data", (e) => {
                    console.log("SPOODER ERROR", e.toString());
                    if (event != null) {
                        event.sender.send('spooder-run-error', 1);
                    }
                    errorRestart();
                    sendToBrowser(e.toString());
                });

                spooderInstance.on('error', (error) => {
                    sendToBrowser("Spooder crashed!");
                    errorRestart();
                    console.error("Spooder crashed! ", error);
                })
            }

            if (event != null) {
                event.sender.send('spooder-run-start', 1);
            }
            shell.beep();

        } catch (e) {

        }
    })

}

const createWindow = async() => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        focusable: true,
        icon: path.join(process.cwd(), 'assets', 'favicon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    win.removeMenu();
    branches = await getBranches();
    win.focus();
    win.loadFile('index.html');
}

ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
        nativeTheme.themeSource = 'light'
    } else {
        nativeTheme.themeSource = 'dark'
    }
    return nativeTheme.shouldUseDarkColors
})

ipcMain.handle('dark-mode:system', () => {
    nativeTheme.themeSource = 'system'
})

ipcMain.handle('branch:set', (e, branch) => {
    saveBranch(branch);
    if (spooderInstance != null) {
        spooderInstance.kill();
    }
    installSpooder(e, readConfigFile().branch);
})

ipcMain.handle("spooder:run", async(e) => {
    restartCount = 0;
    if (checkForSpooders() == false) {
        await installSpooder(e, readConfigFile().branch);
        checkForSpooders(false);
    }
    runSpooder(e);
});

ipcMain.handle("spooder:stop", e => {
    if (spooderInstance != null) {
        spooderInstance.kill();
    }
});

ipcMain.handle("spooder:restart", e => {
    restartCount = 0;
    if (spooderInstance != null) {
        spooderInstance.kill();
    }
    runSpooder(e);
})

ipcMain.handle("spooder:update", e => {
    if (spooderInstance != null) {
        spooderInstance.kill();
    }
    installSpooder(e, readConfigFile().branch);
})

ipcMain.handle("spooder:clean", e => {

    if (fs.existsSync(installPath + "/backend")) {
        let folderList = fs.readdirSync(installPath + "/backend");
        for (let d in folderList) {
            if (folderList[d] != "Spooder_Modules") {
                fs.rmSync(installPath + "/backend/" + folderList[d], { recursive: true });
            }
        }
    }
});

ipcMain.handle("spooder:delete", e => {
    if (fs.existsSync(installPath)) {
        fs.rmSync(installPath, { recursive: true });
    }
});

ipcMain.handle("spooder:view", e => {
    shell.openPath(installPath);
});

ipcMain.handle("spooder:open", e => {
    let hostPort = 3000;
    if (fs.existsSync(path.join(installPath, "backend", "settings", "config.json"))) {
        try {
            let configFile = JSON.parse(fs.readFileSync(path.join(installPath, "backend", "settings", "config.json"), { encoding: "utf-8" }));
            if (configFile.network?.host_port != null) {
                hostPort = configFile.network.host_port;
            }
        } catch (e) {
            console.log("Couldn't read Spooder config file.");
        }

    }
    shell.openPath("http://localhost:" + hostPort);
});

ipcMain.handle("node:install", e => {
    shell.openExternal('https://nodejs.org/en');
});

ipcMain.handle("spooder:install_status", async(e) => {
    await checkForNode(false);
    checkForSpooders(false);
})

ipcMain.handle("spooder:status", async(e) => {
    let nodeInstalled = await checkForNode();
    let spooderInstalled = checkForSpooders();
    let updateAvailable = await checkForSpooderUpdates();
    let spooderInitialized = false;
    let spooderRunning = false;
    if (spooderInstance != null) {
        spooderRunning = spooderInstance.killed === false;
    }
    if (spooderInstalled == true) {
        spooderInitialized = fs.existsSync(installPath + "/backend/settings/config.json") ? true : false;
    }
    let spooderData = null;
    if (spooderInitialized == true) {
        let spooderPackage = JSON.parse(fs.readFileSync(installPath + "/package.json"));
        let spooderConfig = JSON.parse(fs.readFileSync(installPath + "/backend/settings/config.json"));
        let spooderThemes = JSON.parse(fs.readFileSync(installPath + "/backend/settings/themes.json"));
        spooderData = {
            version: spooderPackage.version,
            config: spooderConfig,
            themes: spooderThemes
        }
    }

    e.sender.send("spooder-status", {
        nodeInstalled: nodeInstalled,
        installed: spooderInstalled,
        updateAvailable: updateAvailable,
        branches: branches,
        currentBranch: readConfigFile().branch,
        initialized: spooderInitialized,
        running: spooderRunning,
        data: spooderData
    });
})

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})