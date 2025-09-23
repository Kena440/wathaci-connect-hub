/**
 * Payment Testing Utilities
 * Comprehensive testing for Lenco payment integration
 */

import { lencoPaymentService } from '../services/lenco-payment-service';
import { subscriptionService } from '../services/subscription-service';

export interface PaymentTestCase {
  name: string;
  description: string;
  testData: any;
  expectedResult: 'success' | 'failure';
  category: 'validation' | 'integration' | 'edge-case';
}

export interface PaymentTestResult {
  testCase: PaymentTestCase;
  passed: boolean;
  result: any;
  error?: string;
  duration: number;
}

export class PaymentTestSuite {
  private testCases: PaymentTestCase[] = [
    // Validation Tests
    {
      name: 'Valid Mobile Money Payment',
      description: 'Test valid mobile money payment request',
      testData: {
        amount: 50,
        phone: '0978123456',
        provider: 'mtn',
        email: 'test@example.com',
        name: 'Test User',
        description: 'Test payment'
      },
      expectedResult: 'success',
      category: 'validation'
    },
    {
      name: 'Invalid Phone Number',
      description: 'Test payment with invalid phone number',
      testData: {
        amount: 50,
        phone: '123',
        provider: 'mtn',
        email: 'test@example.com',
        name: 'Test User',
        description: 'Test payment'
      },
      expectedResult: 'failure',
      category: 'validation'
    },
    {
      name: 'Missing Provider',
      description: 'Test mobile money payment without provider',
      testData: {
        amount: 50,
        phone: '0978123456',
        email: 'test@example.com',
        name: 'Test User',
        description: 'Test payment'
      },
      expectedResult: 'failure',
      category: 'validation'
    },
    {
      name: 'Missing Phone Number',
      description: 'Test mobile money payment without phone number',
      testData: {
        amount: 50,
        provider: 'mtn',
        email: 'test@example.com',
        name: 'Test User',
        description: 'Test payment'
      },
      expectedResult: 'failure',
      category: 'validation'
    },
    {
      name: 'Invalid Email',
      description: 'Test payment with invalid email',
      testData: {
        amount: 50,
        phone: '0978123456',
        provider: 'mtn',
        email: 'invalid-email',
        name: 'Test User',
        description: 'Test payment'
      },
      expectedResult: 'failure',
      category: 'validation'
    },
    {
      name: 'Missing Email',
      description: 'Test payment without email (should pass since email is now optional)',
      testData: {
        amount: 50,
        phone: '0978123456',
        provider: 'mtn',
        name: 'Test User',
        description: 'Test payment'
      },
      expectedResult: 'success',
      category: 'validation'
    },
    {
      name: 'Amount Below Minimum',
      description: 'Test payment with amount below minimum',
      testData: {
        amount: 1,
        phone: '0978123456',
        provider: 'mtn',
        email: 'test@example.com',
        name: 'Test User',
        description: 'Test payment'
      },
      expectedResult: 'failure',
      category: 'validation'
    },
    {
      name: 'Amount Above Maximum',
      description: 'Test payment with amount above maximum',
      testData: {
        amount: 2000000,
        phone: '0978123456',
        provider: 'mtn',
        email: 'test@example.com',
        name: 'Test User',
        description: 'Test payment'
      },
      expectedResult: 'failure',
      category: 'validation'
    },
    {
      name: 'Valid Card Payment',
      description: 'Test valid card payment request',
      testData: {
        amount: 100,
        email: 'test@example.com',
        name: 'Test User',
        description: 'Test card payment'
      },
      expectedResult: 'success',
      category: 'validation'
    },
    // Edge Cases
    {
      name: 'Empty Description',
      description: 'Test payment with empty description',
      testData: {
        amount: 50,
        phone: '0978123456',
        provider: 'mtn',
        email: 'test@example.com',
        name: 'Test User',
        description: ''
      },
      expectedResult: 'failure',
      category: 'edge-case'
    },
    {
      name: 'Very Long Description',
      description: 'Test payment with very long description',
      testData: {
        amount: 50,
        phone: '0978123456',
        provider: 'mtn',
        email: 'test@example.com',
        name: 'Test User',
        description: 'A'.repeat(1000)
      },
      expectedResult: 'success',
      category: 'edge-case'
    },
    {
      name: 'Special Characters in Name',
      description: 'Test payment with special characters in name',
      testData: {
        amount: 50,
        phone: '0978123456',
        provider: 'mtn',
        email: 'test@example.com',
        name: 'Test User & Co. (Pty) Ltd.',
        description: 'Test payment'
      },
      expectedResult: 'success',
      category: 'edge-case'
    }
  ];

