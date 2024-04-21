const markdown = new showdown.Converter();
let $ = (selector) => document.querySelector(selector);

let state = {
    updated:false,
    installed:false,
    initialized:false,
    running:false,
    installing:false,
    currentBranch:"main",
    spoodername:"",
    spooderpet:{
        "bigeyeleft": "o",
        "bigeyeright": "o",
        "littleeyeleft": "º",
        "littleeyeright": "º",
        "fangleft": "",
        "fangright": "",
        "mouth": "ω",
        "bodyleft": "(",
        "bodyright": ")",
        "shortlegleft": "/\\",
        "longlegleft": "/╲",
        "shortlegright": "/\\",
        "longlegright": "╱\\",
        "colors": {
            "bigeyeleft": "#ffffff",
            "bigeyeright": "#ffffff",
            "littleeyeleft": "#ffffff",
            "littleeyeright": "#ffffff",
            "fangleft": "#ffffff",
            "fangright": "#ffffff",
            "mouth": "white",
            "bodyleft": "#ffffff",
            "bodyright": "#ffffff",
            "shortlegleft": "#ffffff",
            "shortlegright": "#ffffff",
            "longlegleft": "#ffffff",
            "longlegright": "#ffffff"
        }
    }
}

installer.installStatus();
installer.status();

window.addEventListener("spooder-clone-start", (e) => {
    addLog("Cloning Spooder...");
    state.installing = true;
})

window.addEventListener("spooder-install-start", (e) => {
    addLog("Installing Spooder dependencies...");
})

window.addEventListener("spooder-install-finish", (e) => {
    addLog("Install complete!");
    state.installing = false;
    installer.status();
})

window.addEventListener("spooder-run-start", (e) => {
    addLog("Starting Spooder...");
    state.installing = false;
})

window.addEventListener("spooder-status", e => {
    let status = e.detail;
    console.log("STATUS", status);
    Object.assign(state, status);
    if(status.data != null){
        state.spooderpet = status.data.themes.spooderpet;
        state.spoodername = status.data.config.bot.bot_name;
    }
    updateStatus();
    updateSettings();
})

function startSpooder(){
    installer.runSpooder();
    installer.status();
}

function stopSpooder(){
    installer.stopSpooder();
    installer.status();
}

function updateSpooder(){
    let changeConfirm = confirm("We will install the new version of Spooder. No user data will be erased. You ready?");
    if(changeConfirm === true){
        switchTab("console");
        installer.updateSpooder();
        state.installing = true;
        updateStatus();
    }
}

function restartSpooder(){
    installer.restartSpooder();
    installer.status();
}

function deleteSpooder(){
    let confirmation = confirm("This will delete your Spooder entirely. Be sure to backup your settings and plugins in WebUI -> Config -> Backup/Restore if you want to reinstall!");
    if(confirmation == true){
        switchTab("console");
        installer.deleteSpooder();
        installer.status();
    }
}

function cleanSpooder(){
    let confirmation = confirm("This will wipe your Spooder's settings and plugins. You will have to initialize again. Continue?");
    if(confirmation == true){
        switchTab("console");
        installer.cleanSpooder();
        installer.status();
    }
}

function viewSpooder(){
    installer.viewSpooder();
}

function installNode(){
    installer.installNode();
}

function checkForNode(){
    installer.status();
}

function openSpooder(){
    installer.openSpooder();
}

function setBranch(e){
    let changeConfirm = confirm("We will reinstall Spooder with the version under "+e.value+". No user data will be erased. You ready?");
    if(changeConfirm === true){
        installer.setBranch(e.value);
        switchTab("console");
        state.installing = true;
        updateStatus();
    }else{
        e.value = state.currentBranch;
    }
}

function switchTab(tab){
    if(tab == null){
        let currentTab = $(".main-window").getAttribute("tab");
        if(currentTab === "console"){
            tab = "settings";
        }else{
            tab = "console";
        }
    }
    $(".main-window").setAttribute("tab", tab);
    if(tab === 'settings'){
        $("#settingsButton").classList.add("open");
    }else{
        $("#settingsButton").classList.remove("open");
    }
}

