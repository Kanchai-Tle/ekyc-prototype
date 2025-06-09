import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';

export default function IDCardCapture() {
  const navigate = useNavigate();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [isCaptured, setIsCaptured] = useState<boolean | null>(null);
  const [isCameraReady, setIsCameraReady] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [sourceImageFromStorage, setSourceImageFromStorage] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleClickBack = () => {
    stopCamera();
    navigate('/home');
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
      console.error('Canvas, Video or Camera is not ready for capture.');
      return;
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('Video dimensions are 0. Camera might not be streaming yet.');
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

    const cardImageUrl = canvas.toDataURL('image/png');
    setCardImageUrl(cardImageUrl);
    setIsCaptured(true);
  };

  const retakePhoto = () => {
    setCardImageUrl(null);
    setIsCaptured(false);
    startCamera();
    setApiError(null); //Error clearing if exist
  };

  // Converting URL to File Methods
  const dataURLtoFile = (dataurl: string, filename: string): File | null => {
    const arr = dataurl.split(',');
    if (arr.length < 2) {
      return null;
    }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
      return null;
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleSubmit = async () => {
    // Check if the image is ready
    if (!sourceImageFromStorage || !cardImageUrl) {
      setApiError('Face and IDCard capture is required');
      return;
    }

    setIsLoading(true);
    setApiError(null);

    //convert Base64 to File Object
    const sourceFile = dataURLtoFile(sourceImageFromStorage, 'sourceImage.png');
    const targetFile = dataURLtoFile(cardImageUrl, 'targetImage.png');

    if (!sourceFile || !targetFile) {
      setApiError("Can't convert the image to file. Please, try again.");
      setIsLoading(false);
      return;
    }

    //create FormData for sending API
    const formData = new FormData();
    formData.append('name', 'string');
    formData.append('sourceImage', sourceFile);
    formData.append('targetImage', targetFile);

    const apiClient = axios.create({
      baseURL: 'http://localhost:3000', // dedine base Url to the backend
    });

    try {
      const response = await apiClient.post('/pocs/verify', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (
        response.status >= 201 &&
        response.status < 300 &&
        response.data &&
        typeof response.data.similarity === 'boolean'
      ) {
        console.log('Images successfully sent and verified. Similarity:', response.data.similarity);
        localStorage.removeItem('sourceImage');

        if (response.data.similarity === true) {
          navigate('/success');
        } else {
          navigate('/failure');
        }
      } else {
        // in case API response 201 but the data structure is invalid or the similarity field doesn't exist.
        setApiError('API response is invalid. Please try again.');
        console.error('Unexpected API response structure:', response.status, response.data);
        navigate('/failure');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const errorMessage = error.response.data?.message || 'verifying failed: ' + error.response.status;
          setApiError(errorMessage);
          console.error('API response error:', error.response.status, error.response.data);
        } else if (error.request) {
          setApiError("Can't connect to server. Please check your internet connection.");
          console.error('Network error:', error.message);
        } else {
          setApiError('Unknown error.');
          console.error('Axios error:', error.message);
        }
      } else {
        setApiError('Unknown error.');
        console.error('Unexpected error', error);
      }
      navigate('/failure');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedSourceImage = localStorage.getItem('sourceImage');
    if (storedSourceImage) {
      setSourceImageFromStorage(storedSourceImage);
    } else {
      console.error('Source image (face) not found in localStorage. Redirecting to face capture.');
      navigate('/face');
    }
  }, [navigate]);

  useEffect(() => {
    if (hasPermission !== false && sourceImageFromStorage !== null) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera, hasPermission, sourceImageFromStorage]);

  if (hasPermission === null || sourceImageFromStorage === null) {
    return <p className="text-center text-gray-700 mt-10">Verifying Camera Access and loading data...</p>;
  }

  if (hasPermission === false) {
    return (
      <p className="text-center text-red-600 mt-10">
        The permission was denied or camera is not available. Please check your browser settings.
      </p>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center">
      {!isCaptured ? (
        <div className="flex flex-col justify-center items-center">
          <h1 className="my-5">Capture Your ID Card</h1>
          <video className="w-full h-auto rounded-xl" ref={videoRef} autoPlay playsInline muted></video>{' '}
          {/* แก้ไข: w-xl ไม่ใช่ Tailwind class มาตรฐาน, เปลี่ยนเป็น w-full */}
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
          {apiError && <p className="text-red-500 mb-4 text-center">{apiError}</p>}
          <img src={cardImageUrl || ''} alt="Captured" className="my-5 rounded-lg" />
          <div>
            <button
              className="mx-2 bg-blue-500 hover:bg-blue-600 px-8 py-2 font-bold rounded-lg"
              onClick={handleSubmit}
              disabled={isLoading}
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
