import React from 'react';
import Head from 'next/head';
import { LandingPage } from '../components/Landing';

const LandingRoot: React.FC & { noLayout?: boolean } = () => {
  return (
    <>
      <Head>
        <title>Ofront | Landing</title>
        <meta name="description" content="Ofront landing page" />
      </Head>
      <LandingPage />
    </>
  );
};

LandingRoot.noLayout = true;

export default LandingRoot;
