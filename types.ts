// Fix: Add global declaration for window.Telegram to fix TypeScript errors in App.tsx.
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        initDataUnsafe?: {
          user?: {
            id: number;
          };
        };
      };
    };
  }
}

export interface Transaction {
  id: string;
  dateTime: string;
  vehicleType: string;
  vehicleNumber: string;
  amount: string;
  link: string;
}