function updateStatus(){
    console.log(state);
    let bigEyeLeft = state.installing==true ? 
    `<span id='bigEyeLeft'><svg style="height:30px" fill='white' class='spinning' data-src='./assets/dashed-circle.svg'/></span>` 
    : `<span id='bigEyeLeft' style='color:${state.spooderpet.colors.bigeyeleft}'>${state.spooderpet.bigeyeleft}</span>`;
    let bigEyeRight = state.installing==true ? 
    `<span id='bigEyeLeft'><svg style="height:30px" fill='white' class='spinning' data-src='./assets/dashed-circle.svg'/></span>` 
    : `<span id='bigEyeLeft' style='color:${state.spooderpet.colors.bigeyeright}'>${state.spooderpet.bigeyeright}</span>`;
    let spooderHTML = `
        <span style='color:${state.spooderpet.colors.longlegleft}'>${state.spooderpet.longlegleft}</span>
        <span style='color:${state.spooderpet.colors.shortlegleft}'>${state.spooderpet.shortlegleft}</span>
        <span style='color:${state.spooderpet.colors.bodyleft}'>${state.spooderpet.bodyleft}</span>
        <span style='color:${state.spooderpet.colors.littleeyeleft}'>${state.spooderpet.littleeyeleft}</span>
        ${bigEyeLeft}
        <span style='color:${state.spooderpet.colors.fangleft}'>${state.spooderpet.fangleft}</span>
        <span style='color:${state.spooderpet.colors.mouth}'>${state.spooderpet.mouth}</span>
        <span style='color:${state.spooderpet.colors.fangright}'>${state.spooderpet.fangright}</span>
        ${bigEyeRight}
        <span style='color:${state.spooderpet.colors.littleeyeright}'>${state.spooderpet.littleeyeright}</span>
        <span style='color:${state.spooderpet.colors.bodyright}'>${state.spooderpet.bodyright}</span>
        <span style='color:${state.spooderpet.colors.shortlegright}'>${state.spooderpet.shortlegright}</span>
        <span style='color:${state.spooderpet.colors.longlegright}'>${state.spooderpet.longlegright}</span>
    `;

    $(".control-spooder-pet").innerHTML = spooderHTML;
    $(".control-spooder-name").innerHTML = state.spoodername;

    let startButton = `
        <div class='action-button start' id='startButton' type='button' onclick='startSpooder()'><svg fill='white' data-src='./assets/play-solid.svg'/></div>
    `;

    let stopButton = `
        <div class='action-button stop' id='stopButton' type='button' onclick='stopSpooder()'><svg fill='white' data-src='./assets/stop-solid.svg'/></div>
    `;

    let restartButton = `
        <div class='action-button restart' id='restartButton' type='button' onclick='restartSpooder()'><svg fill='white' data-src='./assets/rotate-solid.svg'/></div>
    `;

    let installButton = `
        <div class='action-button install' id='installButton' type='button' onclick='startSpooder()'><svg fill='white' data-src='./assets/download-solid.svg'/></div>
    `;

    let viewButton = `
        <div class='action-button view' id='viewButton' type='button' onclick='viewSpooder()'><svg fill='white' data-src='./assets/folder-open-regular.svg'/></div>
    `;

    let nodeButton = `
        <div class='action-button view' id='viewButton' type='button' onclick='installNode()'><svg fill='white' data-src='./assets/node.svg'/></div>
    `;

    let nodeCheckButton = `
        <div class='action-button restart' id='restartButton' type='button' onclick='checkForNode()'><svg fill='white' data-src='./assets/rotate-solid.svg'/></div>
    `;

    let openSpooderButton =`
        <div class='action-button view' id='restartButton' type='button' onclick='openSpooder()'><svg fill='white' data-src='./assets/arrow-up-right-from-square-solid.svg'/></div>
    `;

    let settingsButton =`
        <div class='action-button view' id='settingsButton' type='button' onclick='switchTab()'><svg fill='white' data-src='./assets/gear-solid.svg'/></div>
    `;
    

    let finalHTML = startButton;

    if(state.nodeInstalled == false){
        finalHTML = `${nodeCheckButton} ${nodeButton}`;
    }else if(state.installed == false && state.installing == false){
        finalHTML = `${settingsButton} ${installButton}`;
        addLog("Welcome to Spooder! Click the install button and we'll grab and install the latest Spooder from GitHub. You might need Node.js installed.")
    }else if(state.installing == true){
        finalHTML = `${viewButton}`;
    }else if((state.installed == true && state.installing == false && state.running == false)){
        finalHTML = `${settingsButton} ${viewButton} ${startButton}`;
        
    }else if(state.running == true){
        finalHTML = `${openSpooderButton} ${viewButton} ${restartButton} ${stopButton}`;
    }

    $(".control-buttons").innerHTML = finalHTML;
}

