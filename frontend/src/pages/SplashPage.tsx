import { useEffect } from "react";
import { useNavigate } from "react-router";

function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      navigate("/entry", { replace: true });
    }, 1000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [navigate]);

  return (
    <main className="splash">
      <h1 className="splash__title">오늘 당신을 기다리는 운명의 메시지.</h1>
    </main>
  );
}

export default SplashPage;