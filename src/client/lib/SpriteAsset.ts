import { Asset } from './Asset.ts';
import { AssetCanvas } from './AssetCanvas.ts';

/**
 * Sprite Asset
 */
export class SpriteAsset {
    source: any;
    columns: any;
    rows: any;
    callback: any;
    length: number;
    width: number;
    height: number;
    images: any[];
    assets: any[];
    loaded: number;
    canvas?: AssetCanvas;

    constructor(source: any, columns: any, rows: any, callback: any, load?: any) {
        this.source = source;
        this.columns = columns;
        this.rows = rows;
        this.callback = callback;
        this.length = columns * rows;

        this.width = 0;
        this.height = 0;
        this.images = [];
        this.assets = [];
        this.loaded = 0;

        this.preLoaded = this.preLoaded.bind(this);
        this.partLoaded = this.partLoaded.bind(this);

        this.createImages();

        if (load !== undefined && load) {
            this.load();
        }
    }

    /**
     * Load
     */
    load() {
        const sprite = new Asset(this.source, this.preLoaded.bind(this));

        this.source = sprite.getImage();

        sprite.load();
    }

    /**
     * Create images
     */
    createImages() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
                const asset = new Asset(null, this.partLoaded);
                this.assets.push({ asset, row, col });
                this.images.push(asset.getImage());
            }
        }
    }

    /**
     * On sprite preloaded
     */
    preLoaded(e: any) {
        this.width = this.source.width / this.columns;
        this.height = this.source.height / this.rows;
        this.canvas = new AssetCanvas(this.width, this.height);

        let i, assetData, asset, x, y;

        for (i = this.assets.length - 1; i >= 0; i--) {
            assetData = this.assets[i];
            asset = assetData.asset;
            x = assetData.col * this.width;
            y = assetData.row * this.height;

            this.canvas.clear();
            this.canvas.drawImageFromSource(this.source, x, y);

            asset.setSource(this.canvas.toString());
            asset.load();
        }

        delete this.canvas;
    }

    /**
     * On a sub image is loaded
     */
    partLoaded(e: any) {
        this.loaded++;

        if (this.loaded === this.images.length) {
            this.callback.call();
        }
    }

    /**
     * Get images
     */
    getImages() {
        return this.images;
    }
}