  /**
   * Run all payment tests
   */
  async runAllTests(): Promise<PaymentTestResult[]> {
    const results: PaymentTestResult[] = [];

    console.log('Starting Payment Test Suite...');
    
    for (const testCase of this.testCases) {
      const result = await this.runSingleTest(testCase);
      results.push(result);
      
      console.log(`${result.passed ? '✅' : '❌'} ${testCase.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    this.generateTestReport(results);
    return results;
  }

  /**
   * Run a specific category of tests
   */
  async runTestCategory(category: 'validation' | 'integration' | 'edge-case'): Promise<PaymentTestResult[]> {
    const categoryTests = this.testCases.filter(test => test.category === category);
    const results: PaymentTestResult[] = [];

    console.log(`Running ${category} tests...`);

    for (const testCase of categoryTests) {
      const result = await this.runSingleTest(testCase);
      results.push(result);
    }

    return results;
  }

  /**
   * Run a single test case
   */
  private async runSingleTest(testCase: PaymentTestCase): Promise<PaymentTestResult> {
    const startTime = Date.now();
    
    try {
      let result;

      if (testCase.testData.phone) {
        // Mobile money test
        result = await lencoPaymentService.processMobileMoneyPayment(testCase.testData);
      } else {
        // Card payment test
        result = await lencoPaymentService.processCardPayment(testCase.testData);
      }

      const duration = Date.now() - startTime;
      const passed = testCase.expectedResult === 'success' ? result.success : !result.success;

      return {
        testCase,
        passed,
        result,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const passed = testCase.expectedResult === 'failure';

      return {
        testCase,
        passed,
        result: null,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Test payment calculation utilities
   */
  async testPaymentCalculations(): Promise<boolean> {
    console.log('Testing payment calculations...');
    
    const testCases = [
      { amount: 100, expectedFee: 2, expectedProvider: 98 },
      { amount: 50, expectedFee: 1, expectedProvider: 49 },
      { amount: 1000, expectedFee: 20, expectedProvider: 980 }
    ];

    for (const testCase of testCases) {
      const breakdown = lencoPaymentService.calculatePaymentTotal(testCase.amount);
      
      if (Math.abs(breakdown.platformFee - testCase.expectedFee) > 0.01) {
        console.error(`❌ Fee calculation failed for amount ${testCase.amount}`);
        return false;
      }
      
      if (Math.abs(breakdown.providerReceives - testCase.expectedProvider) > 0.01) {
        console.error(`❌ Provider amount calculation failed for amount ${testCase.amount}`);
        return false;
      }
    }

    console.log('✅ Payment calculations passed');
    return true;
  }

  /**
   * Test subscription integration
   */
  async testSubscriptionIntegration(): Promise<boolean> {
    console.log('Testing subscription integration...');
    
    try {
      // Test analytics function
      const analytics = await subscriptionService.getSubscriptionAnalytics();
      
      if (typeof analytics.activeSubscriptions !== 'number' ||
          typeof analytics.totalRevenue !== 'number' ||
          typeof analytics.monthlyRevenue !== 'number' ||
          typeof analytics.churnRate !== 'number') {
        console.error('❌ Subscription analytics returned invalid data structure');
        return false;
      }

      console.log('✅ Subscription integration passed');
      return true;

    } catch (error) {
      console.error('❌ Subscription integration failed:', error);
      return false;
    }
  }

  /**
   * Test configuration validation
   */
  testConfiguration(): boolean {
    console.log('Testing payment configuration...');
    
    const isConfigured = lencoPaymentService.isConfigured();
    
    if (!isConfigured) {
      console.error('❌ Payment service is not properly configured');
      return false;
    }

    const config = lencoPaymentService.getConfig();
    
    if (!config.apiUrl || !config.currency || !config.country) {
      console.error('❌ Payment configuration is missing required fields');
      return false;
    }

    console.log('✅ Payment configuration is valid');
    return true;
  }

  /**
   * Generate test report
   */
  private generateTestReport(results: PaymentTestResult[]): void {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    console.log('\n📊 Payment Test Report:');
    console.log(`   Total Tests: ${results.length}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
    console.log(`   Average Duration: ${avgDuration.toFixed(0)}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`   - ${r.testCase.name}: ${r.error || 'Unexpected result'}`);
      });
    }

    console.log('\n📈 Performance by Category:');
    ['validation', 'integration', 'edge-case'].forEach(category => {
      const categoryResults = results.filter(r => r.testCase.category === category);
      if (categoryResults.length > 0) {
        const categoryPassed = categoryResults.filter(r => r.passed).length;
        const categoryAvgDuration = categoryResults.reduce((sum, r) => sum + r.duration, 0) / categoryResults.length;
        console.log(`   ${category}: ${categoryPassed}/${categoryResults.length} passed (${categoryAvgDuration.toFixed(0)}ms avg)`);
      }
    });
  }

  /**
   * Run comprehensive test suite
   */
  async runComprehensiveTests(): Promise<{
    paymentTests: PaymentTestResult[];
    configurationValid: boolean;
    calculationsValid: boolean;
    subscriptionIntegrationValid: boolean;
    overallSuccess: boolean;
  }> {
    console.log('🚀 Starting Comprehensive Payment Test Suite\n');

    const configurationValid = this.testConfiguration();
    const calculationsValid = await this.testPaymentCalculations();
    const subscriptionIntegrationValid = await this.testSubscriptionIntegration();
    const paymentTests = await this.runAllTests();

    const overallSuccess = configurationValid && 
                          calculationsValid && 
                          subscriptionIntegrationValid && 
                          paymentTests.every(t => t.passed);

    console.log(`\n🎯 Overall Result: ${overallSuccess ? 'SUCCESS' : 'FAILED'}`);

    return {
      paymentTests,
      configurationValid,
      calculationsValid,
      subscriptionIntegrationValid,
      overallSuccess
    };
  }
}

// Export singleton instance
export const paymentTestSuite = new PaymentTestSuite();
