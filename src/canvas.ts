import { Canvas } from 'obsidian';
import { CanvasEdgeIntermediate } from './types';

export const addEdge = (
    canvas: any,
    edgeID: string,
    fromEdge: CanvasEdgeIntermediate,
    toEdge: CanvasEdgeIntermediate
) => {
    if (!canvas) return;

    const data = canvas.getData();

    if (!data) return;

    canvas.importData({
        edges: [
            ...data.edges,
            {
                id: edgeID,
                fromNode: fromEdge.node.id,
                fromSide: fromEdge.side,
                toNode: toEdge.node.id,
                toSide: toEdge.side
            }
        ],
        nodes: data.nodes
    });

    canvas.requestFrame();
}

export const createTextNode = (canvas: any, text: string, x: number, y: number, width: number, height: number) => {
    return canvas.createTextNode({
        text: text,
        pos: {
            x: x,
            y: y
        },
        size: {
            width: width,
            height: height
        },
        focus: false
    });
}

export const calculateNodeDimensions = (textLength: number) => {
    const minWidth = 200;
    const maxWidth = 600;
    const width = Math.min(maxWidth, Math.max(minWidth, textLength * 10));
    const height = Math.round(width * 1.5);
    return { width, height };
} 