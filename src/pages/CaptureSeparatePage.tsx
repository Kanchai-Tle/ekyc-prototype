import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';

enum Permission {
  Notallowed,
  Allowed,
  Pending,
}

enum ModalState {
  Disable,
  Enable,
}

export default function CaptureSeparatePage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<'face' | 'idcard'>('face');
  const [hasCamPermission, setHasCamPermission] = useState<Permission>(Permission.Pending);
  const [faceImageUrl, setFaceImageUrl] = useState<string | null>(null);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const [isModalShow, setIsModalShow] = useState<ModalState>(ModalState.Disable);
  const [isSimilarityPassed, setIsSimilarityPassed] = useState<'success' | 'fail' | null>(null);

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
          setHasCamPermission(Permission.Notallowed);
        };
      }
      setHasCamPermission(Permission.Allowed);
    } catch (err) {
      console.error('Permission denied or error:', err);
      setHasCamPermission(Permission.Notallowed);
      setIsCameraReady(false);
    }
  }, [stopCamera]);

  const capturePhoto = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video || !isCameraReady || video.videoWidth === 0 || video.videoHeight === 0) {
      setApiErrorMessage('Camera is not ready or video stream is invalid. Please try again.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      setApiErrorMessage('Internal error: Canvas context not available.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');

    stopCamera();

    if (step === 'face') {
      setFaceImageUrl(dataUrl);
    } else {
      setCardImageUrl(dataUrl);
    }
  };

  const handleConfirmFace = () => {
    setApiErrorMessage(null); // Clear any previous errors
    setStep('idcard'); // Move to ID card capture step (Phase 3)
    startCamera();
  };

  const retakePhoto = () => {
    setApiErrorMessage(null); // Clear any previous errors
    if (step === 'face') {
      setFaceImageUrl(null); // Clear face image
    } else {
      setCardImageUrl(null); // Clear ID card image
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
      setApiErrorMessage('Both face and ID card images are required for verification.');
      return;
    }

    setIsLoading(true);
    setApiErrorMessage(null);

    const sourceFile = dataURLtoFile(faceImageUrl, 'sourceImage.png');
    const targetFile = dataURLtoFile(cardImageUrl, 'targetImage.png');

    if (!sourceFile || !targetFile) {
      setApiErrorMessage('Image conversion failed. Please try again.');
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', 'string');
    formData.append('sourceImage', sourceFile);
    formData.append('targetImage', targetFile);

    try {
      const response = await apiClient.post('/pocs/verify', formData);

      if (response.data?.similarity === true) {
        setIsSimilarityPassed('success');
      } else {
        setIsSimilarityPassed('fail');
      }
      setIsModalShow(ModalState.Enable);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const errorMessage = error.response.data?.message || 'Verification failed' + error.response.status;
          setApiErrorMessage(errorMessage);
        } else if (error.request) {
          setApiErrorMessage("Can't connect to server. Please check your internet connection");
        } else {
          setApiErrorMessage('An unknown error occured while setting up the request.');
        }
      } else {
        setApiErrorMessage('An unexpected error occurred during verification.');
      }
      setIsModalShow(ModalState.Enable);
      setIsSimilarityPassed('fail');
    } finally {
      setIsLoading(false);
      stopCamera();
    }
  };

  const handleBack = () => {
    setApiErrorMessage(null); // Clear any previous errors
    if (step === 'face') {
      // If on Face Camera page (Phase 1)
      navigate('/home');
    } else if (step === 'idcard') {
      if (cardImageUrl) {
        // If on ID Card Confirmation page (Phase 4)
        setCardImageUrl(null); // Clear ID card image to go back to ID card camera
        startCamera();
      } else {
        // If on ID Card Camera page (Phase 3)
        setCardImageUrl(null); // Clear any partial ID card state
        setStep('face'); // Go back to Face Confirmation page (Phase 2)
      }
    }
  };

  useEffect(() => {
    // Logic to start/stop camera based on current step and image availability
    if (step === 'face' && !faceImageUrl) {
      // Phase 1: Capture Face
      startCamera();
    } else if (step === 'idcard' && !cardImageUrl) {
      // Phase 3: Capture ID Card
      startCamera();
    } else {
      // Phase 2 (Confirm Face) or Phase 4 (Confirm ID Card)
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [step, faceImageUrl, cardImageUrl, startCamera, stopCamera]);

  if (hasCamPermission === Permission.Pending) {
    return <p className="text-center text-gray-700 mt-10">Verifying Camera Access...</p>;
  }

  if (hasCamPermission === Permission.Notallowed) {
    return (
      <p className="text-center text-red-600 mt-10">
        The permission was denied or camera is not available. Please check your browser settings.
      </p>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center m-8">
      <h1 className="text-black font-bold font-poppins text-lg">HOCCO E-KYC</h1>

      {/* Progress Bar */}
      <div className="flex items-start justify-center my-2">
        {/* Step 1: Face Capture */}
        <div className="flex flex-col items-center">
          <div
            className="bg-black shadow-[0_0_8px_rgba(0,0,0,0.2)] text-white font-poppins 
          rounded-full w-10 h-10 flex items-center justify-center"
          >
            {step === 'face' && !faceImageUrl ? 1 : '✓'}
          </div>
          <span
            className={
              step === 'face'
                ? 'text-black text-xs mt-1 font-semibold font-poppins'
                : 'text-gray-400 text-xs mt-1 font-semibold font-poppins'
            }
          >
            Face
          </span>
        </div>

        {/* Connecting Line */}
        <div
          className={`relative w-10 h-0.5 ${step === 'idcard' || faceImageUrl ? 'bg-black' : 'bg-gray-300'} mx-2 mt-5`}
        ></div>

        {/* Step 2: ID Card Capture */}
        <div className="flex flex-col items-center">
          <div
            className={`shadow-[0_0_8px_rgba(0,0,0,0.2)] rounded-full w-10 h-10 flex items-center justify-center
            ${step === 'idcard' ? 'bg-black text-white' : 'bg-white text-gray-400'}`}
          >
            2
          </div>
          <span
            className={
              step === 'idcard'
                ? 'text-black text-xs mt-1 font-semibold font-poppins'
                : 'text-gray-400 text-xs mt-1 font-semibold font-poppins'
            }
          >
            ID Card
          </span>
        </div>
      </div>
      {/* End Progress Bar */}

      {/* Main Content Area */}
      {/* Phase 1: Capture Face (Camera view) */}
      {step === 'face' && !faceImageUrl && (
        <div className="flex items-center justify-center w-full mt-2">
          <div className="flex flex-col items-center text-center shadow-[0_0_8px_rgba(0,0,0,0.2)] p-8 max-w-5xl w-full rounded-2xl">
            <h2 className="text-xl font-bold text-black font-poppins mb-4">Capture Your Face</h2>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto max-w-md rounded-xl border border-gray-300 shadow-xl object-contain"
            />
            <div className="flex flex-col items-center mt-10 w-full max-w-md space-y-4">
              <button
                onClick={capturePhoto}
                disabled={!isCameraReady || isLoading}
                className={`w-full px-8 py-2 font-poppins rounded-3xl text-white text-lg ${
                  !isCameraReady || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black'
                }`}
              >
                Take Photo
              </button>
              <button
                onClick={handleBack}
                disabled={isLoading}
                className={`w-full px-8 py-2 font-poppins rounded-3xl text-lg text-black font-semibold ${
                  isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-white'
                }`}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: Confirm Face Image */}
      {step === 'face' && faceImageUrl && (
        <div className="flex flex-col justify-between items-center w-full mt-2 shadow-[0_0_8px_rgba(0,0,0,0.2)] p-8 max-w-5xl rounded-2xl">
          <h2 className="text-xl font-bold text-black font-poppins mb-4">Is your face clear?</h2>
          <img
            src={faceImageUrl}
            alt="Captured Face"
            className="w-full max-w-md h-auto rounded-lg border border-gray-300 shadow-lg"
          />
          <div className="flex flex-col items-center mt-10 w-full max-w-md space-y-4">
            <button
              onClick={handleConfirmFace}
              disabled={isLoading}
              className={`w-full px-8 py-2 font-poppins rounded-3xl text-white text-lg ${
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black'
              }`}
            >
              Confirm
            </button>
            <button
              onClick={retakePhoto}
              disabled={isLoading}
              className={`w-full px-8 py-2 font-poppins rounded-3xl text-lg text-black font-semibold ${
                isLoading ? 'text-gray-400 cursor-not-allowed' : 'bg-white'
              }`}
            >
              Retake
            </button>
          </div>
        </div>
      )}

      {/* Phase 3: Capture ID Card (Camera view) */}
      {step === 'idcard' && !cardImageUrl && (
        <div className="flex items-center justify-center w-full mt-2">
          <div className="flex flex-col items-center text-center shadow-[0_0_8px_rgba(0,0,0,0.2)] p-8 max-w-5xl w-full rounded-2xl">
            <h2 className="text-xl font-bold text-black font-poppins mb-4">Capture Your ID Card</h2>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto max-w-md rounded-xl border border-gray-300 shadow-xl object-contain"
            />
            <div className="flex flex-col items-center mt-10 w-full max-w-md space-y-4">
              <button
                onClick={capturePhoto}
                disabled={!isCameraReady || isLoading}
                className={`w-full px-8 py-2 font-poppins rounded-3xl text-white text-lg ${
                  isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black'
                }`}
              >
                Take Photo
              </button>
              <button
                onClick={handleBack}
                disabled={isLoading}
                className={`w-full px-8 py-2 font-poppins rounded-3xl text-lg text-black font-semibold ${
                  isLoading ? 'text-gray-400 cursor-not-allowed' : 'bg-white'
                }`}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 4: Confirm ID Card Image and Final Submission */}
      {step === 'idcard' && cardImageUrl && (
        <div className="flex flex-col justify-between items-center w-full mt-2 shadow-[0_0_8px_rgba(0,0,0,0.2)] p-8 max-w-5xl rounded-2xl">
          <h2 className="text-xl font-bold text-black font-poppins mb-4">Is your ID card clear?</h2>
          <img
            src={cardImageUrl}
            alt="Captured ID Card"
            className="w-full max-w-md h-auto rounded-lg border border-gray-300 shadow-lg"
          />
          <div className="flex flex-col items-center mt-10 w-full max-w-md space-y-4">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={`w-full px-8 py-2 font-poppins rounded-3xl text-white text-lg ${
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black'
              }`}
            >
              Confirm
            </button>
            <button
              onClick={retakePhoto}
              disabled={isLoading}
              className={`w-full px-8 py-2 font-poppins rounded-3xl text-lg text-black font-semibold ${
                isLoading ? 'text-gray-400 cursor-not-allowed' : 'bg-white'
              }`}
            >
              Retake
            </button>
          </div>
        </div>
      )}

      {/*Modal Phase*/}

      {isModalShow === ModalState.Enable && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-lg text-center w-11/12 max-w-sm sm:max-w-md">
            <h2 className="flex flex-col items-center justify-center mb-4 font-poppins">
              <span
                className={`text-5xl font-bold ${isSimilarityPassed === 'success' ? 'text-green-600' : 'text-red-500'}`}
              >
                {isSimilarityPassed === 'success' ? '✓' : '✗'}
              </span>
              <span className="text-xl font-bold text-black mt-2">
                {isSimilarityPassed === 'success' ? 'Verification Successful' : 'Verification Failed'}
              </span>
            </h2>
            <p className="text-gray-700 font-poppins mb-6">
              {isSimilarityPassed === 'success' ? 'ระบบได้ยืนยันตัวตนของคุณเรียบร้อยแล้ว' : 'กรุณาลองใหม่อีกครั้ง'}
            </p>

            <div className="flex justify-center space-x-4">
              {isSimilarityPassed === 'fail' && (
                <button
                  onClick={() => {
                    setIsModalShow(ModalState.Disable);
                    setFaceImageUrl(null);
                    setCardImageUrl(null);
                    setStep('face');
                  }}
                  className="px-6 py-2 rounded-3xl bg-black text-white font-poppins"
                >
                  Try Again
                </button>
              )}

              <button
                onClick={() => {
                  setIsModalShow(ModalState.Disable);
                  navigate('/home');
                }}
                className="px-6 py-2 rounded-3xl bg-gray-300 text-black font-poppins"
              >
                กลับสู่หน้าหลัก
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden"></canvas>
      <p className="hidden">{apiErrorMessage}</p>
    </div>
  );
}
