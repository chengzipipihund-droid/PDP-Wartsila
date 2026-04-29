import React, { useState, useEffect } from 'react';
import { useStore } from '../../stores/useShipStore';

export default function ShoreMessages() {
  const shorePower = useStore(s => s.shorePower);
  const [message, setMessage] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shorePower === 1) {
      setMessage({ type: 'cloud', text: 'Cloud connection established' });
      setVisible(true);
      setTimeout(() => {
        setMessage({ type: 'alarm', text: 'Minor anomaly detected in cooling system' });
        setVisible(true);
      }, 5000); // Show alarm 5s after cloud connection
    }
  }, [shorePower]);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 15000); // 15s fade-out
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible || !message) return null;

  const getIcon = () => {
    switch (message.type) {
      case 'cloud':
        return '☁️';
      case 'alarm':
        return '️⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 200,
      background: 'rgba(20, 30, 40, 0.9)',
      border: '1px solid rgba(100, 150, 200, 0.5)',
      borderRadius: '8px',
      padding: '15px',
      color: 'white',
      fontFamily: 'var(--mono)',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
      transition: 'opacity 0.5s',
      opacity: visible ? 1 : 0,
    }}>
      <div style={{ fontSize: '24px' }}>{getIcon()}</div>
      <div>
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{message.text}</div>
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.5)',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
        }}
      >×</button>
    </div>
  );
}
