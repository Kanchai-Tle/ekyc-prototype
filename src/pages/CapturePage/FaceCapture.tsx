import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';

export default function FaceCapture() {
  const navigate = useNavigate();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [faceImageUrl, setFaceImageUrl] = useState<string | null>(null);
  const [isCaptured, setIsCaptured] = useState<boolean | null>(null);
  const [isCameraReady, setIsCameraReady] = useState<boolean | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleClickBack = () => {
    stopCamera();
    navigate('/home');
  };

  const handleClickConfirm = () => {
    if (faceImageUrl) {
      localStorage.setItem('sourceImage', faceImageUrl);
      navigate('/idcard');
      // console.log(faceImageUrl);
    }
  };

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      console.log('Camera stream stopped.');
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setIsCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
          videoRef.current?.play();
        };
        videoRef.current.onerror = (e) => {
          console.error('Video element error:', e);
          setIsCameraReady(false);
          setHasPermission(false);
        };
      }
      setHasPermission(true);
    } catch (err) {
      console.error('Permission denied or error:', err);
      setHasPermission(false);
      setIsCameraReady(false);
    }
  }, [stopCamera]);

  const capturePhoto = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video || !isCameraReady) {
      console.error('Canvas, Video or Camera is not ready');
      return;
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('Video dimensions are 0. Camera might not be streaming.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      console.error('Failed to get 2d context from canvas.');
      return;
    }

    stopCamera();

    const faceImageUrl = canvas.toDataURL('image/png');
    // console.log(imageUrl);
    setFaceImageUrl(faceImageUrl);
    setIsCaptured(true);
  };

  const retakePhoto = () => {
    setFaceImageUrl(null);
    setIsCaptured(false);
    startCamera();
  };

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  if (hasPermission === null) {
    return <p>Verifying Camera Access...</p>;
  }

  if (hasPermission === false) {
    return <p>The permission was denied or camera is not available. Please check your browser settings.</p>;
  }

  return (
    <div className="flex flex-col justify-center items-center">
      {!isCaptured ? (
        <div className="flex flex-col justify-center items-center">
          <h1 className="my-5">Capture Your Face</h1>
          <video className="w-full h-auto rounded-xl" ref={videoRef} autoPlay playsInline muted></video>
          {!isCameraReady && hasPermission && <p className="text-gray-600 mt-2">Waiting for camera stream...</p>}
          <button
            className={`mt-5 bg-green-500 hover:bg-green-600 px-8 py-2 font-bold rounded-lg ${
              !isCameraReady ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={capturePhoto}
            disabled={!isCameraReady}
          >
            Take Photo
          </button>
          <button className="my-2 bg-red-500 hover:bg-red-600 px-8 py-2 font-bold rounded-lg" onClick={handleClickBack}>
            Back
          </button>
        </div>
      ) : (
        <div className="flex flex-col justify-between items-center">
          <h2>Are you confirm?</h2>
          <img src={faceImageUrl || ''} alt="Captured" className="my-5 rounded-lg" />
          <div>
            <button
              className="mx-2 bg-blue-500 hover:bg-blue-600 px-8 py-2 font-bold rounded-lg"
              onClick={handleClickConfirm}
            >
              Confirm
            </button>
            <button className="mx-2 bg-red-500 hover:bg-red-600 px-8 py-2 font-bold rounded-lg" onClick={retakePhoto}>
              Retake
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
}
