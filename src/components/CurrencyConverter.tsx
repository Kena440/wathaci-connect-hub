import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { currencies } from '../data/countries';
import { supabase } from '../lib/supabase';

interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  finalAmount: number;
  targetCurrency: string;
  exchangeRate: number;
  vatAmount: number;
  vatRate: number;
}

interface CurrencyConverterProps {
  amount: number;
  fromCurrency: string;
  onConversionResult?: (result: ConversionResult) => void;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  amount,
  fromCurrency,
  onConversionResult
}) => {
  const [conversion, setConversion] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (amount > 0 && fromCurrency) {
      convertCurrency();
    }
  }, [amount, fromCurrency, convertCurrency]);

  const convertCurrency = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('currency-converter', {
        body: {
          amount,
          fromCurrency,
          toCurrency: 'ZMW'
        }
      });

      if (error) throw error;

      setConversion(data);
      if (onConversionResult) {
        onConversionResult(data);
      }
    } catch (error) {
      console.error('Currency conversion failed:', error);
    } finally {
      setLoading(false);
    }
  }, [amount, fromCurrency, onConversionResult]);

  const formatCurrency = (amount: number, currency: string) => {
    const currencyInfo = currencies.find(c => c.code === currency);
    return `${currencyInfo?.symbol || currency} ${amount.toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Payment Conversion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Original Amount</Label>
            <p className="text-lg font-semibold">
              {formatCurrency(amount, fromCurrency)}
            </p>
          </div>
          <div>
            <Label>Exchange Rate</Label>
            <p className="text-sm text-gray-600">
              {loading ? 'Loading...' : conversion ? `1 ${fromCurrency} = ${conversion.exchangeRate.toFixed(4)} ZMW` : '-'}
            </p>
          </div>
        </div>

        {conversion && (
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span>Converted Amount:</span>
              <span>{formatCurrency(conversion.convertedAmount, 'ZMW')}</span>
            </div>
            {conversion.vatAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>VAT (16%):</span>
                <span>{formatCurrency(conversion.vatAmount, 'ZMW')}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Total Amount:</span>
              <span>{formatCurrency(conversion.finalAmount, 'ZMW')}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * VAT included as per ZRA requirements for Zambian transactions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};