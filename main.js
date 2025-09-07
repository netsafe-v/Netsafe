const { app, BrowserWindow,Menu,ipcMain } = require('electron')
const path = require('path')
const { spawn,exec } = require('child_process');
const fs = require('fs')


// const { parseProxyLink } = require('./ParseConfigLink.js')

let xrayProcess = null
var isConnected = false;
let win;
const isDev = !app.isPackaged;
const xrayBinary = isDev ? path.join(__dirname, 'xray', process.platform === 'win32' ? 'xray.exe' : 'xray') : path.join(process.resourcesPath, 'xray', process.platform === 'win32' ? 'xray.exe' : 'xray');
const configPath = isDev ? path.join(__dirname, 'xray', 'config.json') : path.join(process.resourcesPath, 'xray', 'config.json');



function createWindow () {
   win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'icon.ico'),
    resizable:false,
    frame:false,
    titleBarStyle: 'hidden',
    maximizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
    }
  )

  win.loadFile('index.html')
 

  win.setMenu(null)
  ipcMain.on('navigate', (event, page) => {
    if (win){
      win.loadFile(page);
    }
  });
  
}

function setSystemProxy(host, port) {
  exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f`);
  exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d ${host}:${port} /f`);
}

function disableSystemProxy() {
  exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`);

}

ipcMain.on('start-xray', (event) => {
  if (xrayProcess) {
    return;
  }
  isConnected = true
  setSystemProxy("127.0.0.1", 10808);
  xrayProcess = spawn(xrayBinary, ['-config', configPath]);
  event.sender.send('xray-status',"VPN Started")
  xrayProcess.stdout.on('data', (data) => {
    event.sender.send('xray-log', data.toString());
  });

  xrayProcess.stderr.on('data', (data) => {
    event.sender.send('xray-status', "Connection Error!");
  });

  xrayProcess.on('close', (code) => {
    xrayProcess = null;
  });
});

ipcMain.on('stop-xray',(event) =>{
  isConnected = false
  if (xrayProcess){
    xrayProcess.kill()
    xrayProcess = null;
    disableSystemProxy()
    event.sender.send('xray-status',"VPN Stopped")
  }
})

ipcMain.on('window-minimize', (event) => {
  const titlebarwin = BrowserWindow.fromWebContents(event.sender);
  titlebarwin.minimize();
});



ipcMain.on('window-close', (event) => {
  const titlebarwin = BrowserWindow.fromWebContents(event.sender);
  disableSystemProxy()
  titlebarwin.close();
});

ipcMain.on("save-config", (event, userConfig) => {
  fs.writeFileSync(configPath, userConfig);
  event.sender.send("config-saved", "✅ با موقعیت اضافه شد");
});
ipcMain.on('read-file-config',(event,msg) =>{
  const data = fs.readFileSync(configPath,"utf-8");
  event.sender.send("data-config-send",data)
})
ipcMain.on('get-vpn-status', (event) => {
  event.sender.send('vpn-status', isConnected);
  if (isConnected){
    event.sender.send('xray-status', "Already running");
  }else{
    event.sender.send('xray-status', "Not running");

  }

});


app.setAppUserModelId(process.execPath);
app.whenReady().then(createWindow)

