import { App, Editor, MarkdownView, Menu, MenuItem, Notice, Plugin, TFile } from 'obsidian';
import { ConknowSettings, DEFAULT_SETTINGS } from './settings';
import { ConknowSettingTab } from './settings';
import { addEdge, createTextNode, calculateNodeDimensions } from './canvas';
import { randomHexString } from './utils';

export default class ConknowReadingAssistant extends Plugin {
	settings: ConknowSettings;

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

					menu.addItem((item) => {
						item
							.setTitle('OCR解析并解读')
							.setIcon('brain')
							.onClick(async () => {
								const imagePath = match[1].trim();
								await this.processImageWithAI(imagePath, editor, cursor.line);
							});
					});
				}
			})
		);

		// 注册 Canvas 菜单事件
		this.registerEvent(
			this.app.workspace.on('canvas:node-menu', (menu: Menu, node: any, canvas: any) => {
				// 处理图片节点
				if (node?.file instanceof TFile && 
					['png', 'jpg', 'jpeg', 'gif', 'bmp', 'pdf'].includes(node?.file?.extension)) {
					
					menu.addItem((item: MenuItem) => {
						item
							.setTitle('OCR解析')
							.setIcon('file-text')
							.onClick(async () => {
								try {
									const imagePath = node.file.path;
									const ocrResult = await this.processImageForCanvas(imagePath);
									if (!ocrResult) {
										throw new Error('OCR 处理失败');
									}
									
									if (!node.canvas) {
										throw new Error('无法获取 Canvas 实例');
									}

									// 计算节点尺寸
									const { width, height } = calculateNodeDimensions(ocrResult.length);
									
									// 创建文本节点
									const textNode = createTextNode(
										node.canvas,
										ocrResult,
										node.x + node.width + 50,
										node.y,
										width,
										height
									);

									// 添加节点
									node.canvas.addNode(textNode);
									
									// 添加连接线
									addEdge(
										node.canvas,
										randomHexString(16),
										{
											fromOrTo: 'from',
											side: 'right',
											node: node
										},
										{
											fromOrTo: 'to',
											side: 'left',
											node: textNode
										}
									);

									new Notice('OCR 结果节点创建成功');
								} catch (error) {
									console.error('创建节点失败:', error);
									new Notice('创建节点失败: ' + (error as Error).message);
								}
							});
					});

					menu.addItem((item: MenuItem) => {
						item
							.setTitle('OCR解析并解读')
							.setIcon('brain')
							.onClick(async () => {
								try {
									const imagePath = node.file.path;
									const ocrResult = await this.processImageForCanvas(imagePath);
									if (!ocrResult) {
										throw new Error('OCR 处理失败');
									}
									
									if (!node.canvas) {
										throw new Error('无法获取 Canvas 实例');
									}

									// 计算OCR结果节点尺寸
									const { width: ocrWidth, height: ocrHeight } = calculateNodeDimensions(ocrResult.length);
									
									// 创建OCR结果节点
									const ocrNode = createTextNode(
										node.canvas,
										ocrResult,
										node.x + node.width + 50,
										node.y,
										ocrWidth,
										ocrHeight
									);

									// 添加OCR结果节点
									node.canvas.addNode(ocrNode);
									
									// 添加连接线
									addEdge(
										node.canvas,
										randomHexString(16),
										{
											fromOrTo: 'from',
											side: 'right',
											node: node
										},
										{
											fromOrTo: 'to',
											side: 'left',
											node: ocrNode
										}
									);

									new Notice('OCR 结果节点创建成功，正在进行 AI 解读...');

									// 进行AI解读
									await this.createAIAnalysisNode(node.canvas, ocrNode, ocrResult);
								} catch (error) {
									console.error('创建节点失败:', error);
									new Notice('创建节点失败: ' + (error as Error).message);
								}
							});
					});
				}

				// 处理文本节点（添加AI解读功能）
				if (node?.text) {
					const models = [
						{ name: 'o1', value: 'o1' },
						{ name: 'o1-mini', value: 'o1-mini' },
						{ name: 'o1-preview', value: 'o1-preview' },
						{ name: 'gpt-4o', value: 'gpt-4o' },
						{ name: 'deepseek-chat', value: 'deepseek-chat' },
						{ name: 'deepseek-reasoner', value: 'deepseek-reasoner' }
					];

					models.forEach(model => {
						menu.addItem((item: MenuItem) => {
							item
								.setTitle(`AI解读 - ${model.name}`)
								.setIcon(model.value === this.settings.deepseekModel ? 'check' : 'brain')
								.onClick(async () => {
									try {
										if (!node.canvas) {
											throw new Error('无法获取 Canvas 实例');
										}
										await this.createAIAnalysisNode(node.canvas, node, node.text, model.value);
									} catch (error) {
										console.error('创建AI解读节点失败:', error);
										new Notice('创建AI解读节点失败: ' + (error as Error).message);
									}
								});
						});
					});
				}
			})
		);
	}

	// 创建AI解读节点
	async createAIAnalysisNode(canvas: any, sourceNode: any, text: string, modelOverride?: string) {
		const aiResult = await this.sendToDeepseek(text, modelOverride);
		if (!aiResult) {
			throw new Error('AI 解读失败');
		}

		// 计算AI解读结果节点尺寸
		const { width: aiWidth, height: aiHeight } = calculateNodeDimensions(aiResult.length);
		
		// 创建AI解读结果节点
		const aiNode = createTextNode(
			canvas,
			aiResult,
			sourceNode.x + sourceNode.width + 50,
			sourceNode.y,
			aiWidth,
			aiHeight
		);

		// 添加AI解读结果节点
		canvas.addNode(aiNode);
		
		// 添加连接线
		addEdge(
			canvas,
			randomHexString(16),
			{
				fromOrTo: 'from',
				side: 'right',
				node: sourceNode
			},
			{
				fromOrTo: 'to',
				side: 'left',
				node: aiNode
			}
		);

		new Notice('AI 解读结果节点创建成功');
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

	// 处理图片并使用AI解读
	async processImageWithAI(imagePath: string, editor: Editor, line: number) {
		const loadingNotice = new Notice('正在进行 OCR 解析和 AI 解读，请稍候...', 0);
		try {
			const ocrResult = await this.sendToTextin(imagePath);
			const aiResult = await this.sendToDeepseek(ocrResult);
			editor.replaceRange('\n' + ocrResult + '\n\n**AI解读：**\n' + aiResult + '\n', 
				{ line: line + 1, ch: 0 }, 
				{ line: line + 1, ch: 0 }
			);
			loadingNotice.hide();
			new Notice('OCR 解析和 AI 解读完成');
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

		const file = this.app.vault.getAbstractFileByPath(imagePath);
		if (!file) {
			throw new Error('找不到图片文件：' + imagePath);
		}

		const arrayBuffer = await this.app.vault.readBinary(file as TFile);

		const headers = {
			'Content-Type': 'application/octet-stream',
			'x-ti-app-id': this.settings.textinApiId,
			'x-ti-secret-code': this.settings.textinApiSecret
		};

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

	// 转换数学公式格式
	private convertMathFormula(text: string): string {
		// 处理多行公式 \[ ... \]
		text = text.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '$$\n$1\n$$');
		
		// 处理行内公式 \( ... \)
		text = text.replace(/\\\((.*?)\\\)/g, '$$$1$$');
		
		// 处理其他可能的公式格式
		text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
			// 移除多余的空格
			formula = formula.trim();
			// 确保公式前后有换行
			return '\n$$\n' + formula + '\n$$\n';
		});

		return text;
	}

	// 发送到 Deepseek API 处理
	async sendToDeepseek(text: string, modelOverride?: string): Promise<string> {
		if (!this.settings.deepseekApiKey) {
			throw new Error('请先配置 Deepseek API Key');
		}

		const headers = {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${this.settings.deepseekApiKey}`
		};

		const body = {
			model: modelOverride || this.settings.deepseekModel,
			messages: [
				{
					role: 'user',
					content: this.settings.deepseekSystemPrompt + '\n\n' + text
				}
			]
		};

		console.log('发送到 Deepseek 的请求:', {
			url: `${this.settings.deepseekBaseUrl}/chat/completions`,
			headers: {...headers, 'Authorization': 'Bearer ****'},
			body: body
		});

		const response = await fetch(`${this.settings.deepseekBaseUrl}/chat/completions`, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(body)
		});

		console.log('Deepseek API 响应状态:', response.status, response.statusText);
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('Deepseek API 错误响应:', errorText);
			throw new Error('API 请求失败：' + response.statusText + '\n' + errorText);
		}

		const responseText = await response.text();
		console.log('Deepseek API 原始响应:', responseText);

		try {
			const result = JSON.parse(responseText);
			
			if (!result.choices || !result.choices[0] || !result.choices[0].message) {
				console.error('Deepseek API 返回格式异常:', result);
				throw new Error('API 返回格式错误');
			}

			// 转换数学公式格式
			return this.convertMathFormula(result.choices[0].message.content);
		} catch (error) {
			console.error('解析 Deepseek API 响应失败:', error);
			throw error;
		}
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