// client/src/store/useAlertStore.ts
import { create } from 'zustand';

export type AlertType = 'success' | 'warning' | 'error';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: AlertType;
  onConfirm: (() => void) | null;
  triggerAlert: (params: { 
    title: string; 
    message: string; 
    type: AlertType;
    onConfirm?: () => void;
  }) => void;
  closeAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  type: 'warning',
  onConfirm: null,
  triggerAlert: ({ title, message, type, onConfirm }) => 
    set({ isOpen: true, title, message, type, onConfirm: onConfirm || null }),
  closeAlert: () => set({ isOpen: false, onConfirm: null }),
}));