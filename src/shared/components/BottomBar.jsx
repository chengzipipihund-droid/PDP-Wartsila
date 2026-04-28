import React from 'react';

const BottomBar = () => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      height: '50px',
      backgroundColor: '#f0f0f0',
      borderTop: '1px solid #ccc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 20px',
      zIndex: 1000,
    }}>
      <input
        type="text"
        placeholder="Search..."
        style={{
          width: '200px',
          padding: '5px 10px',
          borderRadius: '15px',
          border: '1px solid #ccc',
          outline: 'none',
        }}
      />
    </div>
  );
};

export default BottomBar;
