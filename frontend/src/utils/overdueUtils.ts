// Utility functions for calculating overdue status

/**
 * Calculate if an invoice/quotation/proforma is overdue based on one month from billing date
 * @param billingDate - The date of billing (invoice_date, quotation_date, proforma_date)
 * @param paymentStatus - Current payment status
 * @returns boolean indicating if the item is overdue
 */
export const isOverdue = (billingDate: string, paymentStatus: string): boolean => {
  // Don't mark as overdue if already paid
  if (paymentStatus === 'paid') {
    return false;
  }

  if (!billingDate) {
    return false;
  }

  const billing = new Date(billingDate);
  const today = new Date();
  
  // Calculate one month from billing date
  const overdueDate = new Date(billing);
  overdueDate.setMonth(overdueDate.getMonth() + 1);
  
  // Return true if today is past the overdue date
  return today > overdueDate;
};

/**
 * Get the appropriate payment status, automatically setting to 'overdue' if conditions are met
 * @param currentPaymentStatus - The current payment status from the API
 * @param billingDate - The date of billing
 * @returns The appropriate payment status including 'overdue' if applicable
 */
export const getEffectivePaymentStatus = (currentPaymentStatus: string, billingDate: string): string => {
  // If already marked as overdue or paid, return as is
  if (currentPaymentStatus === 'overdue' || currentPaymentStatus === 'paid') {
    return currentPaymentStatus;
  }

  // Check if it should be marked as overdue based on billing date
  if (isOverdue(billingDate, currentPaymentStatus)) {
    return 'overdue';
  }

  return currentPaymentStatus || 'unpaid';
};

/**
 * Calculate overdue date (one month from billing date)
 * @param billingDate - The date of billing
 * @returns Date object representing when the item becomes overdue
 */
export const getOverdueDate = (billingDate: string): Date | null => {
  if (!billingDate) {
    return null;
  }

  const billing = new Date(billingDate);
  const overdueDate = new Date(billing);
  overdueDate.setMonth(overdueDate.getMonth() + 1);
  
  return overdueDate;
};