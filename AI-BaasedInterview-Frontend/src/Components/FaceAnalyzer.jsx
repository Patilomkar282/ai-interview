import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

// Maps face-api.js expression keys to the emotion labels used by the rest of the app
const EXPRESSION_MAP = {
  neutral: 'neutral',
  happy: 'happy',
  sad: 'sad',
  angry: 'angry',
  surprised: 'surprised',
  fearful: 'fearful',
  disgusted: 'disgusted'
};

let modelsLoaded = false; // module-level flag — load once across remounts

const FaceAnalyzer = ({ onEmotionDetected }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Load face-api.js models once, then start the camera
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        if (!modelsLoaded) {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceExpressionNet.loadFromUri('/models')
          ]);
          modelsLoaded = true;
        }

        if (cancelled) return;

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;

        if (videoRef.current && !cancelled) {
          videoRef.current.srcObject = stream;
          setReady(true);
        }
      } catch (err) {
        console.error('[FaceAnalyzer] Init error:', err);
        onEmotionDetected('neutral');
      }
    };

    init();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []); // run once on mount

  // Start detection loop once video is playing
  useEffect(() => {
    if (!ready || !videoRef.current) return;

    const video = videoRef.current;

    const detect = async () => {
      if (!video || video.paused || video.ended) return;

      try {
        const result = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
          .withFaceExpressions();

        if (result) {
          // Pick the expression with the highest confidence score
          const expressions = result.expressions;
          const dominant = Object.entries(expressions)
            .sort((a, b) => b[1] - a[1])[0][0];

          onEmotionDetected(EXPRESSION_MAP[dominant] || 'neutral');
        }
      } catch (err) {
        // Silently ignore individual frame errors — detection will retry next interval
      }
    };

    const handlePlay = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(detect, 2000); // detect every 2 seconds
    };

    video.addEventListener('play', handlePlay);

    // If video is already playing (autoplay succeeded), start immediately
    if (!video.paused) handlePlay();

    return () => {
      video.removeEventListener('play', handlePlay);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [ready, onEmotionDetected]); // stable — onEmotionDetected is wrapped in useCallback upstream

  return (
    <div style={{ display: 'none' }}>
      <video ref={videoRef} autoPlay muted playsInline />
    </div>
  );
};

export default FaceAnalyzer;
