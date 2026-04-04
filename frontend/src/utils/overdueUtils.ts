export const isOverdue = (dueDate: string, paymentStatus: string): boolean => {
  if (paymentStatus === 'paid') return false;
  if (paymentStatus === 'overdue') return true;
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

export const getEffectivePaymentStatus = (currentPaymentStatus: string, dueDate: string): string => {
  if (currentPaymentStatus === 'overdue' || currentPaymentStatus === 'paid') return currentPaymentStatus;
  if (isOverdue(dueDate, currentPaymentStatus)) return 'overdue';
  return currentPaymentStatus || 'unpaid';
};

export const getOverdueDate = (dueDate: string): Date | null => {
  if (!dueDate) return null;
  return new Date(dueDate);
};