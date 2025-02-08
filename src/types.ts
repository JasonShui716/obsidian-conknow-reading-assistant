export interface TextinOCRSettings {
    serverUrl: string;
    textinApiId: string;
    textinApiSecret: string;
}

export interface CanvasElement {
    id: string;
}

export interface CanvasEdgeIntermediate {
    fromOrTo: string;
    side: string;
    node: CanvasElement;
}

export const DEFAULT_SETTINGS: TextinOCRSettings = {
    serverUrl: 'https://api.textin.com/ai/service/v1/pdf_to_markdown',
    textinApiId: '',
    textinApiSecret: ''
} 