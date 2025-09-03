export default class SpriteAsset {
    constructor(src, cols, rows, onload, random) {
        this.src = src;
        this.cols = cols;
        this.rows = rows;
        this.onload = onload;
        this.random = random;
        this.loaded = false;
        this.image = new Image();
        this.image.src = this.src;
        this.image.onload = () => {
            this.loaded = true;
            this.width = this.image.width / this.cols;
            this.height = this.image.height / this.rows;
            this.onload();
        };
    }

    getImages() {
        if (!this.loaded) {
            return [];
        }

        const images = [];
        for (let i = 0; i < this.cols * this.rows; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = this.width;
            canvas.height = this.height;
            const context = canvas.getContext('2d');
            const col = i % this.cols;
            const row = Math.floor(i / this.cols);
            context.drawImage(this.image, col * this.width, row * this.height, this.width, this.height, 0, 0, this.width, this.height);
            images.push(canvas);
        }

        if (this.random) {
            images.sort(() => Math.random() - 0.5);
        }

        return images;
    }
}
