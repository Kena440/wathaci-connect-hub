process.env.NODE_ENV = 'test';
process.env.VITE_LENCO_PUBLIC_KEY = 'pk_test_123';
process.env.VITE_LENCO_API_URL = 'https://mock-payments.test';
process.env.VITE_PAYMENT_CURRENCY = 'ZMW';
process.env.VITE_PAYMENT_COUNTRY = 'ZM';
process.env.VITE_PLATFORM_FEE_PERCENTAGE = '2';
process.env.VITE_MIN_PAYMENT_AMOUNT = '5';
process.env.VITE_MAX_PAYMENT_AMOUNT = '100000';

import { describe, expect, it } from '@jest/globals';
import { paymentTestSuite } from '../payment-test-suite';

const getResultMap = (results: Awaited<ReturnType<typeof paymentTestSuite.runTestCategory>>) => {
  return results.reduce<Record<string, boolean>>((acc, result) => {
    acc[result.testCase.name] = result.passed;
    return acc;
  }, {});
};

describe('Payment API validation', () => {
  it('should validate mobile money and card payment flows', async () => {
    const results = await paymentTestSuite.runTestCategory('validation');
    const summary = getResultMap(results);

    expect(summary['Valid Mobile Money Payment']).toBe(true);
    expect(summary['Invalid Phone Number']).toBe(true);
    expect(summary['Missing Provider']).toBe(true);
    expect(summary['Missing Phone Number']).toBe(true);
    expect(summary['Invalid Email']).toBe(true);
    expect(summary['Missing Email']).toBe(true);
    expect(summary['Amount Below Minimum']).toBe(true);
    expect(summary['Amount Above Maximum']).toBe(true);
    expect(summary['Valid Card Payment']).toBe(true);
  });

  it('should pass edge-case validations', async () => {
    const results = await paymentTestSuite.runTestCategory('edge-case');
    const summary = getResultMap(results);

    expect(summary['Empty Description']).toBe(true);
    expect(summary['Very Long Description']).toBe(true);
    expect(summary['Special Characters in Name']).toBe(true);
  });

  it('should pass comprehensive payment checks', async () => {
    const report = await paymentTestSuite.runComprehensiveTests();

    expect(report.configurationValid).toBe(true);
    expect(report.calculationsValid).toBe(true);
    expect(report.subscriptionIntegrationValid).toBe(true);
    expect(report.paymentTests.every(test => test.passed)).toBe(true);
    expect(report.overallSuccess).toBe(true);
  });
});
