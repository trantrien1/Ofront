import React from 'react';
import Head from 'next/head';
import { LandingPage } from '../components/Landing';

const LandingRoot: React.FC & { noLayout?: boolean } = () => {
  return (
    <>
      <Head>
        <title>VietMindAI — Trợ lý AI chữa lành & DASS‑21</title>
        <meta name="description" content="VietMindAI là không gian chữa lành hiện đại với Ami AI, trắc nghiệm DASS‑21 và thư viện video trị liệu." />
      </Head>
      <LandingPage />
    </>
  );
};

LandingRoot.noLayout = true;

export default LandingRoot;
