import type {AppProps} from 'next/app';
import Head from 'next/head';
import '../presentation/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Sleeping Queens - Magical Card Game</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="description" content="Play Sleeping Queens online - A magical card game of strategy and fun!" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}