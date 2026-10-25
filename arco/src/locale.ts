import { computed, ref } from 'vue'
import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn'
import enUS from '@arco-design/web-vue/es/locale/lang/en-us'
const zh = {
  canvasView: '画布', propertiesView: '属性', compactEmpty: '在组件面板中选择控件，开始设计表单', workspaceViews: '设计工作区', basicProperties: '基本属性', controlProperties: '控件设置',
  columnAction: '操作', columnActionName: '操作名称', columnActionLabel: '操作标题', addColumnAction: '添加操作按钮', removeColumnAction: '删除操作',
  selectionMin: '最少选项', selectionMax: '最多选项', unsavedDraft: '当前修改尚未保存，请修正配置后继续。', notSaved: '修改尚未保存', desktop: '桌面', tablet: '平板', mobile: '手机', previewTip: '预览窗口宽度', applyJson: '应用 JSON', codeEditNote: '代码修改仅用于本窗口的复制和下载，不会修改设计画布。', primaryStyle: '主要', secondaryStyle: '次要', outlineStyle: '线框', dashedStyle: '虚线', textStyle: '文字', normalStatus: '默认', warningStatus: '警告', successStatus: '成功', dangerStatus: '危险', squareShape: '方形', roundShape: '圆角', circleShape: '圆形', startAlign: '起始', endAlign: '末尾', centerAlign: '居中', spaceBetween: '两端对齐', spaceAround: '均匀分布', stretchAlign: '拉伸', clickTrigger: '点击', hoverTrigger: '悬停', weekMode: '周', monthMode: '月', quarterMode: '季度', yearMode: '年', pictureList: '图片列表', pictureCardList: '图片卡片', normalButton: '普通按钮', icon: '图标', selectIcon: '选择图标', loading: '加载状态', long: '填满宽度', booleanValue: '布尔', numberValue: '数字', textValue: '文本', valueType: '值类型', pathMode: '完整路径', checkStrictly: '独立选择', expandTrigger: '展开方式', showInput: '显示输入框', showFileList: '显示文件列表', hideButton: '隐藏上传按钮', bordered: '显示边框', stripe: '斑马纹', hoverable: '悬停效果', startPlaceholder: '开始占位提示', endPlaceholder: '结束占位提示', row: '行容器', richtext: '富文本', button: '按钮', table: '表格', inputGroup: '输入型组件', selectGroup: '选择型组件', layoutGroup: '布局型组件', designer: '表单设计', componentType: '组件类型', showLabel: '显示标题', labelWidth: '标签宽度', inherit: '继承表单', labelAlign: '标签对齐', left: '左对齐', right: '右对齐', gutter: '栅格间隔', formButtons: '表单按钮', dragField: '拖动组件', rowEmpty: '拖入组件到此行容器', optionLabel: '选项名称', optionValue: '选项值', addOption: '添加选项', addChild: '添加子选项', optionsJson: '高级：选项 JSON', dataSource: '数据来源', remoteOptions: '远程数据', requestUrl: '接口地址', requestMethod: '请求方式', dataPath: '数据路径', labelKey: '标签字段', valueKey: '值字段', childrenKey: '子级字段', requestBody: '请求体 JSON', remoteTip: '画布使用本地示例数据。运行时获取远程数据。', columns: '表格列', column: '列', addColumn: '添加列', tableData: '表格数据 JSON', width: '宽度', invalidRows: '表格数据须为对象组成的 JSON 数组。', validation: '校验规则', pattern: '正则表达式（不含 /）', validationMessage: '错误提示', addRule: '添加校验规则', allowClear: '可清空', readonly: '只读', readOnly: '只读', maxLength: '最多输入', showWordLimit: '字数统计', prefix: '前缀', suffix: '后缀', prepend: '前置内容', append: '后置内容', prefixIcon: '前图标', suffixIcon: '后图标', precision: '精度', allowSearch: '可搜索', range: '范围选择', showTicks: '显示间断点', type: '组件样式', direction: '排列方向', mode: '选择模式', format: '显示格式', valueFormat: '值格式', showTime: '选择时间', allowHalf: '允许半选', showText: '辅助文字', showAlpha: '透明度', colorFormat: '颜色格式', checkedText: '开启文字', uncheckedText: '关闭文字', checkedValue: '开启值', uncheckedValue: '关闭值', action: '上传地址', accept: '文件类型', limit: '数量限制', maxSizeMB: '文件上限 MB', listType: '列表样式', autoUpload: '自动上传', height: '编辑区高度', status: '状态', shape: '形状', buttonAction: '点击行为', justify: '水平排列', align: '垂直对齐', minRows: '最少行数', maxRows: '最多行数', viewCode: '查看代码', canvas: '设计画布', codeTip: 'Vue 3 单文件组件 · Arco Design', count: '个组件', emptyTitle: '开始设计表单', draft: '本地草稿',

  components: '组件', properties: '组件属性', form: '表单属性', empty: '从左侧拖入或点选组件进行表单设计',
  preview: '运行', json: '查看 JSON', export: '导出 Vue 文件', copyCode: '复制代码', clear: '清空',
  import: '导入 JSON', apply: '应用', cancel: '取消', close: '关闭', copy: '复制', remove: '删除',
  up: '上移', down: '下移', name: '字段名', label: '标题', placeholder: '占位提示', required: '必填',
  disabled: '禁用', span: '栅格宽度', defaultValue: '默认值', options: '选项配置', applyOptions: '应用选项',
  multiple: '多选', min: '最小值', max: '最大值', step: '步长', layout: '标签布局', size: '组件尺寸',
  horizontal: '水平', vertical: '垂直', inline: '行内', mini: '迷你', small: '小', medium: '中', large: '大',
  submit: '提交', reset: '重置', result: '表单数据', option: '选项', selectField: '选择一个组件编辑属性',
  invalid: '配置无效：字段名须唯一且以字母或下划线开头；请检查字段类型、默认值和数值范围。',
  invalidImport: '导入失败。请使用本设计器导出的 Arco JSON；不支持旧版 Element JSON。',
  invalidOptions: '选项须为包含 label 和 value 的 JSON 数组；级联选项可包含 children。',
  changeTypeConfirm: '切换组件类型将移除此容器内的所有组件，是否继续？', clearConfirm: '确定清空当前表单？', importConfirm: '导入将替换当前表单，是否继续？',
  saved: '草稿自动保存在当前浏览器', storageError: '无法保存草稿，请导出 JSON 备份。',
  restoreError: '已保存的草稿无法读取，请从 JSON 备份重新导入。',
  copied: '代码已复制', copyFailed: '浏览器不允许复制，请下载 Vue 文件。',
  uploadTip: '上传控件仅选择文件，不自动发送。导出后请配置实际上传接口。',
  requiredMessage: '请填写或选择：', downloadJson: '导出 JSON',
  input: '单行文本', textarea: '多行文本', password: '密码', number: '计数器', select: '下拉选择',
  cascader: '级联选择', radio: '单选框组', checkbox: '多选框组', switch: '开关', slider: '滑块',
  time: '时间选择', timeRange: '时间范围', date: '日期选择', dateRange: '日期范围', rate: '评分',
  color: '颜色选择', upload: '上传'
}
export type TranslationKey = keyof typeof zh
const en: Record<keyof typeof zh, string> = {
  canvasView: 'Canvas', propertiesView: 'Properties', compactEmpty: 'Choose a control in Components to start building your form', workspaceViews: 'Designer workspace', basicProperties: 'Basic properties', controlProperties: 'Control settings',
  columnAction: 'Action', columnActionName: 'Action name', columnActionLabel: 'Action label', addColumnAction: 'Add action button', removeColumnAction: 'Remove action',
  selectionMin: 'Min selections', selectionMax: 'Max selections', unsavedDraft: 'Changes are not saved. Correct the configuration to continue.', notSaved: 'Changes not saved', desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile', previewTip: 'Preview viewport width', applyJson: 'Apply JSON', codeEditNote: 'Code edits apply to copy and download in this window. They do not change the design canvas.', primaryStyle: 'Primary', secondaryStyle: 'Secondary', outlineStyle: 'Outline', dashedStyle: 'Dashed', textStyle: 'Text', normalStatus: 'Normal', warningStatus: 'Warning', successStatus: 'Success', dangerStatus: 'Danger', squareShape: 'Square', roundShape: 'Round', circleShape: 'Circle', startAlign: 'Start', endAlign: 'End', centerAlign: 'Center', spaceBetween: 'Space between', spaceAround: 'Space around', stretchAlign: 'Stretch', clickTrigger: 'Click', hoverTrigger: 'Hover', weekMode: 'Week', monthMode: 'Month', quarterMode: 'Quarter', yearMode: 'Year', pictureList: 'Picture list', pictureCardList: 'Picture cards', normalButton: 'Normal button', icon: 'Icon', selectIcon: 'Select icon', loading: 'Loading', long: 'Full width', booleanValue: 'Boolean', numberValue: 'Number', textValue: 'Text', valueType: 'Value type', pathMode: 'Full path', checkStrictly: 'Independent selection', expandTrigger: 'Expand trigger', showInput: 'Show input', showFileList: 'File list', hideButton: 'Hide upload button', bordered: 'Bordered', stripe: 'Striped', hoverable: 'Hover effect', startPlaceholder: 'Start placeholder', endPlaceholder: 'End placeholder', row: 'Row container', richtext: 'Rich text', button: 'Button', table: 'Table', inputGroup: 'Input components', selectGroup: 'Selection components', layoutGroup: 'Layout components', designer: 'Form designer', componentType: 'Component', showLabel: 'Show label', labelWidth: 'Label width', inherit: 'Inherit form', labelAlign: 'Label alignment', left: 'Left', right: 'Right', gutter: 'Grid gutter', formButtons: 'Form buttons', dragField: 'Drag component', rowEmpty: 'Drop components into this row', optionLabel: 'Option label', optionValue: 'Value', addOption: 'Add option', addChild: 'Add child option', optionsJson: 'Advanced: options JSON', dataSource: 'Data source', remoteOptions: 'Remote data', requestUrl: 'Endpoint', requestMethod: 'Method', dataPath: 'Data path', labelKey: 'Label key', valueKey: 'Value key', childrenKey: 'Children key', requestBody: 'Body JSON', remoteTip: 'The canvas uses local sample data. Remote data loads at runtime.', columns: 'Table columns', column: 'Column', addColumn: 'Add column', tableData: 'Table data JSON', width: 'Width', invalidRows: 'Table data must be a JSON array of objects.', validation: 'Validation rules', pattern: 'Regular expression (without /)', validationMessage: 'Error message', addRule: 'Add rule', allowClear: 'Clearable', readonly: 'Read only', readOnly: 'Read only', maxLength: 'Max length', showWordLimit: 'Word count', prefix: 'Prefix', suffix: 'Suffix', prepend: 'Prepend', append: 'Append', prefixIcon: 'Prefix icon', suffixIcon: 'Suffix icon', precision: 'Precision', allowSearch: 'Searchable', range: 'Range', showTicks: 'Show ticks', type: 'Style', direction: 'Direction', mode: 'Picker mode', format: 'Display format', valueFormat: 'Value format', showTime: 'Select time', allowHalf: 'Half rating', showText: 'Show text', showAlpha: 'Alpha channel', colorFormat: 'Color format', checkedText: 'On text', uncheckedText: 'Off text', checkedValue: 'On value', uncheckedValue: 'Off value', action: 'Upload URL', accept: 'File types', limit: 'File limit', maxSizeMB: 'Max file MB', listType: 'List style', autoUpload: 'Auto upload', height: 'Editor height', status: 'Status', shape: 'Shape', buttonAction: 'Action', justify: 'Justify', align: 'Align', minRows: 'Min rows', maxRows: 'Max rows', viewCode: 'View code', canvas: 'Design canvas', codeTip: 'Vue 3 single-file component · Arco Design', count: 'components', emptyTitle: 'Start building your form', draft: 'Local draft',

  components: 'Components', properties: 'Field properties', form: 'Form properties', empty: 'Drag or select a component to design your form',
  preview: 'Preview', json: 'View JSON', export: 'Export Vue file', copyCode: 'Copy code', clear: 'Clear',
  import: 'Import JSON', apply: 'Apply', cancel: 'Cancel', close: 'Close', copy: 'Duplicate', remove: 'Delete',
  up: 'Move up', down: 'Move down', name: 'Field name', label: 'Label', placeholder: 'Placeholder', required: 'Required',
  disabled: 'Disabled', span: 'Grid width', defaultValue: 'Default value', options: 'Options', applyOptions: 'Apply options',
  multiple: 'Multiple', min: 'Minimum', max: 'Maximum', step: 'Step', layout: 'Label layout', size: 'Size',
  horizontal: 'Horizontal', vertical: 'Vertical', inline: 'Inline', mini: 'Mini', small: 'Small', medium: 'Medium', large: 'Large',
  submit: 'Submit', reset: 'Reset', result: 'Form data', option: 'Option', selectField: 'Select a field to edit its properties',
  invalid: 'Invalid configuration. Field names must be unique identifiers. Check types, defaults and numeric limits.',
  invalidImport: 'Import failed. Use Arco JSON exported by this designer. Legacy Element JSON is not supported.',
  invalidOptions: 'Options must be a JSON array with label and value. Cascader options may include children.',
  changeTypeConfirm: 'Changing this container type will remove its child components. Continue?', clearConfirm: 'Clear the current form?', importConfirm: 'Replace the current form with imported JSON?',
  saved: 'Draft saved automatically in this browser', storageError: 'Draft could not be saved. Export JSON as a backup.',
  restoreError: 'The saved draft could not be read. Import a JSON backup to recover it.',
  copied: 'Code copied', copyFailed: 'Clipboard access denied. Download the Vue file instead.',
  uploadTip: 'Files are selected locally, without automatic upload. Configure an upload endpoint after export.',
  requiredMessage: 'Please enter or select: ', downloadJson: 'Export JSON',
  input: 'Input', textarea: 'Textarea', password: 'Password', number: 'Number', select: 'Select', cascader: 'Cascader',
  radio: 'Radio group', checkbox: 'Checkbox group', switch: 'Switch', slider: 'Slider', time: 'Time picker',
  timeRange: 'Time range', date: 'Date picker', dateRange: 'Date range', rate: 'Rate', color: 'Color picker', upload: 'Upload'
}
export const locale = ref('zh-CN')
export const arcoLocale = computed(() => locale.value === 'en-US' ? enUS : zhCN)
export const t = (key: keyof typeof zh) => (locale.value === 'en-US' ? en : zh)[key]
export function applyAppearance(data: { locale?: string, dark?: boolean, primary?: Record<string, string> }) {
  locale.value = data.locale === 'en-US' ? 'en-US' : 'zh-CN'
  document.documentElement.lang = locale.value
  if (data.dark) document.body.setAttribute('arco-theme', 'dark')
  else document.body.removeAttribute('arco-theme')
  for (let index = 1; index <= 10; index++) {
    const color = data.primary?.[String(index)]
    if (color && /^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(color)) document.body.style.setProperty(`--primary-${index}`, color)
  }
}
