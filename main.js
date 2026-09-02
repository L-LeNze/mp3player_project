// 1. 引入 Electron 的核心模块
const { app, BrowserWindow, ipcMain, Notification, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 2. 创建窗口的函数
function createWindow() {
    const win = new BrowserWindow({
        width: 1100,
        height: 700,
        resizable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        frame: true,
        backgroundColor: '#1a1a2e',
        titleBarStyle: 'default'
    });

    win.loadFile('index.html');
    global.mainWindow = win;

    registerShortcuts(win);
}

// 3. 注册全局快捷键
function registerShortcuts(win) {
    globalShortcut.register('Control+Shift+Space', () => {
        win.webContents.send('shortcut-togglePlay');
    });

    globalShortcut.register('Control+Shift+Left', () => {
        win.webContents.send('shortcut-prev');
    });

    globalShortcut.register('Control+Shift+Right', () => {
        win.webContents.send('shortcut-next');
    });

    console.log('🎵 全局快捷键: Ctrl+Shift+Space(播放/暂停), Ctrl+Shift+Left(上一首), Ctrl+Shift+Right(下一首)');
}

// 4. 监听来自渲染进程的通知
ipcMain.on('show-notification', (event, data) => {
    console.log('收到通知请求:', data);

    try {
        let iconPath = null;

        if (data.icon && data.icon.startsWith('data:image')) {
            try {
                const matches = data.icon.match(/^data:image\/(\w+);base64,(.+)$/);
                if (matches) {
                    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const base64Data = matches[2];
                    const buffer = Buffer.from(base64Data, 'base64');

                    const tempDir = os.tmpdir();
                    const tempFile = path.join(tempDir, `cover_${Date.now()}.${ext}`);
                    fs.writeFileSync(tempFile, buffer);
                    iconPath = tempFile;

                    setTimeout(() => {
                        try {
                            if (fs.existsSync(tempFile)) {
                                fs.unlinkSync(tempFile);
                            }
                        } catch (e) { /* 忽略 */ }
                    }, 300000);
                }
            } catch (e) {
                console.error('保存封面图失败:', e);
            }
        }

        const notification = new Notification({
            title: data.title || '🎵 正在播放',
            body: data.body || '',
            icon: iconPath || null,
            silent: true
        });

        notification.show();

        notification.on('click', () => {
            if (global.mainWindow) {
                global.mainWindow.focus();
            }
        });
    } catch (error) {
        console.error('通知错误:', error);
    }
});

// ===== 迷你模式切换 =====
ipcMain.on('toggle-mini-mode', (event, isMini) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;

    if (isMini) {
        win.setSize(420, 220);
        win.setResizable(false);
        win.setAlwaysOnTop(true);
        win.setBackgroundColor('#1a1a2e');
        win.setMenuBarVisibility(false);
        // 延迟执行，确保页面加载完成
        setTimeout(() => {
            win.webContents.executeJavaScript(`
                try {
                    document.body.style.overflow = 'hidden';
                    const player = document.querySelector('.player');
                    if (player) {
                        player.style.overflow = 'hidden';
                        player.style.borderRadius = '0';
                    }
                    const miniContent = document.querySelector('.mini-content');
                    if (miniContent) miniContent.style.display = 'flex';
                } catch(e) { console.log('迷你模式切换成功'); }
            `);
        }, 100);
    } else {
        win.setSize(1100, 700);
        win.setResizable(true);
        win.setAlwaysOnTop(false);
        win.setBackgroundColor('#1a1a2e');
        win.setMenuBarVisibility(true);
        setTimeout(() => {
            win.webContents.executeJavaScript(`
                try {
                    document.body.style.overflow = 'auto';
                    const player = document.querySelector('.player');
                    if (player) {
                        player.style.overflow = 'visible';
                        player.style.borderRadius = '32px';
                    }
                } catch(e) { console.log('恢复模式成功'); }
            `);
        }, 100);
    }
});

// 5. 应用退出时注销快捷键
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// 6. 等待 Electron 完全启动后，创建窗口
app.whenReady().then(createWindow);

// 7. 监听所有窗口关闭事件
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});