"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      gutter={12}
      reverseOrder={false}
      containerStyle={{
        bottom: 20,
        right: 20,
      }}
      toastOptions={{
        duration: 3600,
        removeDelay: 220,
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
          maxWidth: "none",
        },
      }}
    />
  );
}
