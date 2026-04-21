// Amounts stored as paise (integer). Display as ₹ with Indian formatting.
export const formatCurrency = (paise, options = {}) => {
  const amount = (paise || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: options.decimals ?? 2,
    maximumFractionDigits: options.decimals ?? 2,
    ...options,
  }).format(amount);
};

export const paiseToRupees = (paise) => (paise || 0) / 100;
export const rupeesToPaise = (rupees) => Math.round((rupees || 0) * 100);

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numToWords(n) {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
}

export const amountInWords = (paise) => {
  const totalRupees = Math.floor((paise || 0) / 100);
  const paise_ = (paise || 0) % 100;
  if (totalRupees === 0 && paise_ === 0) return 'Zero Rupees Only';

  let result = '';
  const crore = Math.floor(totalRupees / 10000000);
  const lakh = Math.floor((totalRupees % 10000000) / 100000);
  const thousand = Math.floor((totalRupees % 100000) / 1000);
  const rest = totalRupees % 1000;

  if (crore) result += numToWords(crore) + ' Crore ';
  if (lakh) result += numToWords(lakh) + ' Lakh ';
  if (thousand) result += numToWords(thousand) + ' Thousand ';
  if (rest) result += numToWords(rest);

  result = result.trim() + ' Rupees';
  if (paise_) result += ' and ' + numToWords(paise_) + ' Paise';
  return result + ' Only';
};
