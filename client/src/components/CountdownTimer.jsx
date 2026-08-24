import { useState, useEffect, useRef } from 'react';

export default function CountdownTimer({ expiresAt, onExpire }) {
  const [remaining, setRemaining] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) {
        setRemaining(0);
        clearInterval(intervalRef.current);
        if (onExpire) onExpire();
      } else {
        setRemaining(Math.floor(diff / 1000));
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [expiresAt]);

  if (remaining === null) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgent = remaining < 30;

  return (
    <div className={`countdown ${urgent ? 'urgent' : ''}`}>
      ⏱ Seat hold expires in{' '}
      <strong>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </strong>
    </div>
  );
}
