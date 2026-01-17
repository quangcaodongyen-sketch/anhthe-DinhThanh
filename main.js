
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Ảnh thẻ - Khôi phục ảnh Đinh Thành",
    icon: path.join(__dirname, 'vite.svg'), // Đảm bảo bạn có file icon
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Nếu bạn đã deploy lên Vercel, hãy load URL đó
  // Nếu muốn chạy offline hoàn toàn, bạn cần build React trước rồi load file index.html
  mainWindow.loadURL('https://tiem-giang-app.vercel.app'); 

  // Mở các link ngoài bằng trình duyệt mặc định của máy tính
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Xóa menu bar mặc định để trông giống phần mềm chuyên nghiệp
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
