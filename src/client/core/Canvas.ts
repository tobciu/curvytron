type Point = [number, number];

/** Thin wrapper around a `<canvas>` 2D context with scale-aware helpers. */
export class Canvas {
  static readonly twoPi = 2 * Math.PI;

  element: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  scale = 1;

  constructor(width?: number, height?: number, element?: HTMLCanvasElement) {
    this.element = element ?? document.createElement('canvas');
    this.context = this.element.getContext('2d') as CanvasRenderingContext2D;

    if (width) {
      this.setWidth(width);
    }
    if (height) {
      this.setHeight(height);
    }
  }

  setWidth(width: number): void {
    this.element.width = width;
  }

  setHeight(height: number): void {
    this.element.height = height;
  }

  setScale(scale: number): void {
    this.scale = scale;
  }

  setDimension(width: number, height: number, scale?: number, update?: boolean): void {
    width = Math.ceil(width);
    height = Math.ceil(height);

    let save: Canvas | null = null;
    if (update) {
      save = new Canvas(this.element.width, this.element.height);
      save.pastImage(this.element);
    }

    this.element.width = width;
    this.element.height = height;

    if (typeof scale !== 'undefined') {
      this.setScale(scale);
    }

    if (update && save) {
      this.drawImage(save.element, 0, 0, this.element.width, this.element.height);
      save = null;
    }
  }

  setOpacity(opacity: number): void {
    this.context.globalAlpha = opacity;
  }

  clear(): void {
    this.context.clearRect(0, 0, this.element.width, this.element.height);
  }

  color(color: string): void {
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, this.element.width, this.element.height);
  }

  clearZone(x: number, y: number, width: number, height: number): void {
    this.context.clearRect(x, y, width, height);
  }

  clearZoneScaled(x: number, y: number, width: number, height: number): void {
    this.clearZone(
      this.round(x * this.scale),
      this.round(y * this.scale),
      this.round(width * this.scale),
      this.round(height * this.scale),
    );
  }

  save(): void {
    this.context.save();
  }

  restore(): void {
    this.context.restore();
  }

  reverse(): void {
    this.context.save();
    this.context.translate(this.element.width, 0);
    this.context.scale(-1, 1);
  }

  drawImageScaled(
    image: CanvasImageSource,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.context.drawImage(
      image,
      this.round(x * this.scale),
      this.round(y * this.scale),
      this.round(width * this.scale),
      this.round(height * this.scale),
    );
  }

  drawImageScaledAngle(
    image: CanvasImageSource,
    x: number,
    y: number,
    width: number,
    height: number,
    angle: number,
  ): void {
    x = this.round(x * this.scale);
    y = this.round(y * this.scale);
    width = this.round((width / 2) * this.scale);
    height = this.round((height / 2) * this.scale);

    const centerX = x + width;
    const centerY = y + height;

    x = -width;
    y = -height;

    this.context.save();
    this.context.translate(centerX, centerY);
    this.context.rotate(angle);
    this.context.drawImage(image, x, y, width * 2, height * 2);
    this.context.restore();
  }

  drawImage(image: CanvasImageSource, x: number, y: number, width: number, height: number): void {
    this.context.drawImage(image, x, y, width, height);
  }

  drawImageTo(image: CanvasImageSource, x: number, y: number): void {
    this.context.drawImage(image, x, y);
  }

  pastImage(image: CanvasImageSource): void {
    this.context.drawImage(image, 0, 0);
  }

  drawCircle(
    x: number,
    y: number,
    radius: number,
    color: string,
    borderColor?: string,
  ): void {
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, Canvas.twoPi, false);
    this.context.fillStyle = color;
    this.context.fill();
    if (borderColor && color !== borderColor) {
      this.context.lineWidth = 5;
      this.context.strokeStyle = borderColor;
      this.context.stroke();
    }
  }

  drawLine(points: Point[], width: number, color: string, style: CanvasLineCap): void {
    if (points.length > 1) {
      this.context.lineCap = style;
      this.context.strokeStyle = color;
      this.context.lineWidth = width;
      this.context.beginPath();
      this.context.moveTo(points[0]![0], points[0]![1]);
      for (let i = 1; i < points.length; i++) {
        this.context.lineTo(points[i]![0], points[i]![1]);
      }
      this.context.stroke();
    }
  }

  drawLineScaled(points: Point[], width: number, color: string, style: CanvasLineCap): void {
    if (points.length > 1) {
      this.context.lineCap = style;
      this.context.strokeStyle = color;
      this.context.lineWidth = width * this.scale;
      this.context.beginPath();
      this.context.moveTo(points[0]![0] * this.scale, points[0]![1] * this.scale);
      for (let i = 1; i < points.length; i++) {
        this.context.lineTo(points[i]![0] * this.scale, points[i]![1] * this.scale);
      }
      this.context.stroke();
    }
  }

  toString(): string {
    return this.element.toDataURL();
  }

  round(value: number): number {
    return (0.5 + value) | 0;
  }

  roundFloat(value: number, precision = 2): number {
    const coef = Math.pow(10, precision);
    return ((0.5 + value * coef) | 0) / coef;
  }
}
