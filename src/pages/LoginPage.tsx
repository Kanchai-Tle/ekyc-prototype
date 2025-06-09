import { useAuthentication } from '@/contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuthentication();
  return (
    <div className="m-5">
      <button className="bg-sky-500 px-5 py-2 font-bold rounded-lg hover:bg-sky-700" onClick={login}>
        Login
      </button>
    </div>
  );
}
