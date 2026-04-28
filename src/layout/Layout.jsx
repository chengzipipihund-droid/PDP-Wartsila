import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomBar from '../shared/components/BottomBar';

const Layout = () => {
  return (
    <>
      <Outlet />
      <BottomBar />
    </>
  );
};

export default Layout;
