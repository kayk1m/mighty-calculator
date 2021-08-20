import '@assets/main.css';
import 'nprogress/nprogress.css';

import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { SWRConfig } from 'swr';
import NProgress from 'nprogress';

import ManagedUIContext from '@components/context';
import { CommonLayout } from '@components/layout';
import { fetcher } from '@lib/fetcher';

NProgress.configure({
  minimum: 0.3,
  easing: 'ease',
  speed: 500,
  showSpinner: false,
});

const fetcherJson = async (url: string) => fetcher.get(url).json();

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  const Layout = (Component as any).Layout || CommonLayout;

  useEffect(() => {
    router.events.on('routeChangeStart', NProgress.start);
    router.events.on('routeChangeComplete', NProgress.done);
    router.events.on('routeChangeError', NProgress.done);

    return () => {
      router.events.off('routeChangeStart', NProgress.start);
      router.events.off('routeChangeComplete', NProgress.done);
      router.events.off('routeChangeError', NProgress.done);
    };
  }, [router]);

  return (
    <>
      <Script src="/js/redirectIE.js" strategy="beforeInteractive" />
      <SWRConfig value={{ fetcher: fetcherJson }}>
        <ManagedUIContext>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ManagedUIContext>
      </SWRConfig>
    </>
  );
}
