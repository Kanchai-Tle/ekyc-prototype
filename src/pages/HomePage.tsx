import { useNavigate } from 'react-router';

export function HomePage() {
  const navigate = useNavigate();

  const handleSeparate = () => {
    navigate('/captures');
  };

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="md:shadow-xl rounded-lg p-10 w-md text-start">
        <h2 className="text-[#000000] font-poppins font-light text-lg">WELCOME TO</h2>
        <h1 className="text-[#000000] font-poppins font-bold text-4xl mt-2">E-KYC PROTOTYPE</h1>
        <button className="bg-[#000000] font-poppins text-lg w-full rounded-3xl py-3 mt-16" onClick={handleSeparate}>
          Start Verify
        </button>
      </div>
    </div>
  );
}
