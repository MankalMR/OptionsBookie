/**
 * Manual validation utility for transaction data.
 * This serves as a lightweight alternative to Zod since it's not available in the environment.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateTransactionData(data: any, isUpdate = false): ValidationResult {
  const errors: string[] = [];

  const requiredFields = [
    'portfolioId',
    'stockSymbol',
    'tradeOpenDate',
    'expiryDate',
    'callOrPut',
    'buyOrSell',
    'strikePrice',
    'premium',
    'numberOfContracts',
    'breakEvenPrice',
    'status'
  ];

  // For updates, fields are optional but must be valid if provided
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Type and value validations
  if (data.portfolioId !== undefined && typeof data.portfolioId !== 'string') {
    errors.push('portfolioId must be a string');
  }

  if (data.stockSymbol !== undefined && typeof data.stockSymbol !== 'string') {
    errors.push('stockSymbol must be a string');
  }

  const validateDate = (date: any, fieldName: string) => {
    if (date !== undefined && date !== null) {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        errors.push(`${fieldName} must be a valid date`);
      }
    }
  };

  validateDate(data.tradeOpenDate, 'tradeOpenDate');
  validateDate(data.expiryDate, 'expiryDate');
  validateDate(data.closeDate, 'closeDate');

  const validCallPut = ['Call', 'Put'];
  if (data.callOrPut !== undefined && !validCallPut.includes(data.callOrPut)) {
    errors.push(`callOrPut must be one of: ${validCallPut.join(', ')}`);
  }

  const validBuySell = ['Buy', 'Sell'];
  if (data.buyOrSell !== undefined && !validBuySell.includes(data.buyOrSell)) {
    errors.push(`buyOrSell must be one of: ${validBuySell.join(', ')}`);
  }

  const validStatus = ['Open', 'Closed', 'Expired', 'Assigned', 'Rolled'];
  if (data.status !== undefined && !validStatus.includes(data.status)) {
    errors.push(`status must be one of: ${validStatus.join(', ')}`);
  }

  const numericFields = [
    'strikePrice',
    'premium',
    'numberOfContracts',
    'breakEvenPrice',
    'fees',
    'stockPriceCurrent',
    'cashReserve',
    'marginCashReserve',
    'costBasisPerShare',
    'exitPrice',
    'profitLoss',
    'annualizedROR',
    'collateralAmount'
  ];

  for (const field of numericFields) {
    if (data[field] !== undefined && data[field] !== null) {
      if (typeof data[field] !== 'number' || isNaN(data[field])) {
        errors.push(`${field} must be a valid number`);
      }
    }
  }

  if (data.chainId !== undefined && data.chainId !== null && typeof data.chainId !== 'string') {
    errors.push('chainId must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
