import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Header from "@/components/layout/Header";
import { Toaster } from "react-hot-toast";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex-1 bg-gray-50">
        <Header />
        <Component {...pageProps} />
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: 'white',
            },
          },
        }} />
      </div>
    </div>
  );
}
