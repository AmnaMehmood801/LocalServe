import { toast as sonnerToast } from "sonner";

export const toast = {
  success(message: string) {
    sonnerToast.success(message, {
      id: `success:${message}`,
      duration: 3500,
    });
  },
  info(message: string) {
    sonnerToast.info(message, {
      id: `info:${message}`,
      duration: 3500,
    });
  },
  error(message: string) {
    sonnerToast.error(message, {
      id: `error:${message}`,
      duration: 5000,
    });
  },
};
