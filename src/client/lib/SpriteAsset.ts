/**
 * Loads an image and slices it into a `cols × rows` grid of `<canvas>` tiles.
 * `random` shuffles the tiles (Curvytron randomises the bonus↔icon mapping per load).
 * Vendored replacement for `tom32i-asset-loader.js`.
 */
export class SpriteAsset {
  src: string;
  cols: number;
  rows: number;
  random: boolean;
  loaded = false;
  image: HTMLImageElement;
  width = 0;
  height = 0;

  constructor(src: string, cols: number, rows: number, onload: () => void, random = false) {
    this.src = src;
    this.cols = cols;
    this.rows = rows;
    this.random = random;
    this.image = new Image();
    this.image.src = src;
    this.image.onload = () => {
      this.loaded = true;
      this.width = this.image.width / this.cols;
      this.height = this.image.height / this.rows;
      onload();
    };
  }

  getImages(): HTMLCanvasElement[] {
    if (!this.loaded) {
      return [];
    }

    const images: HTMLCanvasElement[] = [];
    for (let i = 0; i < this.cols * this.rows; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      const context = canvas.getContext('2d') as CanvasRenderingContext2D;
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      context.drawImage(
        this.image,
        col * this.width,
        row * this.height,
        this.width,
        this.height,
        0,
        0,
        this.width,
        this.height,
      );
      images.push(canvas);
    }

    if (this.random) {
      images.sort(() => Math.random() - 0.5);
    }

    return images;
  }
}
