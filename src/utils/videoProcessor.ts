interface FaceROI {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Metrics {
    bpm: number | null;
    spo2: number | null;
    face_detected: boolean;
    quality: number;
}

export class VideoProcessor {
    private frameCount: number = 0;
    private faceROI: FaceROI | null = null;
    private isProcessing: boolean = false;
    private lastMetrics: Metrics = {
        bpm: null,
        spo2: null,
        face_detected: false,
        quality: 0.0
    };

    constructor() {
        this.reset();
    }

    public processFrame(frame: ImageData): Metrics {
        try {
            // Convert frame to grayscale for face detection
            const grayData = this.convertToGrayscale(frame);
            
            // Detect face (simplified version)
            const faceDetected = this.detectFace(grayData);
            
            if (faceDetected) {
                this.lastMetrics.face_detected = true;
                
                // Calculate SpO2
                const spo2Result = this.calculateSpO2(frame);
                if (spo2Result) {
                    this.lastMetrics.spo2 = spo2Result.spo2;
                    this.lastMetrics.quality = spo2Result.quality;
                }
            } else {
                this.lastMetrics.face_detected = false;
                this.faceROI = null;
            }
            
            this.frameCount++;
            return this.lastMetrics;

        } catch (error) {
            console.error('Error in video processing:', error);
            return this.lastMetrics;
        }
    }

    private convertToGrayscale(frame: ImageData): Uint8ClampedArray {
        const grayData = new Uint8ClampedArray(frame.width * frame.height);
        for (let i = 0; i < frame.data.length; i += 4) {
            const r = frame.data[i];
            const g = frame.data[i + 1];
            const b = frame.data[i + 2];
            grayData[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }
        return grayData;
    }

    private detectFace(grayData: Uint8ClampedArray): boolean {
        // Simplified face detection
        // In a real implementation, you would use a proper face detection library
        const brightness = grayData.reduce((sum, val) => sum + val, 0) / grayData.length;
        return brightness > 50; // Simple threshold for demonstration
    }

    private calculateSpO2(frame: ImageData): { spo2: number; quality: number } | null {
        try {
            // Extract red and blue channels
            const redChannel = new Uint8ClampedArray(frame.width * frame.height);
            const blueChannel = new Uint8ClampedArray(frame.width * frame.height);
            
            for (let i = 0; i < frame.data.length; i += 4) {
                redChannel[i / 4] = frame.data[i];
                blueChannel[i / 4] = frame.data[i + 2];
            }
            
            // Calculate mean values
            const redMean = this.calculateMean(redChannel);
            const blueMean = this.calculateMean(blueChannel);
            
            // Calculate signal quality
            const quality = this.calculateSignalQuality(redChannel, blueChannel);
            
            if (quality < 0.7) {
                return null;
            }
            
            // Calculate SpO2 (simplified version)
            const ratio = redMean / blueMean;
            const spo2 = Math.max(70, Math.min(100, 110 - (25 * ratio)));
            
            return {
                spo2,
                quality
            };
        } catch (error) {
            console.error('Error calculating SpO2:', error);
            return null;
        }
    }

    private calculateMean(data: Uint8ClampedArray): number {
        return data.reduce((sum, val) => sum + val, 0) / data.length;
    }

    private calculateSignalQuality(redChannel: Uint8ClampedArray, blueChannel: Uint8ClampedArray): number {
        const redStd = this.calculateStandardDeviation(redChannel);
        const blueStd = this.calculateStandardDeviation(blueChannel);
        
        const contrastRatio = Math.min(redStd, blueStd) / Math.max(redStd, blueStd);
        const brightnessRatio = Math.min(
            this.calculateMean(redChannel),
            this.calculateMean(blueChannel)
        ) / Math.max(
            this.calculateMean(redChannel),
            this.calculateMean(blueChannel)
        );
        
        return Math.min(1.0, Math.max(0.0, contrastRatio * 0.7 + brightnessRatio * 0.3));
    }

    private calculateStandardDeviation(data: Uint8ClampedArray): number {
        const mean = this.calculateMean(data);
        const squareDiffs = data.map(value => {
            const diff = value - mean;
            return diff * diff;
        });
        const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }

    public reset(): void {
        this.frameCount = 0;
        this.faceROI = null;
        this.isProcessing = false;
        this.lastMetrics = {
            bpm: null,
            spo2: null,
            face_detected: false,
            quality: 0.0
        };
    }

    public getMetrics(): Metrics {
        return this.lastMetrics;
    }
} 