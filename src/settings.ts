import { App, PluginSettingTab, Setting } from 'obsidian';
import ConknowReadingAssistant from './main';

export interface ConknowSettings {
    serverUrl: string;
    textinApiId: string;
    textinApiSecret: string;
    deepseekBaseUrl: string;
    deepseekApiKey: string;
    deepseekModel: string;
    deepseekSystemPrompt: string;
}

export const DEFAULT_SETTINGS: ConknowSettings = {
    serverUrl: 'https://api.textin.com/ai/service/v1/pdf_to_markdown',
    textinApiId: '',
    textinApiSecret: '',
    deepseekBaseUrl: 'https://api.deepseek.com/v1',
    deepseekApiKey: '',
    deepseekModel: 'deepseek-reasoner',
    deepseekSystemPrompt: '你是一个专业的阅读助手，请帮我解读以下文本内容，并给出你的分析和见解：'
}

export class ConknowSettingTab extends PluginSettingTab {
    plugin: ConknowReadingAssistant;

    constructor(app: App, plugin: ConknowReadingAssistant) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Conknow阅读助手设置'});

        // Textin OCR 设置
        containerEl.createEl('h3', {text: 'Textin OCR 设置'});

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

        // Deepseek 设置
        containerEl.createEl('h3', {text: 'Deepseek AI 设置'});

        new Setting(containerEl)
            .setName('API Base URL')
            .setDesc('Deepseek API 基础地址')
            .addText(text => text
                .setPlaceholder('输入 API 基础地址')
                .setValue(this.plugin.settings.deepseekBaseUrl)
                .onChange(async (value) => {
                    this.plugin.settings.deepseekBaseUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('输入您的 Deepseek API Key')
            .addText(text => text
                .setPlaceholder('输入 API Key')
                .setValue(this.plugin.settings.deepseekApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.deepseekApiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('模型')
            .setDesc('选择使用的 Deepseek 模型')
            .addText(text => text
                .setPlaceholder('输入模型名称')
                .setValue(this.plugin.settings.deepseekModel)
                .onChange(async (value) => {
                    this.plugin.settings.deepseekModel = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('系统提示词')
            .setDesc('设置与AI对话的系统提示词')
            .addTextArea(text => text
                .setPlaceholder('输入系统提示词')
                .setValue(this.plugin.settings.deepseekSystemPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.deepseekSystemPrompt = value;
                    await this.plugin.saveSettings();
                }));
    }
} 