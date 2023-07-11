import {DiagramConfig, Rect, RendererEvent, Contact, Text} from "./renderer-data";
import canvasTxt from 'canvas-txt'


export enum RenderersTypes {
    Size = "size",
    Rect = "rect",
    Text = "text",
    Line = "line",
    Contact = "contact",
}

const BLOCK_SIZE = 60;

interface Renderer {
    execute(event: RendererEvent): void


}

interface RendererContext {
    getContext(): CanvasRenderingContext2D

    getCanvas(): HTMLCanvasElement
}

interface ScaleContext {
    getPixelInCell(): number

}


abstract class BaseRenderer implements Renderer, RendererContext, ScaleContext {
    private context: CanvasRenderingContext2D;


    constructor(private canvas: HTMLCanvasElement, private pixelInCell: number) {

        this.context = canvas.getContext('2d');
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }


    getContext(): CanvasRenderingContext2D {
        return this.context;
    }

    getPixelInCell(): number {
        return this.pixelInCell;
    }

    abstract execute(event: RendererEvent): void;
}

class BaseRendererImpl extends BaseRenderer {
    execute(event: RendererEvent): void {
    }


}

class RenderRect extends BaseRenderer {

    execute(event: RendererEvent) {
        const rect: Rect = event.conf
        this.getContext().fillStyle = rect.color;

        let scale = this.getPixelInCell();
        this.getContext().fillRect(rect.x * scale, rect.y * scale, rect.width * scale, rect.height * scale);
    }
}

class RenderContact extends BaseRenderer {

    execute(event: RendererEvent) {
        console.log("OK contact", event)
        const contact: Contact = event.conf
        let context = this.getContext();
        context.fillStyle = "black";

        let scale = this.getPixelInCell();


// Define the polygon vertices
        const startPoint = {x: contact.first.x * scale, y: contact.first.y * scale}
        const endPoint = {x: contact.second.x * scale, y: contact.second.y * scale}

        const topPoints = [
            startPoint,
            endPoint
        ]
        const bottomPoints = [
            {x: endPoint.x, y: endPoint.y + scale},
            {x: startPoint.x, y: startPoint.y + scale}]

        let rightArrow =  contact.second?[{x: endPoint.x + scale / 2, y: endPoint.y + scale / 2}]:[];
        let leftArrow = contact.first?[{x: startPoint.x - scale / 2, y: startPoint.y + scale / 2}]:[];
        var vertices = [
            ...topPoints,
           ...rightArrow,
            ...bottomPoints,
            ...leftArrow
        ];


        context.beginPath();


        context.moveTo(vertices[0].x, vertices[0].y);


        for (var i = 1; i < vertices.length; i++) {
            context.lineTo(vertices[i].x, vertices[i].y);
        }


        context.closePath();


        context.strokeStyle = "white";
        context.fillStyle = "blue";


        context.stroke();
        context.fill();


    }
}

class RenderText extends BaseRenderer {

    execute(event: RendererEvent) {
        let scale = this.getPixelInCell();
        const txData: Text = event.conf
        let ctx = this.getContext();
        ctx.fillStyle = txData.color;
        ctx.imageSmoothingEnabled = true;


        let x1 = txData.point.x * scale;
        let y1 = txData.point.y * scale;
        let scaleWidth = txData.maxWidth * scale
        canvasTxt.fontWeight = txData.bold ? "bold" : "normal";

        canvasTxt.font = "sans-serif"
        canvasTxt.fontSize = txData.size
        canvasTxt.align = 'left'
        canvasTxt.vAlign = 'top'
        canvasTxt.lineHeight = txData.size
        canvasTxt.debug = false
        canvasTxt.justify = false
        if (txData.vertical) {
            ctx.save();
            ctx.translate(x1, y1);
            ctx.rotate(Math.PI / 2);
            ctx.translate(-x1, -y1);
            canvasTxt.drawText(ctx, txData.text, x1, y1, scaleWidth, 1000) // todo remove hardcode height
            ctx.restore();
        } else {
            canvasTxt.drawText(ctx, txData.text, x1, y1, scaleWidth, 1000) // todo remove hardcode height
        }
    }
}

class SetSizeCanvas extends BaseRenderer {

    execute(event: RendererEvent) {
        this.getCanvas().width = event.conf.width * this.getPixelInCell();
        this.getCanvas().height = event.conf.height * this.getPixelInCell();
    }
}


export class RendererController implements Renderer {
    renderersMap: { [key: string]: Renderer } = {}

    constructor(private canvas: HTMLCanvasElement, private pixelInCell: number) {
        this.registerRenderer(RenderersTypes.Rect, RenderRect)
        this.registerRenderer(RenderersTypes.Size, SetSizeCanvas)
        this.registerRenderer(RenderersTypes.Text, RenderText)
        this.registerRenderer(RenderersTypes.Contact, RenderContact)
    }

    public registerRenderer(key: string, renderer: typeof BaseRenderer) {
        // @ts-ignore
        this.renderersMap[key] = new renderer(this.canvas, this.pixelInCell);
    }

    execute(conf: RendererEvent): void {
        let renderer = this.renderersMap[conf.type];
        if (renderer) {
            renderer.execute(conf);
        } else {
            console.log("No renderer for type: " + conf.type)
        }
    }
}


export function diagramConfigToStream(config: DiagramConfig): RendererEvent[] {
    const events = []


    events.push({
        type: "size",
        conf: config.diagramSize
    })

    config.lines.forEach(line => {
        events.push({
            type: "line",
            conf: line
        })
    })

    config.modules.forEach(module => {
        events.push({
            type: "rect",
            conf: module
        })
    })

    config.contacts.forEach(contact => {
        events.push({
            type: "contact",
            conf: contact
        })
    })

    config.texts.forEach(text => {
        events.push({
            type: "text",
            conf: text
        })
    })


    return events;


}
