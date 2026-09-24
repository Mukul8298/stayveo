import { decryptSensitiveValue, encryptSensitiveValue, maskBankAccountNumber } from '../../common/utils/sensitive-data.js';
import { providerBankDetailsRepository } from './bank-details.repository.js';
import { updateBankDetailsSchema } from './bank-details.schema.js';
import type { UpdateBankDetailsInput } from './bank-details.schema.js';

function kycResponse(verifications: Array<{ idType: string; idNumber: string; isVerified: boolean }>) {
  const aadhaar = verifications.find((item) => item.idType === 'AADHAR');
  const pan = verifications.find((item) => item.idType === 'PAN');
  return {
    aadhaarNumber: aadhaar?.idNumber || '',
    aadhaarMasked: aadhaar?.idNumber ? `********${aadhaar.idNumber.slice(-4)}` : '',
    panNumber: pan?.idNumber || '',
    panMasked: pan?.idNumber ? `*****${pan.idNumber.slice(-4)}` : '',
    isVerified: Boolean(aadhaar?.isVerified && pan?.isVerified),
  };
}

function serialize(bankDetails: Awaited<ReturnType<typeof providerBankDetailsRepository.findByProviderId>>, verifications: Array<{ idType: string; idNumber: string; isVerified: boolean }>) {
  if (!bankDetails) {
    return { linked: false, bankDetails: null, kyc: kycResponse(verifications) };
  }

  let accountNumber: string;
  try {
    accountNumber = decryptSensitiveValue(bankDetails.accountNumber);
  } catch {
    const error = new Error('Stored bank details could not be read');
    Object.assign(error, { statusCode: 500 });
    throw error;
  }

  return {
    linked: true,
    bankDetails: {
      id: bankDetails.id,
      accountHolderName: bankDetails.accountHolderName,
      accountNumberMasked: maskBankAccountNumber(accountNumber),
      ifscCode: bankDetails.ifscCode,
      bankName: bankDetails.bankName,
      createdAt: bankDetails.createdAt,
      updatedAt: bankDetails.updatedAt,
    },
    kyc: kycResponse(verifications),
  };
}

export const providerBankDetailsService = {
  async get(providerId: string) {
    const [bankDetails, verifications] = await Promise.all([
      providerBankDetailsRepository.findByProviderId(providerId),
      providerBankDetailsRepository.findKycByProviderId(providerId),
    ]);
    return serialize(bankDetails, verifications);
  },

  async save(providerId: string, input: UpdateBankDetailsInput) {
    const data = updateBankDetailsSchema.parse(input);
    const existing = await providerBankDetailsRepository.findByProviderId(providerId);
    const accountNumber = data.accountNumber || (existing ? decryptSensitiveValue(existing.accountNumber) : '');

    if (!accountNumber) {
      throw { statusCode: 400, message: 'Bank account number is required' };
    }

    const saved = await providerBankDetailsRepository.upsert(providerId, {
      accountHolderName: data.accountHolderName,
      accountNumber: data.accountNumber ? encryptSensitiveValue(accountNumber) : existing!.accountNumber,
      ifscCode: data.ifscCode,
      bankName: data.bankName,
    }, {
      aadhaarNumber: data.aadhaarNumber || undefined,
      panNumber: data.panNumber || undefined,
    });

    return serialize(saved.bankDetails, saved.verifications);
  },
};
