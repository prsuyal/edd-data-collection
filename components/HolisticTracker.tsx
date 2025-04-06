"use client";
import { useEffect, useRef, useState } from "react";

export default function HolisticTracker({
  status,
  onFrameData,
}: {
  status: string;
  onFrameData?: (data: any) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<any>(null);
  const holisticRef = useRef<any>(null);
  const [detectionStatus, setDetectionStatus] = useState("starting up...");
  const [frameCount, setFrameCount] = useState(0);
  const frameCountRef = useRef(0);
  const processingRef = useRef(false);
  const latestStatus = useRef(status);
  const latestOnFrameData = useRef(onFrameData);

  useEffect(() => {
    latestStatus.current = status;
  }, [status]);

  useEffect(() => {
    latestOnFrameData.current = onFrameData;
  }, [onFrameData]);

  useEffect(() => {
    if (status === "running" && frameCountRef.current === 0) {
      frameCountRef.current = 0;
      setFrameCount(0);
    }
  }, [status]);

  useEffect(() => {
    let isMounted = true;
    const setup = async () => {
      const mpHolistic = await import("@mediapipe/holistic");
      const { drawLandmarks, drawConnectors } = await import(
        "@mediapipe/drawing_utils"
      );
      const { Camera } = await import("@mediapipe/camera_utils");
      const holistic = new mpHolistic.Holistic({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });
      holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        refineFaceLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      holistic.onResults((results) => {
        if (!isMounted || processingRef.current) return;
        processingRef.current = true;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
          processingRef.current = false;
          return;
        }
        const hasData =
          results.poseLandmarks ||
          results.faceLandmarks ||
          results.leftHandLandmarks ||
          results.rightHandLandmarks;
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        const style = {
          radius: 0.5,
          lineWidth: 0.5,
          color: "white",
          fillColor: "white",
        };
        if (results.poseLandmarks) {
          drawConnectors(
            ctx,
            results.poseLandmarks,
            mpHolistic.POSE_CONNECTIONS,
            style
          );
          drawLandmarks(ctx, results.poseLandmarks, style);
        }
        if (results.leftHandLandmarks) {
          drawConnectors(
            ctx,
            results.leftHandLandmarks,
            mpHolistic.HAND_CONNECTIONS,
            style
          );
          drawLandmarks(ctx, results.leftHandLandmarks, style);
        }
        if (results.rightHandLandmarks) {
          drawConnectors(
            ctx,
            results.rightHandLandmarks,
            mpHolistic.HAND_CONNECTIONS,
            style
          );
          drawLandmarks(ctx, results.rightHandLandmarks, style);
        }
        if (results.faceLandmarks) {
          drawLandmarks(ctx, results.faceLandmarks, style);
        }
        ctx.restore();
        if (latestOnFrameData.current && latestStatus.current === "running") {
          const timestamp = Date.now();
          const data = {
            timestamp,
            pose: results.poseLandmarks?.map((l) => ({ ...l })) || [],
            face: results.faceLandmarks?.map((l) => ({ ...l })) || [],
            leftHand: results.leftHandLandmarks?.map((l) => ({ ...l })) || [],
            rightHand: results.rightHandLandmarks?.map((l) => ({ ...l })) || [],
            fallbackData: hasData
              ? null
              : [{ x: 0.5, y: 0.5, z: 0, visibility: 1 }],
          };
          latestOnFrameData.current(data);
          frameCountRef.current += 1;
          setFrameCount(frameCountRef.current);
        }
        processingRef.current = false;
      });
      holisticRef.current = holistic;
      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (
              latestStatus.current !== "paused" &&
              videoRef.current &&
              !processingRef.current
            ) {
              await holistic.send({ image: videoRef.current });
            }
          },
          width: 800,
          height: 600,
        });
        cameraRef.current = camera;
        await camera.start();
        setDetectionStatus("tracking");
      }
    };
    setup();
    return () => {
      isMounted = false;
      if (cameraRef.current) cameraRef.current.stop();
    };
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
        width={800}
        height={600}
        className="rounded-xl shadow-lg border border-white bg-black"
      />
      <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-black text-white text-sm">
        {detectionStatus}{" "}
        {(status === "running" || status === "paused") &&
          `frames: ${frameCount}`}
      </div>
    </div>
  );
}
