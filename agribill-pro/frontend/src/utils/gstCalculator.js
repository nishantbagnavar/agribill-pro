// All values in paise
export const calcGst = (taxableAmount, gstRate) => {
  const total = Math.round(taxableAmount * gstRate / 100);
  const cgst = Math.round(total / 2);
  const sgst = total - cgst;
  return { cgst, sgst, igst: 0, total };
};

export const calcItemTotals = ({ quantity, rate, discountPercent = 0, gstRate = 0 }) => {
  const gross = quantity * rate;
  const discountAmount = Math.round(gross * discountPercent / 100);
  const taxableAmount = gross - discountAmount;
  const { cgst, sgst } = calcGst(taxableAmount, gstRate);
  const totalAmount = taxableAmount + cgst + sgst;
  return { gross, discountAmount, taxableAmount, cgst, sgst, totalAmount };
};

export const calcBillTotals = (items) => {
  return items.reduce(
    (acc, item) => ({
      subtotal: acc.subtotal + item.grossAmount,
      totalDiscount: acc.totalDiscount + item.discountAmount,
      taxableAmount: acc.taxableAmount + item.taxableAmount,
      totalCgst: acc.totalCgst + item.cgst,
      totalSgst: acc.totalSgst + item.sgst,
      totalAmount: acc.totalAmount + item.totalAmount,
    }),
    { subtotal: 0, totalDiscount: 0, taxableAmount: 0, totalCgst: 0, totalSgst: 0, totalAmount: 0 }
  );
};
