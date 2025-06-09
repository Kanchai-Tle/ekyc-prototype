import { useNavigate } from 'react-router';

export function HomePage() {
  const navigate = useNavigate();

  const handleCapture = () => {
    navigate('/capture');
  };

  const handleSeparate = () => {
    navigate('/captures');
  };

  return (
    <div className="min-h-dvh flex flex-col items-center place-content-center">
      <h1 className="text-2xl font-bold">Hocco EKYC</h1>
      <p className="text-sm text-gray-400 p-2">
        ยืนยันตัวตนออนไลน์ง่ายและปลอดภัยด้วยระบบ eKYC ใช้เทคโนโลยีตรวจสอบเอกสารและภาพถ่ายเพื่อความแม่นยำ รวดเร็ว
        ปกป้องข้อมูลส่วนบุคคลของคุณ
      </p>
      <div className="flex flex-row justity-center items-center gap-x-5">
        <button className="bg-sky-800 hover:bg-sky-900 px-8 py-2 my-5 rounded-lg font-bold" onClick={handleCapture}>
          ถ่ายรูปพร้อมบัตร
        </button>
        <button
          className="bg-amber-500 hover:bg-amber-600 px-8 py-2 my-5 rounded-lg font-bold"
          onClick={handleSeparate}
        >
          ถ่ายรูปและบัตรแยกกัน
        </button>
      </div>
    </div>
  );
}
