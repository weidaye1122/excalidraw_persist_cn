const en = {
  appTitle: "Excalidraw Self-Hosted",
  loginTitle: "Sign in",
  loginDescription:
    "This private deployment stays local to your server and stores boards in SQLite.",
  passwordLabel: "Password",
  passwordPlaceholder: "Enter the deployment password",
  loginButton: "Sign in",
  loggingIn: "Signing in...",
  invalidPassword: "Unable to sign in. Check the password and try again.",
  boards: "Boards",
  newBoard: "New board",
  saveBoard: "Save board",
  savingBoard: "Saving...",
  boardSaved: "Board saved",
  lastSaved: "Last saved",
  unsavedChanges: "Unsaved changes",
  allChangesSaved: "All changes saved",
  openBoards: "Boards",
  closeBoards: "Close boards",
  openBoard: "Open",
  renameBoard: "Rename",
  deleteBoard: "Delete",
  restoreBoard: "Restore",
  recycleBin: "Recycle bin",
  emptyBoards: "No boards yet.",
  emptyRecycleBin: "Deleted boards will appear here.",
  logout: "Sign out",
  updatedAt: "Updated",
  saveAndContinue: "Save and continue",
  discardChanges: "Discard changes",
  cancel: "Cancel",
  pendingChangesTitle: "Save this board before continuing?",
  pendingChangesDescription:
    "You have local changes that are not in SQLite yet.",
  createBoardTitle: "Create board",
  renameBoardTitle: "Rename board",
  boardNameLabel: "Board name",
  boardNamePlaceholder: "Untitled board",
  confirm: "Confirm",
  loading: "Loading...",
  loadingBoard: "Loading board...",
  serverError: "Something went wrong. Please try again.",
  saveShortcutHint: "Ctrl/Cmd+S saves to SQLite",
  welcomeHeading: "Latest official Excalidraw, now self-hosted.",
};

const zh = {
  appTitle: "Excalidraw 私有部署版",
  loginTitle: "登录",
  loginDescription: "这是一个本地私有部署版本，画布数据只保存在你的服务器和 SQLite 里。",
  passwordLabel: "密码",
  passwordPlaceholder: "请输入部署密码",
  loginButton: "登录",
  loggingIn: "登录中...",
  invalidPassword: "登录失败，请检查密码后重试。",
  boards: "画布",
  newBoard: "新建画布",
  saveBoard: "保存画布",
  savingBoard: "保存中...",
  boardSaved: "画布已保存",
  lastSaved: "上次保存",
  unsavedChanges: "有未保存修改",
  allChangesSaved: "已全部保存",
  openBoards: "画布列表",
  closeBoards: "关闭列表",
  openBoard: "打开",
  renameBoard: "重命名",
  deleteBoard: "删除",
  restoreBoard: "恢复",
  recycleBin: "回收站",
  emptyBoards: "还没有画布。",
  emptyRecycleBin: "已删除的画布会显示在这里。",
  logout: "退出登录",
  updatedAt: "更新时间",
  saveAndContinue: "先保存再继续",
  discardChanges: "放弃修改",
  cancel: "取消",
  pendingChangesTitle: "切换前先保存当前画布？",
  pendingChangesDescription: "当前修改还没有写入 SQLite。",
  createBoardTitle: "新建画布",
  renameBoardTitle: "重命名画布",
  boardNameLabel: "画布名称",
  boardNamePlaceholder: "未命名画布",
  confirm: "确认",
  loading: "加载中...",
  loadingBoard: "画布加载中...",
  serverError: "操作失败，请稍后再试。",
  saveShortcutHint: "Ctrl/Cmd+S 可保存到 SQLite",
  welcomeHeading: "官方最新版 Excalidraw 的本地私有部署版本。",
};

export const getMessages = (langCode: string) =>
  langCode.startsWith("zh") ? zh : en;

export const formatBoardTimestamp = (value: string, langCode: string) => {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(langCode.startsWith("zh") ? "zh-CN" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};
