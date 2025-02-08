import { App, Editor, MarkdownView, Menu, MenuItem, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, Canvas } from 'obsidian';

interface TextinOCRSettings {
	serverUrl: string;
	textinApiId: string;
	textinApiSecret: string;
}

const DEFAULT_SETTINGS: TextinOCRSettings = {
	serverUrl: 'https://api.textin.com/ai/service/v1/pdf_to_markdown',
	textinApiId: '',
	textinApiSecret: ''
}

// 辅助函数：将 ArrayBuffer 转换为 Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return window.btoa(binary);
}

export default class ConknowReadingAssistant extends Plugin {
	settings: TextinOCRSettings;

	async onload() {
		await this.loadSettings();

		// 添加设置选项卡
		this.addSettingTab(new ConknowSettingTab(this.app, this));

		// 注册文件菜单事件（用于常规笔记中的图片）
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) return;

				const editor = activeView.editor;
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);

				// 检查光标是否在图片链接上
				const imageRegex = /!\[\[(.*?)\]\]/;
				const match = line.match(imageRegex);
				
				if (match) {
					menu.addItem((item) => {
						item
							.setTitle('OCR解析')
							.setIcon('file-text')
							.onClick(async () => {
								const imagePath = match[1].trim();
								await this.processImage(imagePath, editor, cursor.line);
							});
					});
				}
			})
		);

		// 注册 Canvas 菜单事件
		this.registerEvent(
			this.app.workspace.on('canvas:node-menu', (menu: Menu, node: any, canvas: any) => {
				console.log('Canvas menu triggered:', {
					nodeType: node?.type,
					fileType: node?.file?.extension,
					isFile: node?.file instanceof TFile,
					node: node,
					canvas: canvas
				});

				// 修改判断条件，只要是 TFile 且是支持的文件类型即可
				if (node?.file instanceof TFile && 
					['png', 'jpg', 'jpeg', 'gif', 'bmp', 'pdf'].includes(node?.file?.extension)) {
					
					console.log('Node is an image file, adding menu item');
					
					menu.addItem((item: MenuItem) => {
						item
							.setTitle('OCR解析')
							.setIcon('file-text')
							.onClick(async () => {
								console.log('OCR menu item clicked');
								try {
									// 获取图片路径
									const imagePath = node.file.path;
									
									// 调用 OCR API 处理图片
									const ocrResult = await this.processImageForCanvas(imagePath);
									if (!ocrResult) {
										throw new Error('OCR 处理失败');
									}
									
									// 获取 canvas 实例
									if (!node.canvas) {
										throw new Error('无法获取 Canvas 实例');
									}

									console.log('Creating node with OCR result');
									
									// 计算文本节点的合适大小
									const minWidth = 200;  // 最小宽度
									const maxWidth = 600;  // 最大宽度
									
									// 根据文本长度计算合适的宽度
									const textLength = ocrResult.length;
									let width = Math.min(maxWidth, Math.max(minWidth, textLength * 10));
									
									// 按2:3的比例计算高度
									let height = Math.round(width * 1.5);  // 1.5 = 3/2，保持2:3的比例
									
									// 创建新节点
									const textNode = node.canvas.createTextNode({
										text: ocrResult,
										pos: {
											x: node.x + node.width + 50,
											y: node.y
										},
										size: {
											width: width,
											height: height
										},
										focus: false
									});

									// 添加节点
									node.canvas.addNode(textNode);

									new Notice('OCR 结果节点创建成功');
								} catch (error) {
									console.error('创建节点失败:', error);
									console.log('当前环境:', {
										node: node,
										canvas: node.canvas
									});
									new Notice('创建节点失败: ' + error.message);
								}
							});
					});
				} else {
					console.log('Node is not an image file or does not meet criteria:', {
						isFile: node?.file instanceof TFile,
						extension: node?.file?.extension
					});
				}
			})
		);

		// 尝试其他可能的 Canvas 事件
		this.registerEvent(
			this.app.workspace.on('canvas:node-context-menu', (menu: Menu, node: any) => {
				console.log('Canvas context menu triggered:', {
					nodeType: node?.type,
					fileType: node?.file?.extension,
					isFile: node?.file instanceof TFile,
					node: node
				});
			})
		);

		this.registerEvent(
			this.app.workspace.on('canvas:selection-menu', (menu: Menu, canvas: any) => {
				console.log('Canvas selection menu triggered');
				const selectedNodes = canvas?.getSelectedNodes();
				console.log('Selected nodes:', selectedNodes);
			})
		);
	}

	// 处理 Canvas 中的图片
	async processImageForCanvas(imagePath: string): Promise<string | null> {
		const loadingNotice = new Notice('正在进行 OCR 解析，请稍候...', 0);
		try {
			const result = await this.sendToTextin(imagePath);
			loadingNotice.hide();
			new Notice('OCR 解析完成');
			return result;
		} catch (error) {
			loadingNotice.hide();
			new Notice('处理失败：' + (error as Error).message);
			return null;
		}
	}

	// 处理常规笔记中的图片
	async processImage(imagePath: string, editor: Editor, line: number) {
		const loadingNotice = new Notice('正在进行 OCR 解析，请稍候...', 0);
		try {
			const result = await this.sendToTextin(imagePath);
			// 在图片下方插入OCR结果
			editor.replaceRange('\n' + result + '\n', 
				{ line: line + 1, ch: 0 }, 
				{ line: line + 1, ch: 0 }
			);
			loadingNotice.hide();
			new Notice('OCR 解析完成');
		} catch (error) {
			loadingNotice.hide();
			new Notice('处理失败：' + (error as Error).message);
		}
	}

	// 发送到 Textin API 处理
	async sendToTextin(imagePath: string): Promise<string> {
		if (!this.settings.textinApiId || !this.settings.textinApiSecret) {
			throw new Error('请先配置 Textin API ID 和 Secret');
		}

		// 获取图片文件
		const file = this.app.vault.getAbstractFileByPath(imagePath);
		if (!file) {
			throw new Error('找不到图片文件：' + imagePath);
		}

		// 读取图片数据
		const arrayBuffer = await this.app.vault.readBinary(file as TFile);

		// 准备请求头
		const headers = {
			'Content-Type': 'application/octet-stream',
			'x-ti-app-id': this.settings.textinApiId,
			'x-ti-secret-code': this.settings.textinApiSecret
		};

		// 发送请求
		const response = await fetch(this.settings.serverUrl, {
			method: 'POST',
			headers: headers,
			body: arrayBuffer
		});

		if (!response.ok) {
			throw new Error('上传失败：' + response.statusText);
		}

		const result = await response.json();
		
		if (result.code !== 200) {
			throw new Error('API 返回错误：' + result.message);
		}

		return result.result.markdown;
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ConknowSettingTab extends PluginSettingTab {
	plugin: ConknowReadingAssistant;

	constructor(app: App, plugin: ConknowReadingAssistant) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Conknow阅读助手设置'});

		new Setting(containerEl)
			.setName('API 地址')
			.setDesc('Textin OCR API 地址')
			.addText(text => text
				.setPlaceholder('输入 API 地址')
				.setValue(this.plugin.settings.serverUrl)
				.onChange(async (value) => {
					this.plugin.settings.serverUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API ID')
			.setDesc('输入您的 Textin API ID')
			.addText(text => text
				.setPlaceholder('输入 API ID')
				.setValue(this.plugin.settings.textinApiId)
				.onChange(async (value) => {
					this.plugin.settings.textinApiId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API Secret')
			.setDesc('输入您的 Textin API Secret')
			.addText(text => text
				.setPlaceholder('输入 API Secret')
				.setValue(this.plugin.settings.textinApiSecret)
				.onChange(async (value) => {
					this.plugin.settings.textinApiSecret = value;
					await this.plugin.saveSettings();
				}));
	}
}

// 辅助函数：生成随机ID
function generateId(): string {
	const t = [];
	for (let n = 0; n < 16; n++) {
		t.push((16 * Math.random() | 0).toString(16));
	}
	return t.join("");
} 