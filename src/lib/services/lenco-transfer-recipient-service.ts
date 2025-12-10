import { logger } from '../logger';
import { supabaseClient } from '../supabaseClient';

export interface TransferRecipientRequest {
  walletNumber: string;
}

export interface TransferRecipientDetails {
  id: string;
  currency: string;
  type: string;
  country: string;
  details: {
    type: 'lenco-money';
    accountName: string;
    walletNumber: string;
  };
}

export interface TransferRecipientResponse {
  status: boolean;
  message: string;
  data?: TransferRecipientDetails | null;
}

class LencoTransferRecipientService {
  private sanitizeWalletNumber(walletNumber: string): string {
    return typeof walletNumber === 'string' ? walletNumber.replace(/\s+/g, '') : '';
  }

  private isWalletNumberValid(walletNumber: string): boolean {
    return walletNumber.length > 0;
  }

  private maskWalletNumber(walletNumber: string): string {
    if (!walletNumber) {
      return '';
    }

    const normalized = this.sanitizeWalletNumber(walletNumber);
    const lastFour = normalized.slice(-4);
    return lastFour.padStart(Math.min(4, normalized.length), '*');
  }

  async createRecipient(request: TransferRecipientRequest): Promise<TransferRecipientResponse> {
    const sanitizedWalletNumber = this.sanitizeWalletNumber(request.walletNumber);

    if (!this.isWalletNumberValid(sanitizedWalletNumber)) {
      return {
        status: false,
        message: 'walletNumber is required',
        data: null,
      };
    }

    try {
      const { data, error } = await supabaseClient.functions.invoke('lenco-transfer-recipient', {
        body: {
          walletNumber: sanitizedWalletNumber,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create transfer recipient');
      }

      if (!data?.status) {
        throw new Error(data?.message || 'Failed to create transfer recipient');
      }

      return {
        status: true,
        message: data.message || 'Transfer recipient created successfully',
        data: data.data ?? null,
      };
    } catch (error: any) {
      logger.error('Transfer recipient creation failed', error, {
        walletIdentifier: this.maskWalletNumber(request.walletNumber),
      });

      return {
        status: false,
        message: error?.message || 'Failed to create transfer recipient',
        data: null,
      };
    }
  }
}

export const lencoTransferRecipientService = new LencoTransferRecipientService();
export type LencoTransferRecipientServiceType = LencoTransferRecipientService;
