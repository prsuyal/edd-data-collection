"use client";
import { useRef, useState, useEffect } from "react";
import HolisticTracker from "../components/HolisticTracker";

const ALLOWED_NAMES = [
  "pranshu suyal",
  "abhinav kartik",
  "suchit basineni",
  "rohit kottomtharayil",
  "pramya surapaneni",
  "ayan patel",
  "jason wong",
  "sashreek bhupathiraju",
  "om agrawal",
  "minghan li",
  "mihir macwan",
  "gajan mohan raj"
];

const GESTURES = [
  "smile",
  "frown",
  "nod",
  "head shake (like you're saying no)",
  "shrug",
  "one eyebrow raised (like you're skeptical)",
  "both eyebrows raised (like woah/shocked)",
  "eyeroll",
  "thumbs up",
  "wave",
  "wink",
  "middle finger",
  "crossed arms",
  "facepalm",
  "hands on hips",
  "scratching head",
  "pointing left",
  "pointing right",
  "pointing forward",
  "looking away (just look away from the camera)",
];

export default function Page() {
  const [name, setName] = useState("");
  const [allowed, setAllowed] = useState(false);

  const handleSubmit = () => {
    const lowerName = name.trim().toLowerCase();
    if (ALLOWED_NAMES.includes(lowerName)) {
      setAllowed(true);
    } else {
      alert("sorry, you are not on the allowed list.");
    }
  };

  return (
    <>
      {!allowed ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-black text-white font-sans">
          <div className="text-2xl font-bold">
            pls type ur full name to login
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="px-4 py-2 rounded-full bg-black text-white border border-white focus:outline-none focus:border-gray-400"
            placeholder="e.g. lionel messi"
          />
          <button
            onClick={handleSubmit}
            className="px-6 py-3 rounded-full bg-black text-white border border-white hover:bg-white hover:text-black transition"
          >
            submit
          </button>
        </div>
      ) : (
        <GestureCollector userName={name.trim().toLowerCase()} />
      )}
    </>
  );
}

function GestureCollector({ userName }: { userName: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState("idle");
  const [timeLeft, setTimeLeft] = useState(180);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameData = useRef<any[]>([]);
  const csvSaved = useRef(false);
  const currentGesture = GESTURES[currentIndex];
  const isLast = currentIndex === GESTURES.length - 1;
  const firstName = userName.split(" ")[0];

  const start = () => {
    frameData.current = [];
    csvSaved.current = false;
    setStatus("running");
    setTimeLeft(180);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setTimeout(() => {
            if (frameData.current.length > 0 && !csvSaved.current) {
              forceSaveCSV();
            } else if (frameData.current.length === 0) {
              alert("no frames captured! pls try again.");
              setStatus("idle");
            }
          }, 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pause = () => {
    clearInterval(intervalRef.current!);
    intervalRef.current = null;
    setStatus("paused");
  };

  const resume = () => {
    setStatus("running");
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setTimeout(() => {
            if (frameData.current.length > 0 && !csvSaved.current) {
              forceSaveCSV();
            } else if (frameData.current.length === 0) {
              alert("no frames captured! pls try again.");
              setStatus("idle");
            }
          }, 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onFrameData = (frame: any) => {
    if (status === "running") {
      frameData.current.push(frame);
    }
  };

  const forceSaveCSV = () => {
    if (csvSaved.current) return;
    csvSaved.current = true;
    if (!frameData.current.length) return;
    const rows: string[] = [];
    const header = [
      "id",
      "timestamp",
      "gesture",
      "type",
      "index",
      "x",
      "y",
      "z",
      "visibility",
    ];
    rows.push(header.join(","));
    for (const frame of frameData.current) {
      const timestamp = frame.timestamp;
      if (frame.fallbackData) {
        frame.fallbackData.forEach((l: any, i: number) => {
          rows.push(
            [
              userName,
              timestamp,
              currentGesture,
              "fallback",
              i,
              l.x ?? "",
              l.y ?? "",
              l.z ?? "",
              l.visibility ?? "",
            ].join(",")
          );
        });
      }
      for (const [type, landmarks] of Object.entries(frame)) {
        if (type === "timestamp" || type === "fallbackData" || !landmarks) {
          continue;
        }
        if (Array.isArray(landmarks)) {
          landmarks.forEach((l: any, i: number) => {
            rows.push(
              [
                userName,
                timestamp,
                currentGesture,
                type,
                i,
                l.x ?? "",
                l.y ?? "",
                l.z ?? "",
                l.visibility ?? "",
              ].join(",")
            );
          });
        }
      }
    }
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gesture-${userName}-${currentGesture
      .replace(/\s+/g, "_")
      .toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus("idle");
    setTimeout(() => {
      if (!isLast) {
        setCurrentIndex((i) => i + 1);
      } else {
        setStatus("done");
      }
    }, 500);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-black text-white font-sans">
      <div className="text-xl text-gray-400">helllooo {firstName} 👋</div>
      <div className="text-3xl font-bold text-center">
        {status === "done"
          ? "all gestures recorded!"
          : `current gesture: ${currentGesture}`}
      </div>
      <div className="relative w-[800px] h-[600px] rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black">
        <HolisticTracker status={status} onFrameData={onFrameData} />
        {(status === "running" || status === "paused") && (
          <div className="absolute top-4 left-4 px-4 py-2 bg-black/70 text-white text-2xl rounded-full">
            ⏱ {formatTime(timeLeft)}
            {status === "paused" && " (paused)"}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {status === "idle" && currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="px-3 py-2 rounded-full bg-black text-white border border-white hover:bg-white hover:text-black transition"
          >
            ←
          </button>
        )}
        {status === "idle" && (
          <button
            onClick={start}
            className="px-6 py-3 rounded-full bg-black text-white border border-white hover:bg-white hover:text-black transition"
          >
            start
          </button>
        )}
        {status === "idle" && currentIndex < GESTURES.length - 1 && (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="px-3 py-2 rounded-full bg-black text-white border border-white hover:bg-white hover:text-black transition"
          >
            →
          </button>
        )}
        {status === "running" && (
          <button
            onClick={pause}
            className="px-6 py-3 rounded-full bg-black text-white border border-white hover:bg-white hover:text-black transition"
          >
            pause
          </button>
        )}
        {status === "paused" && (
          <button
            onClick={resume}
            className="px-6 py-3 rounded-full bg-black text-white border border-white hover:bg-white hover:text-black transition"
          >
            resume
          </button>
        )}
      </div>
      {status === "done" && (
        <p className="text-lg text-gray-300 font-medium">
          all gestures collected and saved. thanks {firstName} !!!
        </p>
      )}
      <div className="text-sm text-gray-500">
        progress: {currentIndex + 1} / {GESTURES.length} gestures
      </div>
    </div>
  );
}