function updateSettings(){
    let deleteButton = `
        <div class='action-button delete' id='deleteButton' type='button' onclick='deleteSpooder()'><svg fill='white' data-src='./assets/trash-solid.svg'/></div>
    `;
    let cleanButton = `
        <div class='action-button delete' id='cleanButton' type='button' onclick='cleanSpooder()'><svg fill='white' data-src='./assets/broom-solid.svg'/></div>
    `;

    let installButton = `
        <div class='action-button install' id='installButton' type='button' onclick='updateSpooder()'><svg fill='white' data-src='./assets/download-solid.svg'/></div>
    `;
    
    
    let branchOptions = [];
    for(let b in state.branches){
        branchOptions.push(`
            <option value='${state.branches[b].name}' ${state.branches[b].name === state.currentBranch ? "selected":""}>${state.branches[b].name}</option>
        `)
    }
    let branchSelect = `
        <select value=${state.currentBranch} onchange='setBranch(this)'>
            ${branchOptions.join("\n")}
        </select>
    `;
    let finalHTML = `
        <div class='settings-fields'>
            <label>Branch${branchSelect}</label>
            <label>Delete Spooder ${deleteButton}</label>
            <label>Clean Spooder ${cleanButton}</label>
            ${state.updateAvailable ? "<label>Update Spooder"+installButton+"</label>":""}
        </div>
    `;
    $(".settings").innerHTML = finalHTML;
}

window.logEffects = {
    Reset:"\x1b[0m",
    Bright:"\x1b[1m",
    Dim:"\x1b[2m",
    Underscore:"\x1b[4m",
    Blink:"\x1b[5m",
    Reverse:"\x1b[7m",
    Hidden:"\x1b[8m",

    FgBlack:"\x1b[30m",
    FgRed:"\x1b[31m",
    FgGreen:"\x1b[32m",
    FgYellow:"\x1b[33m",
    FgBlue:"\x1b[34m",
    FgMagenta:"\x1b[35m",
    FgCyan:"\x1b[36m",
    FgWhite:"\x1b[37m",
    FgGray:"\x1b[90m",

    BgBlack:"\x1b[40m",
    BgRed:"\x1b[41m",
    BgGreen:"\x1b[42m",
    BgYellow:"\x1b[43m",
    BgBlue:"\x1b[44m",
    BgMagenta:"\x1b[45m",
    BgCyan:"\x1b[46m",
    BgWhite:"\x1b[47m",
    BgGray:"\x1b[100m"
};

window.addEventListener("spooder-stdout", e=>{
    let message = e.detail;
    
    addLog(message);
});

function addLog(txt){
    let newLogClasses = [];
    for(let e in logEffects){
        if(txt.includes(logEffects[e])){
            newLogClasses.push(e);
        }
    }
    console.log("LOG CLASSES", newLogClasses);
    txt = txt.replace(/\u001b[^ ]+/g, '');
    let newLog = document.createElement("div");
    newLog.className = "spooder-log";
    newLog.classList.add(...newLogClasses);
    newLog.innerHTML = markdown.makeHtml(txt);
    
    $(".console").append(newLog);
    $(".console").scrollTop = $(".console").scrollHeight;
}