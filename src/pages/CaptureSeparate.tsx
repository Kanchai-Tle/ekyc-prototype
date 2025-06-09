import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';

export default function CaptureSeparate() {
  const navigate = useNavigate();

  const [step, setStep] = useState<'face' | 'idcard'>('face');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [faceImageUrl, setFaceImageUrl] = useState<string | null>(null);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [isCaptured, setIsCaptured] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const apiClient = axios.create({
    baseURL: 'http://localhost:3000',
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

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

    if (!canvas || !video || !isCameraReady || video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('Cannot capture photo: Canvas, video, or camera not ready or video dimensions are zero.');
      setApiError('Cameera is not ready or video stream is invalid. Please try again.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Failed to get 2d context from canvas.');
      setApiError('Internal error: Canvas context not available.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');

    stopCamera();

    if (step === 'face') {
      // console.log(imageUrl);
      setFaceImageUrl(dataUrl);
      setStep('idcard');
      setIsCaptured(false);
    } else {
      // console.log(imageUrl);
      setCardImageUrl(dataUrl);
      setIsCaptured(true);
    }
  };

  const retakePhoto = () => {
    if (step === 'idcard') {
      setCardImageUrl(null);
      setIsCaptured(false);
      setApiError(null);
    }

    startCamera();
  };

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
    if (!faceImageUrl || !cardImageUrl) {
      setApiError('Both face and ID card images are required for verification.');
      return;
    }

    setIsLoading(true);
    setApiError(null);

    const sourceFile = dataURLtoFile(faceImageUrl, 'sourceImage.png');
    const targetFile = dataURLtoFile(cardImageUrl, 'targetImage.png');

    if (!sourceFile || !targetFile) {
      setApiError('Image conversion failed. Please try again.');
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', 'string');
    formData.append('sourceImage', sourceFile);
    formData.append('targetImage', targetFile);

    try {
      const response = await apiClient.post('/pocs/verify', formData);

      if (response.data && typeof response.data.similarity === 'boolean') {
        console.log('Images successfully sent and verified. Similarity:', response.data.similarity);
        if (response.data.similarity === true) {
          navigate('/success');
        } else {
          navigate('/failure');
        }
      } else {
        setApiError('API response is invalid. Please try again.');
        console.error('Unexpected API response structure:', response.status, response.data);
        navigate('/failure');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const errorMessage = error.response.data?.message || 'Verification failed' + error.response.status;
          setApiError(errorMessage);
          console.error('API response error:', error.response.status, error.response.data);
        } else if (error.request) {
          setApiError("Can't connect to server. Please check your internet connection");
          console.error('Network error:', error.message);
        } else {
          setApiError('An unknown error occured while setting up the request.');
          console.error('Axios error:', error.message);
        }
      } else {
        setApiError('An unexpected error occurred during verification.');
        console.error('Unexpected error', error);
      }
      navigate('/failure');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isCaptured) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [step, isCaptured, startCamera, stopCamera]);

  if (hasPermission === null) {
    return <p className="text-center text-gray-700 mt-10">Verifying Camera Access...</p>;
  }

  if (hasPermission === false) {
    return (
      <p className="text-center text-red-600 mt-10">
        The permission was denied or camera is not available. Please check your browser settings.
      </p>
    );
  }

  // Main UI rendering
  return (
    <div className="flex flex-col justify-center items-center">
      <h2 className="my-5 text-xl font-bold">{step === 'face' ? 'Capture Your Face' : 'Capture Your ID Card'}</h2>
      {!isCaptured ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-md h-auto rounded-xl border border-gray-300 shadow-lg"
          />
          <button
            onClick={capturePhoto}
            disabled={!isCameraReady || isLoading}
            className={`mt-5 px-8 py-2 font-bold rounded-lg ${
              !isCameraReady || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            Take Photo
          </button>
        </>
      ) : (
        <div className="flex flex-col justify-between items-center">
          <h2 className="text-lg my-3">Are you sure this is clear?</h2>
          {apiError && <p className="text-red-500 mb-4 text-center">{apiError}</p>}
          <img
            src={step === 'face' ? faceImageUrl || '' : cardImageUrl || ''} // Show relevant image based on step
            alt="Captured"
            className="my-5 w-full max-w-md h-auto rounded-lg border border-gray-300 shadow-lg"
          />
          <div>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={`mx-2 px-8 py-2 font-bold rounded-lg ${
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isLoading ? 'Sending data...' : 'Confirm'}
            </button>
            <button
              onClick={retakePhoto}
              disabled={isLoading}
              className={`mx-2 px-8 py-2 font-bold rounded-lg ${
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              Retake
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
}
