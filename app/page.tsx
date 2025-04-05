"use client";

import { useEffect, useRef } from "react";

export default function HolisticTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const setupHolistic = async () => {
      const mpHolistic = await import("@mediapipe/holistic");
      const { drawLandmarks, drawConnectors } = await import("@mediapipe/drawing_utils");
      const holistic = new mpHolistic.Holistic({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });

      holistic.setOptions({
        modelComplexity: 2,
        smoothLandmarks: true,
        enableSegmentation: false,
        refineFaceLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      holistic.onResults((results: any) => {
        const canvasElement = canvasRef.current;
        const canvasCtx = canvasElement?.getContext("2d");
        if (!canvasCtx || !canvasElement) return;

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

        const minimalStyle = {
          radius: 0.5,
          lineWidth: 0.5,
          color: 'rgba(255,255,255,0.8)',
          fillColor: 'rgba(255,255,255,0.2)',
        };
        
        drawConnectors(canvasCtx, results.poseLandmarks, mpHolistic.POSE_CONNECTIONS, minimalStyle);
        drawLandmarks(canvasCtx, results.poseLandmarks, minimalStyle);

        drawConnectors(canvasCtx, results.leftHandLandmarks, mpHolistic.HAND_CONNECTIONS, minimalStyle);
        drawLandmarks(canvasCtx, results.leftHandLandmarks, minimalStyle);

        drawConnectors(canvasCtx, results.rightHandLandmarks, mpHolistic.HAND_CONNECTIONS, minimalStyle);
        drawLandmarks(canvasCtx, results.rightHandLandmarks, minimalStyle);

        drawLandmarks(canvasCtx, results.faceLandmarks, minimalStyle);

        canvasCtx.restore();
      });

      const camera = new (await import("@mediapipe/camera_utils")).Camera(videoRef.current!, {
        onFrame: async () => {
          await holistic.send({ image: videoRef.current! });
        },
        width: 640,
        height: 480,
      });

      camera.start();
    };

    setupHolistic();
  }, []);

  return (
    <div className="relative w-full h-auto flex flex-col items-center">
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-auto invisible"
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="rounded-lg shadow-lg border border-gray-300"
      />
      <p className="mt-4 text-sm text-center text-gray-500">
        holistic tracker
      </p>
    </div>
  );
}