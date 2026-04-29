import { useEffect } from 'react';
import WartsilaDetail from '../../../portfolio/wartsila_pages/WartsilaDetail.tsx';

export default function PortfolioPage() {
  useEffect(() => {
    // Other routes (like /energy, /nav) inject global CSS that freezes scrolling
    // (e.g. overflow: hidden on html, body, #root).
    // We override it here specifically for the portfolio page.
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    
    const root = document.getElementById('root');
    if (root) {
      root.style.overflow = 'visible';
      root.style.height = 'auto';
    }

    return () => {
      // Revert inline styles on unmount so dashboards perform identically
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      if (root) {
        root.style.overflow = '';
        root.style.height = '';
      }
    };
  }, []);

  return (
    <WartsilaDetail />
  );
}
