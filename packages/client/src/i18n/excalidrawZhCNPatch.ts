// @ts-expect-error Excalidraw's bundled locale chunks are runtime-only JS files.
import zhExcalidrawLocale from '../../node_modules/@excalidraw/excalidraw/dist/prod/locales/zh-CN-LNUGB5OW.js';

type LocaleBranch = Record<string, string>;
type LocaleTree = Record<string, string | LocaleBranch>;

const excalidrawZhCNLocale = zhExcalidrawLocale as LocaleTree;

// Excalidraw 0.18.0's bundled zh-CN locale is missing a few newer menu keys.
const labels = (excalidrawZhCNLocale.labels ??= {} as LocaleBranch) as LocaleBranch;
labels.toggleGrid = '切换网格';

const findDialog = (excalidrawZhCNLocale.findDialog ??= {} as LocaleBranch) as LocaleBranch;
findDialog.title = '在画布上查找';
findDialog.noMatch = '未找到匹配项...';
findDialog.singleResult = '个结果';
findDialog.multipleResults = '个结果';
findDialog.placeholder = '在画布上查找...';

const stats = (excalidrawZhCNLocale.stats ??= {} as LocaleBranch) as LocaleBranch;
stats.fullTitle = '画布与形状属性';
stats.title = '属性';
stats.generalStats = '画布';
stats.elementProperties = '形状属性';
stats.shapes = '形状';

export {};
